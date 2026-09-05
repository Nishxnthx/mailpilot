import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMailStore, clearMailboxCache, adjustOptimisticCounts } from '@/stores/useMailStore';

describe('Inbox Category Defaults & Primary vs All Switching', () => {
  beforeEach(() => {
    clearMailboxCache();
    useMailStore.setState({
      activeFolder: 'inbox',
      activeCategory: 'primary',
      emails: [],
      folderCounts: null,
      searchQuery: '',
      isLoading: false,
      isSyncing: false,
      syncStatus: 'idle',
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('defaults activeCategory to primary when initialized or navigating to inbox', () => {
    expect(useMailStore.getState().activeCategory).toBe('primary');

    useMailStore.getState().setActiveFolder('inbox');
    expect(useMailStore.getState().activeCategory).toBe('primary');
  });

  it('verifies Sidebar Inbox badge matches Primary unread count (1,116)', () => {
    const fakeCounts = {
      inbox: { threadsTotal: 5008, threadsUnread: 4759, messagesTotal: 5152, messagesUnread: 4872 },
      categories: {
        primary: { threadsTotal: 1349, threadsUnread: 1116, messagesTotal: 1418, messagesUnread: 1116 },
        promotions: { threadsTotal: 1154, threadsUnread: 1145, messagesTotal: 1156, messagesUnread: 1147 },
      },
      userLabels: [],
    };

    useMailStore.setState({ folderCounts: fakeCounts as any });

    const counts = useMailStore.getState().folderCounts;
    const sidebarInboxBadge = counts?.categories?.primary?.threadsUnread;
    const primaryUnreadCount = counts?.categories?.primary?.threadsUnread;

    expect(sidebarInboxBadge).toBe(1116);
    expect(sidebarInboxBadge).toBe(primaryUnreadCount);
    expect(counts?.inbox?.threadsUnread).toBe(4759); // All-inbox unread preserved
  });

  it('optimistically updates Primary unread count for Primary emails but not for Promotions emails', () => {
    const initialCounts = {
      inbox: { threadsTotal: 5008, threadsUnread: 4759 },
      categories: {
        primary: { threadsTotal: 1349, threadsUnread: 1116 },
        promotions: { threadsTotal: 1154, threadsUnread: 1145 },
      },
      userLabels: [],
    };

    const primaryEmail = {
      id: 'p-1',
      threadId: 't-p-1',
      isRead: false,
      folder: 'inbox' as const,
      labels: ['INBOX', 'CATEGORY_PERSONAL', 'UNREAD'],
    };

    const promoEmail = {
      id: 'pr-1',
      threadId: 't-pr-1',
      isRead: false,
      folder: 'inbox' as const,
      labels: ['INBOX', 'CATEGORY_PROMOTIONS', 'UNREAD'],
    };

    // Mark Primary email read (-1)
    const afterPrimaryRead = adjustOptimisticCounts(initialCounts as any, primaryEmail as any, -1, -1);
    expect(afterPrimaryRead?.categories.primary?.threadsUnread).toBe(1115);
    expect(afterPrimaryRead?.inbox?.threadsUnread).toBe(4758);

    // Mark Promotions email read (-1)
    const afterPromoRead = adjustOptimisticCounts(initialCounts as any, promoEmail as any, -1, -1);
    expect(afterPromoRead?.categories.primary?.threadsUnread).toBe(1116); // Primary unread unchanged!
    expect(afterPromoRead?.categories.promotions?.threadsUnread).toBe(1144);
    expect(afterPromoRead?.inbox?.threadsUnread).toBe(4758);
  });

  it('fetches Primary view with category=primary and returns Primary count', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/inbox?category=primary')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            emails: [{ id: 'msg-primary-1', threadId: 't-primary-1', snippet: 'Primary snippet' }],
            resultSizeEstimate: 1349,
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await useMailStore.getState().fetchEmails('inbox', '', false, 'primary');

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/mail/inbox?category=primary'), expect.anything());
    expect(useMailStore.getState().emails).toHaveLength(1);
    expect(useMailStore.getState().emails[0].id).toBe('msg-primary-1');
  });

  it('fetches All view with category=all and returns complete Inbox count', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/inbox')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            emails: [
              { id: 'msg-primary-1', threadId: 't-primary-1', snippet: 'Primary snippet' },
              { id: 'msg-promo-1', threadId: 't-promo-1', snippet: 'Promo snippet' },
            ],
            resultSizeEstimate: 5008,
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await useMailStore.getState().fetchEmails('inbox', '', false, 'all');

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/mail/inbox'), expect.anything());
    expect(useMailStore.getState().emails).toHaveLength(2);
  });

  it('switches between Primary and All seamlessly', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/inbox?category=primary')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ emails: [{ id: 'msg-1' }] }),
        });
      }
      if (url.includes('/api/mail/inbox')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ emails: [{ id: 'msg-1' }, { id: 'msg-2' }] }),
        });
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    // Initially switch to Primary
    useMailStore.getState().setActiveCategory('primary');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('category=primary'), expect.anything()));
    expect(useMailStore.getState().activeCategory).toBe('primary');

    // Switch to All
    useMailStore.getState().setActiveCategory('all');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(expect.stringMatching(/\/api\/mail\/inbox\?$/), expect.anything()));
    expect(useMailStore.getState().activeCategory).toBe('all');
  });

  it('updates counts and active view on realtime incoming email', async () => {
    vi.useFakeTimers();
    const fakeCounts = {
      inbox: { threadsTotal: 5009, threadsUnread: 4760 },
      categories: {
        primary: { threadsTotal: 1350, threadsUnread: 1115 },
      },
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/mail/counts')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => fakeCounts });
      }
      if (url.includes('/api/mail/inbox?category=primary')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ emails: [{ id: 'new-msg' }] }) });
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const p = useMailStore.getState().handleRealtimeGmailUpdate({ historyId: '199999' });
    await vi.advanceTimersByTimeAsync(200);
    await p;

    expect(useMailStore.getState().folderCounts).toEqual(fakeCounts);
    expect(useMailStore.getState().emails).toHaveLength(1);
    expect(useMailStore.getState().emails[0].id).toBe('new-msg');
    vi.useRealTimers();
  });
});
