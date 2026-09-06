export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'starred' | 'archive';

export type EmailCategory = 'all' | 'primary' | 'promotions' | 'social' | 'updates' | 'forums';

export interface EmailHeader {
  name: string;
  value: string;
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Email {
  id: string;
  threadId: string;
  draftId?: string;
  messageId?: string;
  snippet: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date: string; // ISO String or RFC 2822
  internalDate: number; // Unix timestamp in milliseconds for authoritative chronological ordering
  bodyHtml?: string;
  bodyText?: string;
  isRead: boolean;
  isStarred: boolean;
  folder: EmailFolder;
  labels: string[];
  attachments?: EmailAttachment[];
  threadMessagesCount?: number;
}

export interface EmailThread {
  threadId: string;
  subject: string;
  snippet: string;
  messages: Email[];
}

export interface EmailDraft {
  draftId?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}


export interface EmailFilter {
  query?: string;
  folder?: EmailFolder;
  category?: EmailCategory;
  isRead?: boolean;
  isStarred?: boolean;
  from?: string;
}

