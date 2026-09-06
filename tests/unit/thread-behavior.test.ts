import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Email, EmailThread } from '@/types/email';
import { useMailStore, clearMailboxCache } from '@/stores/useMailStore';

export function normalizeThread(threadId: string, rawMessages: Email[]): EmailThread {
  // Sort chronologically: oldest first (internalDate ascending)
  const sortedMessages = [...rawMessages].sort((a, b) => a.internalDate - b.internalDate);
  const latestMessage = sortedMessages[sortedMessages.length - 1];

  return {
    threadId,
    subject: latestMessage?.subject || '(No Subject)',
    snippet: latestMessage?.snippet || '',
    messages: sortedMessages,
  };
}

describe('Thread Conversation & Multiple Forward Synchronization', () => {
  beforeEach(() => {
    clearMailboxCache();
    useMailStore.setState({
      activeFolder: 'inbox',
      activeCategory: 'primary',
      emails: [],
      selectedEmail: null,
      activeThread: null,
      folderCounts: null,
      searchQuery: '',
      isLoading: false,
      isSyncing: false,
      syncStatus: 'idle',
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('orders thread messages chronologically from oldest to newest', () => {
    const rawMessages: Email[] = [
      {
        id: 'msg-3',
        threadId: 't-100',
        subject: 'Re: Re: Design Brief',
        snippet: 'Latest reply',
        from: { email: 'charlie@example.com' },
        to: [],
        date: '2026-09-05T12:00:00Z',
        internalDate: 1700000003000,
        isRead: false,
        isStarred: false,
        folder: 'inbox',
        labels: [],
      },
      {
        id: 'msg-1',
        threadId: 't-100',
        subject: 'Design Brief',
        snippet: 'Original email',
        from: { email: 'alice@example.com' },
        to: [],
        date: '2026-09-05T10:00:00Z',
        internalDate: 1700000001000,
        isRead: true,
        isStarred: false,
        folder: 'inbox',
        labels: [],
      },
      {
        id: 'msg-2',
        threadId: 't-100',
        subject: 'Re: Design Brief',
        snippet: 'First reply',
        from: { email: 'bob@example.com' },
        to: [],
        date: '2026-09-05T11:00:00Z',
        internalDate: 1700000002000,
        isRead: true,
        isStarred: false,
        folder: 'inbox',
        labels: [],
      },
    ];

    const thread = normalizeThread('t-100', rawMessages);

    // Verify chronological order: msg-1 -> msg-2 -> msg-3
    expect(thread.messages[0].id).toBe('msg-1');
    expect(thread.messages[1].id).toBe('msg-2');
    expect(thread.messages[2].id).toBe('msg-3');
  });

  it('preserves the common threadId across all messages', () => {
    const rawMessages: Email[] = [
      { id: 'm-1', threadId: 't-200', subject: 'A', snippet: 'A', from: { email: 'a@b.com' }, to: [], date: '2026', internalDate: 100, isRead: true, isStarred: false, folder: 'inbox', labels: [] },
      { id: 'm-2', threadId: 't-200', subject: 'Re: A', snippet: 'B', from: { email: 'c@d.com' }, to: [], date: '2026', internalDate: 200, isRead: true, isStarred: false, folder: 'inbox', labels: [] },
    ];

    const thread = normalizeThread('t-200', rawMessages);
    expect(thread.threadId).toBe('t-200');
    thread.messages.forEach((msg) => {
      expect(msg.threadId).toBe('t-200');
    });
  });

  it('verifies reply draft preserves threadId, inReplyTo, and references headers', () => {
    const originalEmail: Email = {
      id: 'orig-101',
      threadId: 'thread-xyz',
      messageId: '<orig-msg-id@example.com>',
      subject: 'Meeting Tomorrow',
      snippet: 'Are we meeting tomorrow?',
      from: { name: 'Alice', email: 'alice@example.com' },
      to: [{ email: 'me@example.com' }],
      date: '2026-09-05T10:00:00Z',
      internalDate: 1700000000000,
      isRead: true,
      isStarred: false,
      folder: 'inbox',
      labels: ['INBOX'],
    };

    useMailStore.setState({ selectedEmail: originalEmail });

    useMailStore.getState().openCompose({
      to: originalEmail.from.email,
      subject: `Re: ${originalEmail.subject}`,
      body: 'Yes, I will attend.',
      threadId: originalEmail.threadId,
      inReplyTo: originalEmail.messageId,
      references: originalEmail.messageId,
    });

    const draft = useMailStore.getState().composeDraft;
    expect(draft.threadId).toBe('thread-xyz');
    expect(draft.inReplyTo).toBe('<orig-msg-id@example.com>');
    expect(draft.references).toBe('<orig-msg-id@example.com>');
    expect(draft.to).toBe('alice@example.com');
  });

  it('refetches existing thread after successful reply and updates activeThread', async () => {
    const threadId = 'thread-live-999';
    const initialThread: EmailThread = {
      threadId,
      subject: 'Project Kickoff',
      snippet: 'When do we start?',
      messages: [
        {
          id: 'm-orig',
          threadId,
          messageId: '<orig-kickoff@example.com>',
          subject: 'Project Kickoff',
          snippet: 'When do we start?',
          from: { email: 'client@example.com' },
          to: [{ email: 'me@example.com' }],
          date: '2026-09-05T09:00:00Z',
          internalDate: 1700000000000,
          isRead: true,
          isStarred: false,
          folder: 'inbox',
          labels: ['INBOX'],
        },
      ],
    };

    const updatedThread: EmailThread = {
      threadId,
      subject: 'Re: Project Kickoff',
      snippet: 'We start on Monday.',
      messages: [
        initialThread.messages[0],
        {
          id: 'm-reply',
          threadId,
          messageId: '<reply-kickoff@example.com>',
          subject: 'Re: Project Kickoff',
          snippet: 'We start on Monday.',
          from: { email: 'me@example.com' },
          to: [{ email: 'client@example.com' }],
          date: '2026-09-05T09:05:00Z',
          internalDate: 1700000300000,
          isRead: true,
          isStarred: false,
          folder: 'sent',
          labels: ['SENT'],
        },
      ],
    };

    useMailStore.setState({ activeThread: initialThread });

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(`/api/mail/thread/${threadId}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => updatedThread,
        });
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await useMailStore.getState().fetchEmailThread(threadId);

    expect(fetchMock).toHaveBeenCalledWith(`/api/mail/thread/${threadId}`, expect.anything());
    const activeThread = useMailStore.getState().activeThread;
    expect(activeThread?.messages).toHaveLength(2);
    expect(activeThread?.messages[0].id).toBe('m-orig');
    expect(activeThread?.messages[1].id).toBe('m-reply');
    expect(activeThread?.messages[1].threadId).toBe(threadId);
  });

  it('handles multiple forwards sequentially, refetching Gmail thread each time (Original -> Fwd 1 -> Fwd 2 = 3 messages)', async () => {
    const threadId = 'thread-multi-fwd';
    
    const msgOrig: Email = {
      id: 'm-1',
      threadId,
      subject: 'Hiring Update',
      snippet: 'Candidate details attached',
      from: { email: 'hr@company.com' },
      to: [{ email: 'me@company.com' }],
      date: '2026-09-05T08:00:00Z',
      internalDate: 1700000000000,
      isRead: true,
      isStarred: false,
      folder: 'inbox',
      labels: ['INBOX'],
    };

    const msgFwd1: Email = {
      id: 'm-2',
      threadId,
      subject: 'Fwd: Hiring Update',
      snippet: 'FYI hiring update',
      from: { email: 'me@company.com' },
      to: [{ email: 'team1@company.com' }],
      date: '2026-09-05T08:10:00Z',
      internalDate: 1700000600000,
      isRead: true,
      isStarred: false,
      folder: 'sent',
      labels: ['SENT'],
    };

    const msgFwd2: Email = {
      id: 'm-3',
      threadId,
      subject: 'Fwd: Hiring Update',
      snippet: 'Another forward to manager',
      from: { email: 'me@company.com' },
      to: [{ email: 'manager@company.com' }],
      date: '2026-09-05T08:20:00Z',
      internalDate: 1700001200000,
      isRead: true,
      isStarred: false,
      folder: 'sent',
      labels: ['SENT'],
    };

    // Step 1: Thread has 1 message
    let currentThread: EmailThread = {
      threadId,
      subject: 'Hiring Update',
      snippet: 'Candidate details attached',
      messages: [msgOrig],
    };

    useMailStore.setState({ activeThread: currentThread });

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(`/api/mail/thread/${threadId}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => currentThread,
        });
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    // Step 2: First Forward sent, thread updated to 2 messages
    currentThread = {
      ...currentThread,
      messages: [msgOrig, msgFwd1],
    };
    await useMailStore.getState().fetchEmailThread(threadId);
    expect(useMailStore.getState().activeThread?.messages).toHaveLength(2);

    // Step 3: Second Forward sent, thread updated to 3 messages
    currentThread = {
      ...currentThread,
      messages: [msgOrig, msgFwd1, msgFwd2],
    };
    await useMailStore.getState().fetchEmailThread(threadId);

    const finalThread = useMailStore.getState().activeThread;
    expect(finalThread?.messages).toHaveLength(3);
    expect(finalThread?.messages[0].id).toBe('m-1');
    expect(finalThread?.messages[1].id).toBe('m-2');
    expect(finalThread?.messages[2].id).toBe('m-3');
    // Ensure chronological order
    expect(finalThread!.messages[0].internalDate).toBeLessThan(finalThread!.messages[1].internalDate);
    expect(finalThread!.messages[1].internalDate).toBeLessThan(finalThread!.messages[2].internalDate);
  });

  it('realtime update on open thread replaces activeThread with fresh thread without duplication', async () => {
    const threadId = 'thread-realtime-test';
    const msg1: Email = { id: 'm-1', threadId, subject: 'S', snippet: 'A', from: { email: 'a@b.com' }, to: [], date: '2026', internalDate: 100, isRead: true, isStarred: false, folder: 'inbox', labels: [] };
    const msg2: Email = { id: 'm-2', threadId, subject: 'S', snippet: 'B', from: { email: 'b@c.com' }, to: [], date: '2026', internalDate: 200, isRead: true, isStarred: false, folder: 'inbox', labels: [] };

    useMailStore.setState({
      activeThread: { threadId, subject: 'S', snippet: 'A', messages: [msg1] },
      selectedEmail: msg1,
    });

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(`/api/mail/thread/${threadId}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ threadId, subject: 'S', snippet: 'B', messages: [msg1, msg2] }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ emails: [], counts: {} }) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await useMailStore.getState().handleRealtimeGmailUpdate({ historyId: '123' });

    const activeThread = useMailStore.getState().activeThread;
    expect(activeThread?.messages).toHaveLength(2);
    // Ensure no duplicate IDs exist
    const ids = activeThread?.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(2);
  });
});
