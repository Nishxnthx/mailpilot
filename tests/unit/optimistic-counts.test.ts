import { describe, it, expect } from 'vitest';
import { adjustOptimisticCounts, hasOtherUnreadMessagesInThread } from '@/stores/useMailStore';
import { MailCountsResult } from '@/lib/gmail/service';
import { Email, EmailThread } from '@/types/email';

describe('Realtime Optimistic Unread Counts & Thread Transition Semantics', () => {
  const initialCounts: MailCountsResult = {
    inbox: { messagesTotal: 100, messagesUnread: 12, threadsTotal: 90, threadsUnread: 10, total: 90, unread: 10 },
    starred: { messagesTotal: 5, messagesUnread: 2, threadsTotal: 5, threadsUnread: 2, total: 5, unread: 2 },
    trash: { messagesTotal: 3, messagesUnread: 0, threadsTotal: 3, threadsUnread: 0, total: 3, unread: 0 },
    categories: {
      primary: { messagesTotal: 50, messagesUnread: 7, threadsTotal: 45, threadsUnread: 6, total: 45, unread: 6 },
      updates: { messagesTotal: 30, messagesUnread: 5, threadsTotal: 28, threadsUnread: 4, total: 28, unread: 4 },
      promotions: { messagesTotal: 10, messagesUnread: 0, threadsTotal: 10, threadsUnread: 0, total: 10, unread: 0 },
      social: { messagesTotal: 10, messagesUnread: 0, threadsTotal: 10, threadsUnread: 0, total: 10, unread: 0 },
      forums: { messagesTotal: 0, messagesUnread: 0, threadsTotal: 0, threadsUnread: 0, total: 0, unread: 0 },
    },
    userLabels: [
      { id: 'Label_1', name: 'Work', messagesTotal: 15, messagesUnread: 3, threadsTotal: 12, threadsUnread: 2, total: 12, unread: 2 },
    ],
  };

  const sampleEmail: Email = {
    id: 'msg-123',
    threadId: 'thread-123',
    snippet: 'Quarterly report',
    subject: 'Quarterly report',
    from: { email: 'boss@example.com' },
    to: [{ email: 'me@example.com' }],
    date: new Date().toISOString(),
    internalDate: Date.now(),
    isRead: false,
    isStarred: false,
    folder: 'inbox',
    labels: ['INBOX', 'CATEGORY_UPDATES', 'UNREAD', 'Label_1'],
  };

  describe('Single-Message Thread Read / Unread', () => {
    it('decrements unread, threadsUnread, and messagesUnread when a single-message thread is marked read (-1)', () => {
      const updated = adjustOptimisticCounts(initialCounts, sampleEmail, -1, -1);
      expect(updated).not.toBeNull();
      expect(updated?.inbox?.unread).toBe(9);
      expect(updated?.inbox?.threadsUnread).toBe(9);
      expect(updated?.inbox?.messagesUnread).toBe(11);
      expect(updated?.categories.updates?.unread).toBe(3);
      expect(updated?.categories.updates?.threadsUnread).toBe(3);
      expect(updated?.categories.updates?.messagesUnread).toBe(4);
      expect(updated?.userLabels[0].unread).toBe(1);
    });

    it('increments unread, threadsUnread, and messagesUnread when a single-message thread is marked unread (+1)', () => {
      const updated = adjustOptimisticCounts(initialCounts, sampleEmail, 1, 1);
      expect(updated).not.toBeNull();
      expect(updated?.inbox?.unread).toBe(11);
      expect(updated?.inbox?.threadsUnread).toBe(11);
      expect(updated?.inbox?.messagesUnread).toBe(13);
      expect(updated?.categories.updates?.unread).toBe(5);
    });
  });

  describe('Multi-Message Thread Transition Semantics', () => {
    const msg1: Email = {
      ...sampleEmail,
      id: 'msg-1',
      threadId: 'thread-multi',
      isRead: false,
      labels: ['INBOX', 'CATEGORY_UPDATES', 'UNREAD'],
    };

    const msg2: Email = {
      ...sampleEmail,
      id: 'msg-2',
      threadId: 'thread-multi',
      isRead: false,
      labels: ['INBOX', 'CATEGORY_UPDATES', 'UNREAD'],
    };

    const activeThread: EmailThread = {
      threadId: 'thread-multi',
      subject: 'Multi message thread',
      snippet: 'Multi snippet',
      messages: [msg1, msg2],
    };

    it('detects when another message in the same thread is still unread', () => {
      const hasOther = hasOtherUnreadMessagesInThread(msg1, [msg1, msg2], activeThread);
      expect(hasOther).toBe(true);
    });

    it('does NOT decrement threadsUnread when marking one message read if another message in the thread remains unread', () => {
      const hasOther = hasOtherUnreadMessagesInThread(msg1, [msg1, msg2], activeThread);
      const threadTransitionDelta = hasOther ? 0 : -1;

      expect(threadTransitionDelta).toBe(0);

      const updated = adjustOptimisticCounts(initialCounts, msg1, -1, threadTransitionDelta);
      // messagesUnread decreases by 1
      expect(updated?.inbox?.messagesUnread).toBe(11);
      expect(updated?.categories.updates?.messagesUnread).toBe(4);
      // threadsUnread remains UNCHANGED at 10 (not decremented to 9)
      expect(updated?.inbox?.threadsUnread).toBe(10);
      expect(updated?.inbox?.unread).toBe(10);
      expect(updated?.categories.updates?.threadsUnread).toBe(4);
    });

    it('DOES decrement threadsUnread when marking the FINAL unread message in a thread read', () => {
      const msg1Read: Email = { ...msg1, isRead: true, labels: ['INBOX', 'CATEGORY_UPDATES'] };
      const threadWithOneUnread: EmailThread = {
        ...activeThread,
        messages: [msg1Read, msg2],
      };

      const hasOther = hasOtherUnreadMessagesInThread(msg2, [msg1Read, msg2], threadWithOneUnread);
      expect(hasOther).toBe(false);

      const threadTransitionDelta = hasOther ? 0 : -1;
      expect(threadTransitionDelta).toBe(-1);

      const updated = adjustOptimisticCounts(initialCounts, msg2, -1, threadTransitionDelta);
      // Both messagesUnread AND threadsUnread decrement
      expect(updated?.inbox?.messagesUnread).toBe(11);
      expect(updated?.inbox?.threadsUnread).toBe(9);
      expect(updated?.inbox?.unread).toBe(9);
    });

    it('does NOT increment threadsUnread when marking a message unread if the thread was ALREADY unread', () => {
      const msg1Unread: Email = { ...msg1, isRead: false, labels: ['INBOX', 'CATEGORY_UPDATES', 'UNREAD'] };
      const msg2Read: Email = { ...msg2, isRead: true, labels: ['INBOX', 'CATEGORY_UPDATES'] };
      const threadWithOneUnread: EmailThread = {
        ...activeThread,
        messages: [msg1Unread, msg2Read],
      };

      const hasOther = hasOtherUnreadMessagesInThread(msg2Read, [msg1Unread, msg2Read], threadWithOneUnread);
      expect(hasOther).toBe(true);

      const threadTransitionDelta = hasOther ? 0 : 1;
      expect(threadTransitionDelta).toBe(0);

      const updated = adjustOptimisticCounts(initialCounts, msg2Read, 1, threadTransitionDelta);
      // messagesUnread increases by 1
      expect(updated?.inbox?.messagesUnread).toBe(13);
      // threadsUnread stays unchanged at 10 because thread was already unread
      expect(updated?.inbox?.threadsUnread).toBe(10);
      expect(updated?.inbox?.unread).toBe(10);
    });
  });

  describe('Safety Floor', () => {
    it('never drops unread counts below zero', () => {
      const zeroCounts: MailCountsResult = {
        inbox: { messagesTotal: 10, messagesUnread: 0, threadsTotal: 10, threadsUnread: 0, total: 10, unread: 0 },
        categories: {
          updates: { messagesTotal: 5, messagesUnread: 0, threadsTotal: 5, threadsUnread: 0, total: 5, unread: 0 },
        },
        userLabels: [],
      };

      const updated = adjustOptimisticCounts(zeroCounts, sampleEmail, -1, -1);
      expect(updated?.inbox?.unread).toBe(0);
      expect(updated?.inbox?.threadsUnread).toBe(0);
      expect(updated?.inbox?.messagesUnread).toBe(0);
      expect(updated?.categories.updates?.unread).toBe(0);
    });
  });
});
