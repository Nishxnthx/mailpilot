import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMailStore, clearMailboxCache } from '@/stores/useMailStore';

describe('Mailbox Cache System', () => {
  beforeEach(() => {
    clearMailboxCache();
    useMailStore.setState({
      emails: [],
      isLoading: false,
      isSyncing: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('reuses cached mailbox result within 60-second TTL without making a new fetch', async () => {
    const fakeEmails = [
      {
        id: 'msg-1',
        threadId: 't-1',
        snippet: 'Test',
        subject: 'Test Subject',
        from: { email: 'a@b.com' },
        to: [{ email: 'c@d.com' }],
        date: '2026-09-05T00:00:00Z',
        internalDate: 1700000000000,
        isRead: true,
        isStarred: false,
        folder: 'inbox' as const,
        labels: ['INBOX'],
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ emails: fakeEmails, nextPageToken: null, resultSizeEstimate: 1 }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    // First fetch should hit network
    await useMailStore.getState().fetchEmails('inbox', '', false, 'all');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useMailStore.getState().emails).toHaveLength(1);

    // Second fetch within TTL should use cache and NOT hit network again
    await useMailStore.getState().fetchEmails('inbox', '', false, 'all');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('triggers a new network fetch when cache is expired or bypassCache is true', async () => {
    const fakeEmails = [
      {
        id: 'msg-1',
        threadId: 't-1',
        snippet: 'Test',
        subject: 'Test Subject',
        from: { email: 'a@b.com' },
        to: [{ email: 'c@d.com' }],
        date: '2026-09-05T00:00:00Z',
        internalDate: 1700000000000,
        isRead: true,
        isStarred: false,
        folder: 'inbox' as const,
        labels: ['INBOX'],
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ emails: fakeEmails, nextPageToken: null, resultSizeEstimate: 1 }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    // 1. Initial fetch
    await useMailStore.getState().fetchEmails('inbox', '', false, 'all');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 2. Fetch with bypassCache=true forces network request
    await useMailStore.getState().fetchEmails('inbox', '', false, 'all', true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates cache when clearMailboxCache() is called', async () => {
    const fakeEmails = [{ id: 'msg-1', threadId: 't-1', snippet: 'A', subject: 'A', from: { email: 'a@b.com' }, to: [], date: '2026', internalDate: 100, isRead: true, isStarred: false, folder: 'inbox' as const, labels: [] }];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ emails: fakeEmails }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await useMailStore.getState().fetchEmails('inbox', '', false, 'all');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clearMailboxCache();

    await useMailStore.getState().fetchEmails('inbox', '', false, 'all');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
