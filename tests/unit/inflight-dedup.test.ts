import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMailStore, clearMailboxCache } from '@/stores/useMailStore';

describe('In-Flight Request Deduplication', () => {
  beforeEach(() => {
    clearMailboxCache();
    useMailStore.setState({ emails: [], isLoading: false, isSyncing: false, error: null });
    vi.restoreAllMocks();
  });

  it('deduplicates concurrent identical fetch requests into a single network call', async () => {
    let resolveFetch: (value: Response) => void;
    const pendingResponsePromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.fn().mockImplementation(() => pendingResponsePromise);
    global.fetch = fetchMock as unknown as typeof fetch;

    // Launch two concurrent fetchEmails calls for identical parameters
    const p1 = useMailStore.getState().fetchEmails('sent', '', false, 'all');
    const p2 = useMailStore.getState().fetchEmails('sent', '', false, 'all');

    // Only 1 network request should be initiated
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Resolve the single network call
    resolveFetch!({
      ok: true,
      status: 200,
      json: async () => ({ emails: [{ id: 'sent-1', threadId: 't-1', snippet: 'S', subject: 'Sent 1', from: { email: 'me@b.com' }, to: [], date: '2026', internalDate: 100, isRead: true, isStarred: false, folder: 'sent', labels: [] }] }),
    } as Response);

    await Promise.all([p1, p2]);

    expect(useMailStore.getState().emails).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
