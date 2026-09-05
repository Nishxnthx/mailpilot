import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOAuthSession } from '@/lib/gmail/session';
import { getStoredWatchData, startGmailWatch, renewGmailWatch, stopGmailWatch } from '@/lib/gmail/watch';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getOAuthSession();
  if (!session) {
    return NextResponse.json({ connected: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('gmail_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ active: false, message: 'No session cookie' });
  }

  const watchData = getStoredWatchData(sessionId);
  if (!watchData) {
    return NextResponse.json({ active: false, message: 'No active watch subscription' });
  }

  const timeLeftMs = watchData.expiration - Date.now();
  const active = timeLeftMs > 0;

  return NextResponse.json({
    active,
    emailAddress: watchData.emailAddress,
    historyId: watchData.historyId,
    expiration: watchData.expiration,
    expirationISO: new Date(watchData.expiration).toISOString(),
    timeLeftMs,
    topicName: watchData.topicName,
  });
}

export async function POST(req: Request) {
  const session = await getOAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('gmail_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'NO_SESSION' }, { status: 400 });
  }

  try {
    const { action } = (await req.json().catch(() => ({}))) as { action?: string };

    if (action === 'stop') {
      await stopGmailWatch(sessionId);
      return NextResponse.json({ status: 'stopped' });
    }

    const existingData = getStoredWatchData(sessionId);
    let watchData;

    if (existingData) {
      watchData = await renewGmailWatch(sessionId);
    } else {
      watchData = await startGmailWatch(sessionId);
    }

    return NextResponse.json({
      status: 'active',
      watchData,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn('[Watch Route Error]:', errorMessage);
    return NextResponse.json(
      {
        error: errorMessage,
        message:
          errorMessage === 'GMAIL_PUBSUB_TOPIC_NOT_CONFIGURED'
            ? 'GMAIL_PUBSUB_TOPIC environment variable is not defined.'
            : errorMessage,
      },
      { status: 500 }
    );
  }
}
