import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { hasValidSession } from '@/lib/gmail/session';
import { getUserProfile } from '@/lib/gmail/service';
import { ensureActiveGmailWatch } from '@/lib/gmail/watch';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const connected = await hasValidSession();
    if (connected) {
      const cookieStore = await cookies();
      const sessionId = cookieStore.get('gmail_session')?.value;
      if (sessionId) {
        ensureActiveGmailWatch(sessionId).catch((err) => {
          console.warn('[Auth Status Watch Ensure Error]:', err);
        });
      }
      const profile = await getUserProfile();
      return NextResponse.json({ connected: true, profile });
    }
    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error('[Auth Status Error]:', error);
    return NextResponse.json({ connected: false });
  }
}

