import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUrl } from '@/lib/gmail/oauth';
import { setOAuthStateCookie } from '@/lib/gmail/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Generate a single CSRF state token
    const state = crypto.randomBytes(32).toString('hex');
    const authUrl = getAuthUrl(state);
    
    const response = NextResponse.redirect(authUrl);
    // Attach the exact same CSRF state cookie to the redirect response
    await setOAuthStateCookie(response, state);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initiate Google OAuth.';
    console.error('[OAuth Init Error]:', message);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}?error=oauth_config_missing`);
  }
}
