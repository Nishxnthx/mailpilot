import { getGmailClient, normalizeGmailMessage } from './service';
import { getStoredWatchData, setStoredWatchData } from './watch';
import { Email } from '@/types/email';

export interface ProcessHistoryResult {
  addedEmails: Email[];
  deletedIds: string[];
  updatedEmails: Email[];
  newHistoryId: string;
  fullSyncRequired: boolean;
}

/**
 * Processes incremental Gmail history changes starting from the last stored historyId.
 */
export async function processGmailHistory(
  sessionId: string,
  incomingHistoryId: string
): Promise<ProcessHistoryResult> {
  const watchData = getStoredWatchData(sessionId);
  const startHistoryId = watchData?.historyId;

  if (!startHistoryId) {
    console.log(`[Gmail History]: No startHistoryId found for session ${sessionId}. Storing incoming historyId ${incomingHistoryId}.`);
    if (watchData) {
      setStoredWatchData(sessionId, { ...watchData, historyId: incomingHistoryId });
    }
    return {
      addedEmails: [],
      deletedIds: [],
      updatedEmails: [],
      newHistoryId: incomingHistoryId,
      fullSyncRequired: true,
    };
  }

  console.log(`[Gmail History]: Fetching history from ${startHistoryId} to ${incomingHistoryId}...`);

  try {
    const gmail = await getGmailClient();

    const historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
    });

    const historyRecords = historyRes.data.history || [];
    const latestHistoryId = historyRes.data.historyId || incomingHistoryId;

    const addedMsgIds = new Set<string>();
    const deletedMsgIds = new Set<string>();
    const updatedMsgIds = new Set<string>();

    for (const record of historyRecords) {
      if (record.messagesAdded) {
        for (const item of record.messagesAdded) {
          if (item.message?.id) addedMsgIds.add(item.message.id);
        }
      }
      if (record.messagesDeleted) {
        for (const item of record.messagesDeleted) {
          if (item.message?.id) deletedMsgIds.add(item.message.id);
        }
      }
      if (record.labelsAdded) {
        for (const item of record.labelsAdded) {
          if (item.message?.id) updatedMsgIds.add(item.message.id);
        }
      }
      if (record.labelsRemoved) {
        for (const item of record.labelsRemoved) {
          if (item.message?.id) updatedMsgIds.add(item.message.id);
        }
      }
    }

    // Fetch full message details for added/updated messages
    const fetchPromises = Array.from(new Set([...addedMsgIds, ...updatedMsgIds]))
      .filter((id) => !deletedMsgIds.has(id))
      .map((id) =>
        gmail.users.messages
          .get({ userId: 'me', id, format: 'full' })
          .then((res) => normalizeGmailMessage(res.data))
          .catch((err) => {
            console.warn(`[Gmail History]: Failed to fetch message ${id}:`, err);
            return null;
          })
      );

    const fetchedResults = await Promise.all(fetchPromises);
    const validEmails = fetchedResults.filter((e): e is Email => e !== null);

    const addedEmails = validEmails.filter((e) => addedMsgIds.has(e.id));
    const updatedEmails = validEmails.filter((e) => updatedMsgIds.has(e.id) && !addedMsgIds.has(e.id));
    const deletedIds = Array.from(deletedMsgIds);

    // Update stored historyId
    if (watchData) {
      setStoredWatchData(sessionId, {
        ...watchData,
        historyId: latestHistoryId,
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(`[Gmail History]: Processed history successfully. Added: ${addedEmails.length}, Updated: ${updatedEmails.length}, Deleted: ${deletedIds.length}`);

    return {
      addedEmails,
      deletedIds,
      updatedEmails,
      newHistoryId: latestHistoryId,
      fullSyncRequired: false,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[Gmail History]: History list failed (e.g. stale startHistoryId ${startHistoryId}):`, errorMessage);

    // 404 / Invalid startHistoryId -> Fallback to full resync
    if (watchData) {
      setStoredWatchData(sessionId, {
        ...watchData,
        historyId: incomingHistoryId,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      addedEmails: [],
      deletedIds: [],
      updatedEmails: [],
      newHistoryId: incomingHistoryId,
      fullSyncRequired: true,
    };
  }
}
