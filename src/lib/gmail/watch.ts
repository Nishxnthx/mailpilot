import fs from 'fs';
import path from 'path';
import { getGmailClient } from './service';

export interface GmailWatchData {
  sessionId: string;
  emailAddress?: string;
  historyId: string;
  expiration: number; // Unix timestamp in ms
  topicName: string;
  updatedAt: string;
}

const WATCH_FILE_PATH = path.join(process.cwd(), '.gmail-watch.json');

const globalForWatch = globalThis as unknown as {
  __gmailWatchStore?: Map<string, GmailWatchData>;
};

const watchStore =
  globalForWatch.__gmailWatchStore ??
  (globalForWatch.__gmailWatchStore = new Map<string, GmailWatchData>());

function readDiskWatchStore(): Record<string, GmailWatchData> {
  try {
    if (!fs.existsSync(WATCH_FILE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(WATCH_FILE_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, GmailWatchData>;
  } catch (error) {
    console.error('[Watch Store Disk Read Error]:', error);
    return {};
  }
}

function writeDiskWatchStore(store: Record<string, GmailWatchData>): void {
  try {
    fs.writeFileSync(WATCH_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Watch Store Disk Write Error]:', error);
  }
}

/**
 * Gets stored watch data for a session.
 */
export function getStoredWatchData(sessionId: string): GmailWatchData | null {
  let data = watchStore.get(sessionId);
  if (!data) {
    const diskStore = readDiskWatchStore();
    data = diskStore[sessionId];
    if (data) {
      watchStore.set(sessionId, data);
    }
  }
  return data || null;
}

/**
 * Saves or updates watch data for a session.
 */
export function setStoredWatchData(sessionId: string, data: GmailWatchData): void {
  watchStore.set(sessionId, data);
  const diskStore = readDiskWatchStore();
  diskStore[sessionId] = data;
  writeDiskWatchStore(diskStore);
}

/**
 * Deletes watch data for a session.
 */
export function clearStoredWatchData(sessionId: string): void {
  watchStore.delete(sessionId);
  const diskStore = readDiskWatchStore();
  delete diskStore[sessionId];
  writeDiskWatchStore(diskStore);
}

/**
 * Finds watch session by email address.
 */
export function findSessionByEmail(emailAddress: string): GmailWatchData | null {
  for (const data of watchStore.values()) {
    if (data.emailAddress?.toLowerCase() === emailAddress.toLowerCase()) {
      return data;
    }
  }
  const diskStore = readDiskWatchStore();
  for (const data of Object.values(diskStore)) {
    if (data.emailAddress?.toLowerCase() === emailAddress.toLowerCase()) {
      return data;
    }
  }
  return null;
}

/**
 * Starts a new Gmail watch subscription for the session.
 */
export async function startGmailWatch(sessionId: string): Promise<GmailWatchData> {
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topicName) {
    console.warn('[Gmail Watch]: GMAIL_PUBSUB_TOPIC environment variable is not defined. Cannot start Google Cloud Pub/Sub watch.');
    throw new Error('GMAIL_PUBSUB_TOPIC_NOT_CONFIGURED');
  }

  const gmail = await getGmailClient(sessionId);
  const profileRes = await gmail.users.getProfile({ userId: 'me' });
  const emailAddress = profileRes.data.emailAddress || undefined;

  console.log(`[Gmail Watch]: Registering users.watch() on topic ${topicName} for email ${emailAddress}...`);

  const watchRes = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX', 'SENT', 'DRAFT', 'STARRED', 'TRASH'],
    },
  });

  const historyId = watchRes.data.historyId || profileRes.data.historyId || '1';
  const expiration = watchRes.data.expiration
    ? parseInt(watchRes.data.expiration, 10)
    : Date.now() + 7 * 24 * 60 * 60 * 1000;

  const watchData: GmailWatchData = {
    sessionId,
    emailAddress,
    historyId,
    expiration,
    topicName,
    updatedAt: new Date().toISOString(),
  };

  setStoredWatchData(sessionId, watchData);
  console.log(`[Gmail Watch]: Subscription active. HistoryId: ${historyId}, Expires: ${new Date(expiration).toLocaleString()}`);
  return watchData;
}

/**
 * Renews an existing Gmail watch subscription.
 */
export async function renewGmailWatch(sessionId: string): Promise<GmailWatchData> {
  console.log(`[Gmail Watch]: Renewing watch subscription for session ${sessionId}...`);
  return startGmailWatch(sessionId);
}

/**
 * Ensures an active Gmail watch subscription exists and is renewed if expired or near expiry (<24h left).
 */
export async function ensureActiveGmailWatch(sessionId: string): Promise<GmailWatchData | null> {
  if (!process.env.GMAIL_PUBSUB_TOPIC) {
    return null;
  }

  const existing = getStoredWatchData(sessionId);
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (!existing || existing.expiration - Date.now() < ONE_DAY_MS) {
    try {
      return await startGmailWatch(sessionId);
    } catch (err) {
      console.warn('[Gmail Watch Auto-Ensure Error]:', err);
      return existing || null;
    }
  }
  return existing;
}

/**
 * Stops an active Gmail watch subscription.
 */
export async function stopGmailWatch(sessionId: string): Promise<void> {
  try {
    const gmail = await getGmailClient();
    await gmail.users.stop({ userId: 'me' });
    console.log(`[Gmail Watch]: Subscription stopped for session ${sessionId}.`);
  } catch (err) {
    console.warn('[Gmail Watch]: Error stopping watch subscription:', err);
  } finally {
    clearStoredWatchData(sessionId);
  }
}
