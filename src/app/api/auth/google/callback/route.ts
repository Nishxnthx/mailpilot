import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/gmail/oauth';
import { setOAuthSession, verifyOAuthStateCookie } from '@/lib/gmail/session';
import { ensureActiveGmailWatch } from '@/lib/gmail/watch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { searchParams } = new URL(request.url);

  console.log('[OAuth Callback GET]: Callback route hit with searchParams.');

  const errorParam = searchParams.get('error');
  if (errorParam) {
    console.error('[OAuth Callback Error Param]:', errorParam);
    return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent(errorParam)}`);
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    console.error('[OAuth Callback Error]: Missing code param.');
    return NextResponse.redirect(`${appUrl}?error=missing_code`);
  }

  // Validate CSRF state parameter
  const isValidState = await verifyOAuthStateCookie(state || undefined);
  if (!isValidState) {
    console.error('[OAuth CSRF Error]: State mismatch or missing state cookie.');
    return NextResponse.redirect(`${appUrl}?error=csrf_validation_failed`);
  }

  try {
    console.log('[OAuth Callback]: CSRF state validated successfully. Exchanging code for tokens...');
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // Verify that granted scopes contain gmail.modify without logging raw token values
    const grantedScopes = tokens.scope ? tokens.scope.split(' ') : [];
    const hasModifyScope = grantedScopes.includes('https://www.googleapis.com/auth/gmail.modify');
    console.log(`[OAuth Callback]: Token exchange succeeded. Granted scopes contain gmail.modify: ${hasModifyScope}`);

    // Create redirect response instance
    const response = NextResponse.redirect(`${appUrl}?auth=success`);

    // Save tokens in server-side session store and attach opaque session ID HTTP-only cookie to response
    const sessionId = await setOAuthSession(tokens, response);
    console.log(`[OAuth Callback]: setOAuthSession completed with sessionId (${sessionId.substring(0, 8)}...). Redirecting to ${appUrl}?auth=success`);

    // Auto-register Gmail users.watch() subscription with Google Cloud Pub/Sub
    try {
      await ensureActiveGmailWatch(sessionId);
    } catch (watchErr) {
      console.warn('[OAuth Callback Watch Auto-Start Error]:', watchErr);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OAuth exchange error';
    console.error('[OAuth Token Exchange Failed]:', message);
    return NextResponse.redirect(`${appUrl}?error=token_exchange_failed`);
  }
}
