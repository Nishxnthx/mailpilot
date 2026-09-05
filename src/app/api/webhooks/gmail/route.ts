import { NextResponse } from 'next/server';
import { findSessionByEmail } from '@/lib/gmail/watch';
import { processGmailHistory } from '@/lib/gmail/history';
import { broadcastSSEEvent } from '@/lib/gmail/sse';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.message?.data) {
      return NextResponse.json({ message: 'Missing Pub/Sub message data' }, { status: 400 });
    }

    // Decode Pub/Sub base64 payload
    const decodedRaw = Buffer.from(body.message.data, 'base64').toString('utf-8');
    const payload = JSON.parse(decodedRaw) as { emailAddress?: string; historyId?: string };

    const emailAddress = payload.emailAddress;
    const historyId = payload.historyId;

    console.log(`[Gmail Webhook]: Received push notification for ${emailAddress}, historyId: ${historyId}`);

    if (emailAddress && historyId) {
      const watchData = findSessionByEmail(emailAddress);
      if (watchData?.sessionId) {
        const historyResult = await processGmailHistory(watchData.sessionId, historyId);
        broadcastSSEEvent('GMAIL_UPDATE', {
          emailAddress,
          historyId,
          ...historyResult,
        });
      } else {
        console.warn(`[Gmail Webhook]: No active session found for email ${emailAddress}.`);
        broadcastSSEEvent('GMAIL_UPDATE', {
          emailAddress,
          historyId,
          fullSyncRequired: true,
        });
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err) {
    console.error('[Gmail Webhook Error]:', err);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
