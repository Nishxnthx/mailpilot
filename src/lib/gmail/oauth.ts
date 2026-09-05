import { google } from 'googleapis';
import { OAuthTokens } from './types';

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
];

/**
 * Creates and configures the official googleapis OAuth2 client instance.
 * Throws a descriptive error if environment variables are missing.
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials missing. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are defined in .env.local.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth 2.0 consent URL for offline access with required Gmail scopes.
 */
export function getAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: REQUIRED_SCOPES,
    state,
  });
}

/**
 * Exchanges the Google OAuth authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('Failed to retrieve access token from Google OAuth response.');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || undefined,
    scope: tokens.scope || undefined,
    token_type: tokens.token_type || undefined,
    expiry_date: tokens.expiry_date || undefined,
  };
}
