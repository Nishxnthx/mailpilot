import { NextResponse } from 'next/server';
import { hasValidSession } from '@/lib/gmail/session';
import { getUserProfile } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const connected = await hasValidSession();
    if (connected) {
      const profile = await getUserProfile();
      return NextResponse.json({ connected: true, profile });
    }
    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error('[Auth Status Error]:', error);
    return NextResponse.json({ connected: false });
  }
}

