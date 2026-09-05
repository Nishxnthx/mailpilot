import { NextResponse } from 'next/server';
import { clearOAuthSession } from '@/lib/gmail/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, connected: false });
    await clearOAuthSession(response);
    return response;
  } catch (error) {
    console.error('[OAuth Disconnect Error]:', error);
    return NextResponse.json({ success: false, connected: false }, { status: 500 });
  }
}

// Allow GET as well for simple browser/link triggers if needed
export async function GET() {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const response = NextResponse.redirect(`${appUrl}?auth=disconnected`);
  await clearOAuthSession(response);
  return response;
}
