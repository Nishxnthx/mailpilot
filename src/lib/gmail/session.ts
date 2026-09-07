import { cookies } from 'next/headers';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { OAuthTokens } from './types';

const SESSION_COOKIE_NAME = 'gmail_session';
const CSRF_COOKIE_NAME = 'gmail_oauth_state';
const SESSIONS_FILE_PATH = path.join(process.cwd(), '.gmail-sessions.json');

// Global in-memory session map for fast access
const globalForGmail = globalThis as unknown as {
  __gmailServerSessionStore?: Map<string, OAuthTokens>;
};

const serverSessionStore =
  globalForGmail.__gmailServerSessionStore ??
  (globalForGmail.__gmailServerSessionStore = new Map<string, OAuthTokens>());

/**
 * Reads local disk sessions store (gitignored) for server-side persistence across dev process restarts.
 */
function readDiskStore(): Record<string, OAuthTokens> {
  try {
    if (!fs.existsSync(SESSIONS_FILE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(SESSIONS_FILE_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, OAuthTokens>;
  } catch (error) {
    console.error('[Session Disk Read Error]:', error);
    return {};
  }
}

/**
 * Writes local disk sessions store (gitignored) to survive dev process restarts.
 */
function writeDiskStore(store: Record<string, OAuthTokens>): void {
  try {
    fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Session Disk Write Error]:', error);
  }
}

/**
 * Stores tokens in the server-side session store (memory + gitignored local disk) and sets an opaque session ID cookie.
 */
export async function setOAuthSession(
  tokens: OAuthTokens,
  response?: NextResponse
): Promise<string> {
  const sessionId = crypto.randomUUID();

  // 1. Update in-memory store
  serverSessionStore.set(sessionId, tokens);

  // 2. Update persistent local file store
  const diskStore = readDiskStore();
  diskStore[sessionId] = tokens;
  writeDiskStore(diskStore);

  console.log(`[OAuth Session SET]: Created & persisted sessionId (${sessionId.substring(0, 8)}...). Total sessions in memory: ${serverSessionStore.size}, disk: ${Object.keys(diskStore).length}`);

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, cookieOptions);

  if (response) {
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, cookieOptions);
  }

  return sessionId;
}

/**
 * Retrieves OAuth tokens from the server-side store (checking memory first, then persistent disk file).
 */
export async function getOAuthSession(): Promise<OAuthTokens | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  console.log(`[OAuth Session GET]: Checking cookie '${SESSION_COOKIE_NAME}'... Found value: ${sessionId ? `${sessionId.substring(0, 8)}...` : 'NONE'}`);

  if (!sessionId) {
    return null;
  }

  // Check in-memory store first
  let tokens = serverSessionStore.get(sessionId);

  // Fallback to local persistent disk store if memory was reset by process restart
  if (!tokens) {
    const diskStore = readDiskStore();
    tokens = diskStore[sessionId];

    if (tokens && tokens.access_token) {
      // Re-populate in-memory cache
      serverSessionStore.set(sessionId, tokens);
      console.log(`[OAuth Session GET]: Restored session (${sessionId.substring(0, 8)}...) from disk store.`);
    } else {
      console.log(`[OAuth Session GET]: Cookie session ID (${sessionId.substring(0, 8)}...) NOT found in disk store either.`);
    }
  } else {
    console.log(`[OAuth Session GET]: Session (${sessionId.substring(0, 8)}...) found in memory store.`);
  }

  if (!tokens || !tokens.access_token) {
    return null;
  }

  return tokens;
}

/**
 * Directly retrieves OAuth tokens by sessionId from memory/disk without reading cookies.
 */
export function getOAuthSessionBySessionId(sessionId: string): OAuthTokens | null {
  if (!sessionId) return null;
  let tokens = serverSessionStore.get(sessionId);
  if (!tokens) {
    const diskStore = readDiskStore();
    tokens = diskStore[sessionId];
    if (tokens && tokens.access_token) {
      serverSessionStore.set(sessionId, tokens);
    }
  }
  if (!tokens || !tokens.access_token) return null;
  return tokens;
}

/**
 * Clears the server-side session store entry (memory + disk file) and deletes the session cookie.
 */
export async function clearOAuthSession(response?: NextResponse): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    serverSessionStore.delete(sessionId);

    const diskStore = readDiskStore();
    delete diskStore[sessionId];
    writeDiskStore(diskStore);
    console.log(`[OAuth Session CLEAR]: Deleted session (${sessionId.substring(0, 8)}...).`);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);

  if (response) {
    response.cookies.delete(SESSION_COOKIE_NAME);
  }
}

/**
 * Checks if a valid authenticated session exists.
 */
export async function hasValidSession(): Promise<boolean> {
  const session = await getOAuthSession();
  const valid = !!session && !!session.access_token;
  console.log(`[OAuth Session HAS_VALID]: Result = ${valid}`);
  return valid;
}

/**
 * Generates and stores a CSRF state parameter in a short-lived HTTP-only cookie.
 */
export async function setOAuthStateCookie(
  response?: NextResponse,
  existingState?: string
): Promise<string> {
  const state = existingState || crypto.randomBytes(32).toString('hex');
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  };

  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, state, cookieOptions);

  if (response) {
    response.cookies.set(CSRF_COOKIE_NAME, state, cookieOptions);
  }

  return state;
}

/**
 * Verifies and consumes the CSRF state parameter from the HTTP-only cookie.
 */
export async function verifyOAuthStateCookie(incomingState?: string): Promise<boolean> {
  if (!incomingState) {
    console.error('[OAuth CSRF Check]: No incoming state parameter.');
    return false;
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  const matches = !!savedState && savedState === incomingState;
  console.log(`[OAuth CSRF Check]: Saved cookie exists: ${!!savedState}, State matches: ${matches}`);

  // Clear CSRF cookie after verification attempt
  cookieStore.delete(CSRF_COOKIE_NAME);

  return matches;
}
