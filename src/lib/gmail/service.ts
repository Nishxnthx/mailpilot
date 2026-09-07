import { google, gmail_v1 } from 'googleapis';
import { getOAuthSession } from './session';
import { createOAuth2Client } from './oauth';
import { Email, EmailFolder, EmailCategory, EmailAddress, EmailThread } from '@/types/email';

/**
 * Instantiates an authenticated googleapis Gmail v1 client for the current request's session.
 * Throws 'UNAUTHORIZED' if no active session exists.
 */
export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const tokens = await getOAuthSession();
  if (!tokens || !tokens.access_token) {
    throw new Error('UNAUTHORIZED');
  }

  const auth = createOAuth2Client();
  auth.setCredentials(tokens);

  return google.gmail({ version: 'v1', auth });
}

/**
 * Parses raw RFC 2822 or email header string into EmailAddress object.
 */
function parseEmailAddress(rawHeader?: string): EmailAddress {
  if (!rawHeader) return { email: '' };

  const match = rawHeader.match(/^(?:"?([^"]*)"?\s)?(?:<(.+)>|([^\s>]+))$/);
  if (match) {
    const name = match[1]?.trim();
    const email = (match[2] || match[3])?.trim() || rawHeader;
    return { name: name || undefined, email };
  }

  return { email: rawHeader.trim() };
}

/**
 * Recursively extracts bodyHtml and bodyText from Gmail MIME message payload.
 */
function extractBodyParts(payload?: gmail_v1.Schema$MessagePart): { bodyHtml?: string; bodyText?: string } {
  if (!payload) return {};

  let bodyHtml: string | undefined;
  let bodyText: string | undefined;

  function parsePart(part: gmail_v1.Schema$MessagePart) {
    const mimeType = part.mimeType?.toLowerCase();
    const data = part.body?.data;

    if (data) {
      const decoded = Buffer.from(data, 'base64url').toString('utf-8');
      if (mimeType === 'text/html' && !bodyHtml) {
        bodyHtml = decoded;
      } else if (mimeType === 'text/plain' && !bodyText) {
        bodyText = decoded;
      }
    }

    if (part.parts && part.parts.length > 0) {
      for (const subPart of part.parts) {
        parsePart(subPart);
      }
    }
  }

  parsePart(payload);
  return { bodyHtml, bodyText };
}

/**
 * Normalizes a raw Gmail API message response into a clean Email domain object.
 */
export function normalizeGmailMessage(msg: gmail_v1.Schema$Message, folder: EmailFolder = 'inbox'): Email {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = getHeader('Subject') || '(No Subject)';
  const fromRaw = getHeader('From');
  const toRaw = getHeader('To');
  const dateRaw = getHeader('Date');
  const messageId = getHeader('Message-ID') || getHeader('Message-Id') || '';

  const from = parseEmailAddress(fromRaw);
  const to = toRaw ? toRaw.split(',').map((t) => parseEmailAddress(t.trim())) : [];

  const labelIds = msg.labelIds || [];
  const isRead = !labelIds.includes('UNREAD');
  const isStarred = labelIds.includes('STARRED');

  const internalDateNum = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now();

  const { bodyHtml, bodyText } = extractBodyParts(msg.payload);

  return {
    id: msg.id || '',
    threadId: msg.threadId || '',
    messageId,
    snippet: msg.snippet || '',
    subject,
    from,
    to,
    date: dateRaw || new Date(internalDateNum).toISOString(),
    internalDate: internalDateNum,
    bodyHtml,
    bodyText,
    isRead,
    isStarred,
    folder,
    labels: labelIds,
  };
}

