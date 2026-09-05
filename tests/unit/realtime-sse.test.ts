import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMailStore, clearMailboxCache } from '@/stores/useMailStore';

describe('Realtime SSE Update Handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearMailboxCache();
    useMailStore.setState({
      emails: [],
      folderCounts: null,
      activeFolder: 'inbox',
      activeCategory: 'primary',
      activeThread: null,
      selectedEmail: null,
      searchQuery: '',
      isLoading: false,
      isSyncing: false,
      syncStatus: 'idle',
      error: null,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('invalidates cache, refreshes counts, and refetches active view on handleRealtimeGmailUpdate', async () => {
    const fakeCounts = {
      INBOX: { unread: 10, total: 100, threadsUnread: 10, threadsTotal: 100, messagesUnread: 10, messagesTotal: 100 },
    };
    const fakeEmails = [
      {
        id: 'msg-realtime-1',
        threadId: 't-1',
        snippet: 'Realtime update test',
        subject: 'Realtime subject',
        from: { email: 'test@example.com' },
        to: [{ email: 'user@example.com' }],
        date: '2026-09-05T10:00:00Z',
        internalDate: 1700000000000,
        isRead: false,
        isStarred: false,
        folder: 'inbox' as const,
        labels: ['INBOX', 'CATEGORY_PERSONAL'],
      },
    ];

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/counts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => fakeCounts,
        });
      }
      if (url.includes('/api/mail/inbox')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ emails: fakeEmails, nextPageToken: null, resultSizeEstimate: 1 }),
        });
      }
      return Promise.reject(new Error(`Unknown url: ${url}`));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = useMailStore.getState().handleRealtimeGmailUpdate({ historyId: '12345' });

    // Fast forward debounce timer (150ms)
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(fetchMock).toHaveBeenCalledWith('/api/mail/counts', expect.anything());
    expect(fetchMock).toHaveBeenCalledWith('/api/mail/inbox?category=primary', expect.anything());
    expect(useMailStore.getState().folderCounts).toEqual(fakeCounts);
    expect(useMailStore.getState().emails).toEqual(fakeEmails);
  });

  it('collapses rapid GMAIL_UPDATE events within 150ms into a single fetch execution', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/counts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ emails: [], nextPageToken: null, resultSizeEstimate: 0 }),
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    // Trigger 3 rapid updates without awaiting immediately
    const p1 = useMailStore.getState().handleRealtimeGmailUpdate({ historyId: '100' });
    const p2 = useMailStore.getState().handleRealtimeGmailUpdate({ historyId: '101' });
    const p3 = useMailStore.getState().handleRealtimeGmailUpdate({ historyId: '102' });

    await vi.advanceTimersByTimeAsync(200);
    await Promise.all([p1, p2, p3]);

    // counts + active view refetch = 2 fetch calls total for the single collapsed execution
    const countCalls = fetchMock.mock.calls.filter((c) => c[0].includes('/api/mail/counts'));
    const mailCalls = fetchMock.mock.calls.filter((c) => c[0].includes('/api/mail/inbox'));
    expect(countCalls).toHaveLength(1);
    expect(mailCalls).toHaveLength(1);
  });

  it('automatically refetches activeThread in real-time when GMAIL_UPDATE arrives', async () => {
    const openThreadId = 't-open-100';
    useMailStore.setState({
      activeThread: {
        threadId: openThreadId,
        subject: 'Open Thread',
        snippet: 'Original msg',
        messages: [{ id: 'm-1', threadId: openThreadId } as any],
      },
    });

    const updatedThreadData = {
      threadId: openThreadId,
      subject: 'Open Thread',
      snippet: 'New reply arrived',
      messages: [
        { id: 'm-1', threadId: openThreadId },
        { id: 'm-new-reply', threadId: openThreadId, snippet: 'its not fun fact' },
      ],
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/counts')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      if (url.includes('/api/mail/inbox')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ emails: [] }) });
      }
      if (url.includes(`/api/mail/thread/${openThreadId}`)) {
        return Promise.resolve({ ok: true, status: 200, json: async () => updatedThreadData });
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const p = useMailStore.getState().handleRealtimeGmailUpdate({ historyId: 'NewReplyPush' });
    await vi.advanceTimersByTimeAsync(200);
    await p;

    expect(fetchMock).toHaveBeenCalledWith(`/api/mail/thread/${openThreadId}`, expect.anything());
    const activeThread = useMailStore.getState().activeThread;
    expect(activeThread?.messages).toHaveLength(2);
    expect(activeThread?.messages[1].id).toBe('m-new-reply');
  });

  it('triggers full sync if fullSyncRequired flag is received in payload', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/counts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ emails: [] }),
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await useMailStore.getState().handleRealtimeGmailUpdate({ fullSyncRequired: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/mail/counts', expect.anything());
    expect(fetchMock).toHaveBeenCalledWith('/api/mail/inbox?category=primary', expect.anything());
  });

  it('removes archived emails from the active view on realtime update', async () => {
    // Initial state: 1 active inbox email
    const initialEmail = {
      id: 'msg-archived',
      threadId: 't-archived',
      snippet: 'Archived email',
      subject: 'Archived',
      from: { email: 'a@b.com' },
      to: [],
      date: '2026',
      internalDate: 100,
      isRead: true,
      isStarred: false,
      folder: 'inbox' as const,
      labels: ['INBOX'],
    };
    useMailStore.setState({ emails: [initialEmail] });

    // Gmail returns empty array after message was archived
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/counts')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ INBOX: { unread: 0, total: 0 } }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ emails: [] }) });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const p = useMailStore.getState().handleRealtimeGmailUpdate({ historyId: 'ArchivedEvent' });
    await vi.advanceTimersByTimeAsync(200);
    await p;

    expect(useMailStore.getState().emails).toHaveLength(0);
  });
});
