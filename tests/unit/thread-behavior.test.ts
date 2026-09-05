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

describe('Thread Conversation Behavior', () => {
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
});