export interface FetchMailListResult {
  emails: Email[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

/**
 * Fetches real Gmail messages for the specified folder, category, or search query using accurate Gmail labels/queries.
 */
export async function fetchMailList(options: {
  folder?: EmailFolder;
  category?: EmailCategory;
  query?: string;
  pageToken?: string;
  maxResults?: number;
}): Promise<FetchMailListResult> {
  const gmail = await getGmailClient();

  const { folder, category = 'all', query = '', pageToken, maxResults = 50 } = options;

  let labelIds: string[] | undefined = undefined;
  let q: string | undefined = undefined;
  let includeSpamTrash: boolean | undefined = undefined;

  const trimmedQuery = query.trim();

  // Accurate folder-to-Gmail API mapping
  if (folder === undefined) {
    labelIds = undefined;
    q = trimmedQuery || undefined;
  } else if (folder === 'drafts') {
    const listRes = await gmail.users.drafts.list({
      userId: 'me',
      q: trimmedQuery || undefined,
      pageToken: pageToken || undefined,
      maxResults,
    });

    const draftsList = listRes.data.drafts || [];
    const nextPageToken = listRes.data.nextPageToken || undefined;
    const resultSizeEstimate = listRes.data.resultSizeEstimate || draftsList.length;

    if (draftsList.length === 0) {
      return { emails: [], nextPageToken, resultSizeEstimate: 0 };
    }

    const detailPromises = draftsList.map((d) =>
      gmail.users.drafts.get({
        userId: 'me',
        id: d.id!,
        format: 'metadata',
      })
    );

    const detailResponses = await Promise.all(detailPromises);
    const emails = detailResponses.map((res) => {
      const draftId = res.data.id || undefined;
      const email = normalizeGmailMessage(res.data.message || {}, 'drafts');
      email.draftId = draftId;
      return email;
    });

    emails.sort((a, b) => b.internalDate - a.internalDate);

    return {
      emails,
      nextPageToken,
      resultSizeEstimate,
    };
  }

  if (folder === 'inbox') {
    if (category === 'primary') {
      const primaryQuery = 'in:inbox category:primary';
      q = trimmedQuery ? `${primaryQuery} ${trimmedQuery}` : primaryQuery;
      labelIds = undefined;
    } else if (category === 'promotions') {
      labelIds = ['INBOX', 'CATEGORY_PROMOTIONS'];
      q = trimmedQuery || undefined;
    } else if (category === 'social') {
      labelIds = ['INBOX', 'CATEGORY_SOCIAL'];
      q = trimmedQuery || undefined;
    } else if (category === 'updates') {
      labelIds = ['INBOX', 'CATEGORY_UPDATES'];
      q = trimmedQuery || undefined;
    } else if (category === 'forums') {
      labelIds = ['INBOX', 'CATEGORY_FORUMS'];
      q = trimmedQuery || undefined;
    } else {
      labelIds = ['INBOX'];
      q = trimmedQuery || undefined;
    }
  } else if (folder === 'sent') {
    labelIds = ['SENT'];
    q = trimmedQuery || undefined;
  } else if (folder === 'starred') {
    labelIds = ['STARRED'];
    q = trimmedQuery || undefined;
  } else if (folder === 'trash') {
    labelIds = ['TRASH'];
    includeSpamTrash = true;
    q = trimmedQuery || undefined;
  } else if (folder === 'archive') {
    const baseArchiveQuery = '-in:inbox -in:sent -in:drafts -in:trash -in:spam';
    q = trimmedQuery ? `${baseArchiveQuery} ${trimmedQuery}` : baseArchiveQuery;
  }

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds,
    q,
    includeSpamTrash,
    pageToken: pageToken || undefined,
    maxResults,
  });

  const messagesList = listRes.data.messages || [];
  const nextPageToken = listRes.data.nextPageToken || undefined;
  const resultSizeEstimate = listRes.data.resultSizeEstimate || messagesList.length;

  if (messagesList.length === 0) {
    return { emails: [], nextPageToken, resultSizeEstimate: 0 };
  }

  // Fetch metadata details in parallel (1 quota unit per message instead of 5)
  const detailPromises = messagesList.map((m) =>
    gmail.users.messages.get({
      userId: 'me',
      id: m.id!,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Cc', 'Bcc', 'Date', 'Message-ID', 'Message-Id'],
    })
  );

  const detailResponses = await Promise.all(detailPromises);
  const emails = detailResponses.map((res) => normalizeGmailMessage(res.data, folder));

  // Authoritative chronological ordering: newest first (internalDate descending)
  emails.sort((a, b) => b.internalDate - a.internalDate);

  return {
    emails,
    nextPageToken,
    resultSizeEstimate,
  };
}


/**
 * Fetches full detail for a single Gmail message by ID.
 */
