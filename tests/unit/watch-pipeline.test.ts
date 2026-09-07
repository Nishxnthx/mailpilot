import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOAuthSessionBySessionId, setOAuthSession } from '@/lib/gmail/session';
import { findSessionByEmail, setStoredWatchData, ensureActiveGmailWatch } from '@/lib/gmail/watch';

describe('Watch & Realtime Pipeline Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retrieves OAuth tokens directly by sessionId via getOAuthSessionBySessionId without cookies', async () => {
    const fakeTokens = {
      access_token: 'fake_access_token_123',
      refresh_token: 'fake_refresh_token_123',
      expiry_date: Date.now() + 3600000,
    };

    // Store fake session
    const sessionId = 'test_session_id_456';
    const globalForGmail = globalThis as any;
    if (!globalForGmail.__gmailServerSessionStore) {
      globalForGmail.__gmailServerSessionStore = new Map();
    }
    globalForGmail.__gmailServerSessionStore.set(sessionId, fakeTokens);

    const retrieved = getOAuthSessionBySessionId(sessionId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.access_token).toBe('fake_access_token_123');
  });

  it('finds watch session data in memory store via findSessionByEmail', () => {
    const email = 'user_test_realtime@example.com';
    const watchData = {
      sessionId: 'sess_realtime_789',
      emailAddress: email,
      historyId: '99999',
      expiration: Date.now() + 7 * 24 * 60 * 60 * 1000,
      topicName: 'projects/mailpilot-test/topics/mailpilot-test-topic',
      updatedAt: new Date().toISOString(),
    };

    setStoredWatchData('sess_realtime_789', watchData);

    const found = findSessionByEmail('USER_TEST_REALTIME@EXAMPLE.COM');
    expect(found).not.toBeNull();
    expect(found?.sessionId).toBe('sess_realtime_789');
  });

  it('ensureActiveGmailWatch returns null cleanly if GMAIL_PUBSUB_TOPIC is not configured', async () => {
    const origEnv = process.env.GMAIL_PUBSUB_TOPIC;
    delete process.env.GMAIL_PUBSUB_TOPIC;

    const res = await ensureActiveGmailWatch('sess_no_topic');
    expect(res).toBeNull();

    if (origEnv) process.env.GMAIL_PUBSUB_TOPIC = origEnv;
  });
});