export async function fetchMailDetail(id: string): Promise<Email> {
  const gmail = await getGmailClient();

  const res = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'full',
  });

  return normalizeGmailMessage(res.data);
}

/**
 * Fetches all messages in a Gmail conversation thread on demand.
 */
export async function fetchEmailThread(threadId: string): Promise<EmailThread> {
  const gmail = await getGmailClient();

  const res = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const rawMessages = res.data.messages || [];
  const messages = rawMessages.map((m) => normalizeGmailMessage(m));

  // Sort messages in chronological order (oldest first: top to bottom conversation flow)
  messages.sort((a, b) => a.internalDate - b.internalDate);

  const latestMessage = messages[messages.length - 1];
  const subject = latestMessage?.subject || res.data.snippet || '(No Subject)';
  const snippet = latestMessage?.snippet || res.data.snippet || '';

  return {
    threadId: res.data.id || threadId,
    subject,
    snippet,
    messages,
  };
}

function buildMimeMessage(params: {
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const headers: string[] = [
    `To: ${params.to || ''}`,
    `Subject: ${params.subject || ''}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
  ];

  if (params.cc?.trim()) {
    headers.push(`Cc: ${params.cc.trim()}`);
  }
  if (params.bcc?.trim()) {
    headers.push(`Bcc: ${params.bcc.trim()}`);
  }
  if (params.inReplyTo?.trim()) {
    headers.push(`In-Reply-To: ${params.inReplyTo.trim()}`);
  }
  if (params.references?.trim()) {
    headers.push(`References: ${params.references.trim()}`);
  }

  // RFC 2822 requirement: Headers and Body MUST be separated by a blank line (\r\n\r\n)
  return `${headers.join('\r\n')}\r\n\r\n${params.body || ''}`;
}

function encodeRawMessage(mimeMessage: string): string {
  return Buffer.from(mimeMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends an email via Gmail API using raw RFC 2822 base64url encoding.
 */
export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ id: string; threadId: string }> {
  const gmail = await getGmailClient();
  const mimeMessage = buildMimeMessage(params);
  const rawMessage = encodeRawMessage(mimeMessage);

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
      threadId: params.threadId || undefined,
    },
  });

  return {
    id: res.data.id || '',
    threadId: res.data.threadId || '',
  };
}

/**
 * Creates a new Gmail draft using users.drafts.create.
 */
export async function createGmailDraft(params: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ draftId: string; messageId: string; threadId: string }> {
  const gmail = await getGmailClient();
  const mimeMessage = buildMimeMessage(params);
  const rawMessage = encodeRawMessage(mimeMessage);

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: rawMessage,
        threadId: params.threadId || undefined,
      },
    },
  });

  return {
    draftId: res.data.id || '',
    messageId: res.data.message?.id || '',
    threadId: res.data.message?.threadId || '',
  };
}

/**
 * Updates an existing Gmail draft using users.drafts.update.
 */
export async function updateGmailDraft(params: {
  draftId: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ draftId: string; messageId: string; threadId: string }> {
  const gmail = await getGmailClient();
  const mimeMessage = buildMimeMessage(params);
  const rawMessage = encodeRawMessage(mimeMessage);

  const res = await gmail.users.drafts.update({
    userId: 'me',
    id: params.draftId,
    requestBody: {
      message: {
        raw: rawMessage,
        threadId: params.threadId || undefined,
      },
    },
  });

  return {
    draftId: res.data.id || '',
    messageId: res.data.message?.id || '',
    threadId: res.data.message?.threadId || '',
  };
}

/**
 * Fetches details for a single Gmail draft using users.drafts.get.
 */
export async function getGmailDraft(draftId: string): Promise<{ draftId: string; email: Email }> {
  const gmail = await getGmailClient();
  const res = await gmail.users.drafts.get({
    userId: 'me',
    id: draftId,
    format: 'full',
  });

  const message = res.data.message;
  const email = message ? normalizeGmailMessage(message, 'drafts') : ({} as Email);
  email.draftId = res.data.id || draftId;

  return {
    draftId: res.data.id || draftId,
    email,
  };
}

/**
 * Deletes a Gmail draft using users.drafts.delete.
 */
export async function deleteGmailDraft(draftId: string): Promise<void> {
  const gmail = await getGmailClient();
  await gmail.users.drafts.delete({
    userId: 'me',
    id: draftId,
  });
}

/**
 * Removes the UNREAD label from a Gmail message.
 */
export async function markGmailMessageRead(id: string): Promise<void> {
  const gmail = await getGmailClient();
  await gmail.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  });
}

/**
 * Adds the UNREAD label to a Gmail message.
 */
export async function markGmailMessageUnread(id: string): Promise<void> {
  const gmail = await getGmailClient();
  await gmail.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      addLabelIds: ['UNREAD'],
    },
  });
}

export interface LabelCountItem {
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  total: number;
  unread: number;
}

export interface UserLabelItem {
  id: string;
  name: string;
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  total: number;
  unread: number;
}

export interface MailCountsResult {
  inbox?: LabelCountItem;
  sent?: LabelCountItem;
  drafts?: LabelCountItem;
  starred?: LabelCountItem;
  trash?: LabelCountItem;
  spam?: LabelCountItem;
  snoozed?: LabelCountItem;
  archive?: LabelCountItem;
  categories: {
    primary?: LabelCountItem;
    promotions?: LabelCountItem;
    social?: LabelCountItem;
    updates?: LabelCountItem;
    forums?: LabelCountItem;
  };
  userLabels: UserLabelItem[];
}

async function fetchPrimaryThreadCounts(gmail: gmail_v1.Gmail): Promise<{ threadsTotal: number; threadsUnread: number }> {
  try {
    let total = 0;
    let pageTokenTotal: string | undefined = undefined;
    do {
      const params: gmail_v1.Params$Resource$Users$Threads$List = {
        userId: 'me',
        q: 'in:inbox category:primary',
        pageToken: pageTokenTotal,
        maxResults: 500,
      };
      const res = await gmail.users.threads.list(params);
      const threads = res.data.threads || [];
      total += threads.length;
      pageTokenTotal = res.data.nextPageToken || undefined;
    } while (pageTokenTotal);

    let unread = 0;
    let pageTokenUnread: string | undefined = undefined;
    do {
      const params: gmail_v1.Params$Resource$Users$Threads$List = {
        userId: 'me',
        q: 'in:inbox category:primary is:unread',
        pageToken: pageTokenUnread,
        maxResults: 500,
      };
      const res = await gmail.users.threads.list(params);
      const threads = res.data.threads || [];
      unread += threads.length;
      pageTokenUnread = res.data.nextPageToken || undefined;
    } while (pageTokenUnread);

    return { threadsTotal: total, threadsUnread: unread };
  } catch (err) {
    console.warn('[fetchPrimaryThreadCounts] Failed to compute primary counts:', err);
    return { threadsTotal: 0, threadsUnread: 0 };
  }
}

let mailCountsCache: { data: MailCountsResult; timestamp: number } | null = null;
const COUNTS_CACHE_TTL_MS = 60000; // 60s cache TTL

/**
 * Fetches real folder and category counts from Gmail using users.labels.list & parallel users.labels.get.
 */
export async function fetchMailCounts(bypassCache = false): Promise<MailCountsResult> {
  if (!bypassCache && mailCountsCache && Date.now() - mailCountsCache.timestamp < COUNTS_CACHE_TTL_MS) {
    return mailCountsCache.data;
  }

  try {
    const gmail = await getGmailClient();
    const listRes = await gmail.users.labels.list({ userId: 'me' });
    const labels = listRes.data.labels || [];

    const targetLabels = labels.filter(
      (l) =>
        l.id &&
        ([
          'INBOX',
          'SENT',
          'DRAFT',
          'STARRED',
          'TRASH',
          'SPAM',
          'SNOOZED',
          'CATEGORY_PERSONAL',
          'CATEGORY_PROMOTIONS',
          'CATEGORY_SOCIAL',
          'CATEGORY_UPDATES',
          'CATEGORY_FORUMS',
        ].includes(l.id) ||
          l.type === 'user')
    );

    const detailPromises = targetLabels.map((l) =>
      gmail.users.labels.get({ userId: 'me', id: l.id! }).catch((err) => {
        console.warn(`[fetchMailCounts] Failed to get details for label ${l.id}:`, err);
        return null;
      })
    );

    const detailResponses = await Promise.all(detailPromises);

    const counts: MailCountsResult = {
      categories: {},
      userLabels: [],
    };

    detailResponses.forEach((res, index) => {
      if (!res || !res.data) return;
      const l = targetLabels[index];
      const messagesTotal = typeof res.data.messagesTotal === 'number' ? res.data.messagesTotal : 0;
      const messagesUnread = typeof res.data.messagesUnread === 'number' ? res.data.messagesUnread : 0;
      const threadsTotal = typeof res.data.threadsTotal === 'number' ? res.data.threadsTotal : messagesTotal;
      const threadsUnread = typeof res.data.threadsUnread === 'number' ? res.data.threadsUnread : messagesUnread;

      const item: LabelCountItem = {
        messagesTotal,
        messagesUnread,
        threadsTotal,
        threadsUnread,
        total: threadsTotal,
        unread: threadsUnread,
      };

      const labelId = res.data.id || l.id;

      switch (labelId) {
        case 'INBOX':
          counts.inbox = item;
          break;
        case 'SENT':
          counts.sent = item;
          break;
        case 'DRAFT':
          counts.drafts = item;
          break;
        case 'STARRED':
          counts.starred = item;
          break;
        case 'TRASH':
          counts.trash = item;
          break;
        case 'SPAM':
          counts.spam = item;
          break;
        case 'SNOOZED':
          counts.snoozed = item;
          break;
        case 'CATEGORY_PERSONAL':
          counts.categories.primary = item;
          break;
        case 'CATEGORY_PROMOTIONS':
          counts.categories.promotions = item;
          break;
        case 'CATEGORY_SOCIAL':
          counts.categories.social = item;
          break;
        case 'CATEGORY_UPDATES':
          counts.categories.updates = item;
          break;
        case 'CATEGORY_FORUMS':
          counts.categories.forums = item;
          break;
        default:
          if (l.type === 'user' && l.id && l.name) {
            counts.userLabels.push({
              id: l.id,
              name: l.name,
              messagesTotal,
              messagesUnread,
              threadsTotal,
              threadsUnread,
              total: threadsTotal,
              unread: threadsUnread,
            });
          }
          break;
      }
    });

    // Compute exact Primary category thread counts using Gmail's native `category:primary` search semantics
    const primaryThreadCounts = await fetchPrimaryThreadCounts(gmail);
    counts.categories.primary = {
      messagesTotal: primaryThreadCounts.threadsTotal,
      messagesUnread: primaryThreadCounts.threadsUnread,
      threadsTotal: primaryThreadCounts.threadsTotal,
      threadsUnread: primaryThreadCounts.threadsUnread,
      total: primaryThreadCounts.threadsTotal,
      unread: primaryThreadCounts.threadsUnread,
    };

    mailCountsCache = { data: counts, timestamp: Date.now() };
    return counts;
  } catch (error) {
    console.error('[fetchMailCounts Error]:', error);
    if (mailCountsCache) return mailCountsCache.data;
    throw error;
  }
}

export function clearMailCountsCache() {
  mailCountsCache = null;
}

let userProfileCache: { data: { emailAddress: string; displayName: string }; timestamp: number } | null = null;

/**
 * Fetches real user profile info (emailAddress from getProfile) with 60s in-memory caching.
 */
export async function getUserProfile(): Promise<{ emailAddress: string; displayName: string }> {
  if (userProfileCache && Date.now() - userProfileCache.timestamp < 60000) {
    return userProfileCache.data;
  }

  try {
    const gmail = await getGmailClient();
    const res = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = res.data.emailAddress || '';

    let displayName = '';
    if (emailAddress) {
      const username = emailAddress.split('@')[0] || '';
      const parts = username.split(/[._-]/);
      displayName = parts
        .filter((p) => isNaN(Number(p)))
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
      if (!displayName) displayName = username;
    }

    const profileData = { emailAddress, displayName };
    userProfileCache = { data: profileData, timestamp: Date.now() };
    return profileData;
  } catch (error) {
    console.error('[getUserProfile Error]:', error);
    return { emailAddress: '', displayName: '' };
  }
}






