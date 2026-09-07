import { create } from 'zustand';
import { Email, EmailFolder, EmailCategory, EmailDraft, EmailThread } from '@/types/email';
import { MailCountsResult, LabelCountItem } from '@/lib/gmail/service';

export type SyncStatusType = 'live' | 'syncing' | 'updated' | 'reconnecting' | 'idle';
export type ReadFilterType = 'all' | 'unread' | 'read';

interface MailState {
  // Navigation & View
  activeFolder: EmailFolder;
  activeCategory: EmailCategory;
  readFilter: ReadFilterType;
  selectedEmailId: string | null;
  selectedEmail: Email | null;
  searchQuery: string;

  // Real Gmail Counts
  folderCounts: MailCountsResult | null;

  // Gmail Connection State
  isGmailConnected: boolean | null; // null = initial loading
  userProfile: { emailAddress: string; displayName: string } | null;
  syncStatus: SyncStatusType;

  // Mail Data & Pagination
  emails: Email[];
  nextPageToken: string | null;
  resultSizeEstimate: number | null;
  isLoading: boolean;
  isSyncing: boolean;
  isLoadingDetail: boolean;
  activeThread: EmailThread | null;
  isLoadingThread: boolean;
  error: string | null;

  // Controlled Compose State
  isComposeOpen: boolean;
  isTyping: boolean;
  composeDraft: EmailDraft;

  // Actions
  setActiveFolder: (folder: EmailFolder) => void;
  setActiveCategory: (category: EmailCategory) => void;
  setReadFilter: (filter: ReadFilterType) => void;
  setSelectedEmailId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsGmailConnected: (connected: boolean) => void;
  setSyncStatus: (status: SyncStatusType) => void;
  checkAuthStatus: () => Promise<void>;
  disconnectGmail: () => Promise<void>;

  // Mail API Actions
  fetchEmails: (folderParam?: EmailFolder, queryParam?: string, append?: boolean, categoryParam?: EmailCategory, bypassCache?: boolean) => Promise<void>;
  fetchEmailDetail: (id: string) => Promise<void>;
  fetchEmailThread: (threadId: string) => Promise<void>;
  fetchFolderCounts: () => Promise<void>;
  clearActiveThread: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  clearSelectedEmail: () => void;
  syncMail: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Real-time Stream Actions
  connectRealtimeStream: () => void;
  disconnectRealtimeStream: () => void;
  handleRealtimeGmailUpdate: (data?: Record<string, unknown>) => Promise<void>;

  // Compose Actions
  openCompose: (initialData?: Partial<EmailDraft>) => void;
  closeCompose: () => void;
  updateComposeDraft: (fields: Partial<EmailDraft>) => void;
  resetComposeDraft: () => void;
  animateComposeFill: (targetDraft: Partial<EmailDraft>, speedMs?: number) => Promise<void>;
}

const initialDraft: EmailDraft = {
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '',
};

let activeEventSource: EventSource | null = null;
let updatedStatusTimer: NodeJS.Timeout | null = null;
let sseUpdateDebounceTimer: NodeJS.Timeout | null = null;
let pendingRealtimeResolvers: Array<() => void> = [];

interface CacheEntry {
  emails: Email[];
  nextPageToken: string | null;
  resultSizeEstimate: number | null;
  timestamp: number;
}

const mailboxCacheMap = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60000; // 60-second TTL
const pendingFetchesMap = new Map<string, Promise<void>>();
let searchDebounceTimer: NodeJS.Timeout | null = null;
let currentAnimationId = 0;

export function clearMailboxCache() {
  mailboxCacheMap.clear();
}

export function cancelComposeAnimation() {
  currentAnimationId++;
}

export function hasOtherUnreadMessagesInThread(
  targetEmail: Email,
  emails: Email[] = [],
  activeThread: EmailThread | null = null
): boolean {
  const targetId = targetEmail.id;
  const threadId = targetEmail.threadId;
  if (!threadId) return false;

  if (activeThread && activeThread.threadId === threadId && Array.isArray(activeThread.messages)) {
    const otherUnreadInThread = activeThread.messages.some(
      (m) => m.id !== targetId && (!m.isRead || (m.labels || []).includes('UNREAD'))
    );
    if (otherUnreadInThread) return true;
  }

  if (Array.isArray(emails)) {
    const otherUnreadInStore = emails.some(
      (e) => e.threadId === threadId && e.id !== targetId && (!e.isRead || (e.labels || []).includes('UNREAD'))
    );
    if (otherUnreadInStore) return true;
  }

  return false;
}

function adjustItem(
  item: LabelCountItem | undefined,
  msgDelta: -1 | 0 | 1,
  threadDelta: -1 | 0 | 1
): LabelCountItem | undefined {
  if (!item) return undefined;
  const currentThreadsUnread = typeof item.threadsUnread === 'number' ? item.threadsUnread : (item.unread || 0);
  const currentThreadsTotal = typeof item.threadsTotal === 'number' ? item.threadsTotal : (item.total || 0);
  const currentMsgUnread = typeof item.messagesUnread === 'number' ? item.messagesUnread : (item.unread || 0);
  const currentMsgTotal = typeof item.messagesTotal === 'number' ? item.messagesTotal : (item.total || 0);

  const newThreadsUnread = Math.max(0, currentThreadsUnread + threadDelta);
  const newMsgUnread = Math.max(0, currentMsgUnread + msgDelta);

  return {
    ...item,
    threadsUnread: newThreadsUnread,
    unread: newThreadsUnread,
    threadsTotal: currentThreadsTotal,
    total: currentThreadsTotal,
    messagesUnread: newMsgUnread,
    messagesTotal: currentMsgTotal,
  };
}

export function adjustOptimisticCounts(
  folderCounts: MailCountsResult | null,
  email: Email,
  delta: -1 | 1,
  threadTransitionDelta?: -1 | 0 | 1
): MailCountsResult | null {
  if (!folderCounts) return null;

  const msgDelta = delta;
  const threadDelta = threadTransitionDelta !== undefined ? threadTransitionDelta : delta;

  const labels = email.labels || [];
  const folder = email.folder;

  const counts: MailCountsResult = {
    ...folderCounts,
    categories: { ...folderCounts.categories },
    userLabels: (folderCounts.userLabels || []).map((ul) => ({ ...ul })),
  };

  // 1. System Folders
  if (labels.includes('INBOX') || folder === 'inbox') {
    counts.inbox = adjustItem(counts.inbox, msgDelta, threadDelta);
  }

  if (labels.includes('STARRED') || email.isStarred) {
    counts.starred = adjustItem(counts.starred, msgDelta, threadDelta);
  }

  if (labels.includes('TRASH') || folder === 'trash') {
    counts.trash = adjustItem(counts.trash, msgDelta, threadDelta);
  }

  if (labels.includes('SPAM')) {
    counts.spam = adjustItem(counts.spam, msgDelta, threadDelta);
  }

  // 2. Categories (checked strictly against Gmail label IDs and Primary category semantics)
  const isOtherCategory =
    labels.includes('CATEGORY_PROMOTIONS') ||
    labels.includes('CATEGORY_SOCIAL') ||
    labels.includes('CATEGORY_UPDATES') ||
    labels.includes('CATEGORY_FORUMS');

  if (labels.includes('CATEGORY_PERSONAL') || (labels.includes('INBOX') && !isOtherCategory)) {
    counts.categories.primary = adjustItem(counts.categories.primary, msgDelta, threadDelta);
  }

  if (labels.includes('CATEGORY_PROMOTIONS')) {
    counts.categories.promotions = adjustItem(counts.categories.promotions, msgDelta, threadDelta);
  }

  if (labels.includes('CATEGORY_SOCIAL')) {
    counts.categories.social = adjustItem(counts.categories.social, msgDelta, threadDelta);
  }

  if (labels.includes('CATEGORY_UPDATES')) {
    counts.categories.updates = adjustItem(counts.categories.updates, msgDelta, threadDelta);
  }

  if (labels.includes('CATEGORY_FORUMS')) {
    counts.categories.forums = adjustItem(counts.categories.forums, msgDelta, threadDelta);
  }

  // 3. User Labels
  for (let i = 0; i < counts.userLabels.length; i++) {
    const ul = counts.userLabels[i];
    if (labels.includes(ul.id) || labels.includes(ul.name)) {
      const adjusted = adjustItem(ul, msgDelta, threadDelta);
      if (adjusted) {
        counts.userLabels[i] = {
          ...ul,
          ...adjusted,
        };
      }
    }
  }

  return counts;
}

export const useMailStore = create<MailState>((set, get) => ({
  activeFolder: 'inbox',
  activeCategory: 'primary',
  readFilter: 'all',
  selectedEmailId: null,
  selectedEmail: null,
  searchQuery: '',

  folderCounts: null,

  isGmailConnected: null,
  userProfile: null,
  syncStatus: 'idle',

  emails: [],
  nextPageToken: null,
  resultSizeEstimate: null,
  isLoading: false,
  isSyncing: false,
  isLoadingDetail: false,
  activeThread: null,
  isLoadingThread: false,
  error: null,

  isComposeOpen: false,
  isTyping: false,
  composeDraft: initialDraft,

  setActiveFolder: (folder) => {
    const defaultCategory = folder === 'inbox' ? 'primary' : 'all';
    // Reset list, estimate, and nextPageToken immediately when switching folders
    set({
      activeFolder: folder,
      activeCategory: defaultCategory,
      readFilter: 'all',
      selectedEmailId: null,
      selectedEmail: null,
      searchQuery: '',
      emails: [],
      nextPageToken: null,
      resultSizeEstimate: null,
    });
    get().fetchEmails(folder, '', false, defaultCategory);
  },

  setActiveCategory: (category) => {
    if (get().activeFolder !== 'inbox') return;
    set({
      activeCategory: category,
      selectedEmailId: null,
      selectedEmail: null,
      emails: [],
      nextPageToken: null,
      resultSizeEstimate: null,
    });
    get().fetchEmails('inbox', get().searchQuery, false, category);
  },

  setReadFilter: (filter) => {
    set({ readFilter: filter });
  },

  setSelectedEmailId: (id) => {
    set({ selectedEmailId: id });
    if (id) {
      get().fetchEmailDetail(id);
    } else {
      set({ selectedEmail: null, activeThread: null, isLoadingThread: false });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, emails: [], nextPageToken: null, resultSizeEstimate: null });
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      get().fetchEmails(get().activeFolder, query, false, get().activeCategory);
    }, 300);
  },

  setIsGmailConnected: (connected) =>
    set({ isGmailConnected: connected }),

  setSyncStatus: (status) =>
    set({ syncStatus: status }),

  checkAuthStatus: async () => {
    try {
      const res = await fetch('/api/auth/google/status', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (res.ok) {
        const data = await res.json();
        const connected = !!data.connected;
        set({ isGmailConnected: connected, userProfile: data.profile || null });
        if (connected) {
          get().fetchFolderCounts();
          if (get().emails.length === 0) {
            get().fetchEmails(get().activeFolder, get().searchQuery, false, get().activeCategory);
          }
          get().connectRealtimeStream();
        } else {
          get().disconnectRealtimeStream();
        }
      } else {
        set({ isGmailConnected: false, userProfile: null, syncStatus: 'idle' });
        get().disconnectRealtimeStream();
      }
    } catch {
      set({ isGmailConnected: false, userProfile: null, syncStatus: 'idle' });
      get().disconnectRealtimeStream();
    }
  },

  disconnectGmail: async () => {
    get().disconnectRealtimeStream();
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST' });
    } catch {
      // Ignore network failure on disconnect call
    } finally {
      set({ isGmailConnected: false, userProfile: null, syncStatus: 'idle', emails: [], selectedEmail: null, selectedEmailId: null });
    }
  },

  fetchEmails: async (folderParam?, queryParam?, append = false, categoryParam?, bypassCache = false) => {
    const state = get();
    const folder = folderParam || state.activeFolder;
    const query = queryParam !== undefined ? queryParam : state.searchQuery;
    const category = categoryParam || state.activeCategory;

    let url = '';
    const params = new URLSearchParams();

    if (query.trim()) {
      url = '/api/mail/search';
      params.set('q', query.trim());
      params.set('folder', folder);
      if (category && category !== 'all') {
        params.set('category', category);
      }
    } else {
      url = `/api/mail/${folder}`;
      if (folder === 'inbox' && category !== 'all') {
        params.set('category', category);
      }
    }

    if (append && state.nextPageToken) {
      params.set('pageToken', state.nextPageToken);
    }

    const fullUrl = `${url}?${params.toString()}`;
    const cacheKey = fullUrl;

    // 1. Client Cache Check (only for non-append, non-bypass calls)
    if (!append && !bypassCache) {
      const cached = mailboxCacheMap.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        set({
          emails: cached.emails,
          nextPageToken: cached.nextPageToken,
          resultSizeEstimate: cached.resultSizeEstimate,
          isLoading: false,
          isSyncing: false,
          error: null,
          syncStatus: activeEventSource ? 'live' : 'idle',
        });
        return;
      }
    }

    // 2. In-flight Deduplication
    if (pendingFetchesMap.has(cacheKey)) {
      await pendingFetchesMap.get(cacheKey);
      return;
    }

    if (!append) {
      set({ isLoading: true, emails: [], nextPageToken: null, error: null, syncStatus: 'syncing' });
    } else {
      set({ isLoading: true, error: null });
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(fullUrl, { cache: 'no-store' });

        if (res.status === 401) {
          set({ isGmailConnected: false, isLoading: false, emails: [], syncStatus: 'idle' });
          get().disconnectRealtimeStream();
          return;
        }

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        const newFetchedEmails: Email[] = data.emails || [];

        // Combine existing and new emails with strict ID deduplication
        const combinedMap = new Map<string, Email>();
        if (append) {
          for (const email of state.emails) {
            combinedMap.set(email.id, email);
          }
        }
        for (const email of newFetchedEmails) {
          combinedMap.set(email.id, email);
        }

        const mergedEmails = Array.from(combinedMap.values());

        // Maintain authoritative chronological ordering (newest first)
        mergedEmails.sort((a, b) => b.internalDate - a.internalDate);

        // Update Client Cache
        if (!append) {
          mailboxCacheMap.set(cacheKey, {
            emails: mergedEmails,
            nextPageToken: data.nextPageToken || null,
            resultSizeEstimate: typeof data.resultSizeEstimate === 'number' ? data.resultSizeEstimate : mergedEmails.length,
            timestamp: Date.now(),
          });
        }

        set({
          emails: mergedEmails,
          nextPageToken: data.nextPageToken || null,
          resultSizeEstimate: typeof data.resultSizeEstimate === 'number' ? data.resultSizeEstimate : null,
          isLoading: false,
          isSyncing: false,
          error: null,
          syncStatus: activeEventSource ? 'live' : 'idle',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch emails';
        set({ error: message, isLoading: false, isSyncing: false, syncStatus: 'idle' });
      }
    })();

    pendingFetchesMap.set(cacheKey, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      pendingFetchesMap.delete(cacheKey);
    }
  },

  fetchEmailDetail: async (id: string) => {
    set({ isLoadingDetail: true });
    try {
      const res = await fetch(`/api/mail/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const email: Email = await res.json();
        // Preserve local isRead state if email was already marked read in local store
        const existing = get().emails.find((e) => e.id === id);
        if (existing && existing.isRead) {
          email.isRead = true;
          email.labels = (email.labels || []).filter((l) => l !== 'UNREAD');
        }
        set({ selectedEmail: email, isLoadingDetail: false });
        if (email.threadId) {
          get().fetchEmailThread(email.threadId);
        }
      } else {
        set({ isLoadingDetail: false });
      }
    } catch {
      set({ isLoadingDetail: false });
    }
  },

  fetchEmailThread: async (threadId: string) => {
    set({ isLoadingThread: true });
    try {
      const res = await fetch(`/api/mail/thread/${threadId}`, { cache: 'no-store' });
      if (res.ok) {
        const threadData: EmailThread = await res.json();
        if (Array.isArray(threadData.messages)) {
          threadData.messages.sort((a, b) => a.internalDate - b.internalDate);
        }
        set((state) => {
          const updatedEmails = state.emails.map((e) => {
            if (e.threadId === threadId || e.id === threadId) {
              return {
                ...e,
                threadMessagesCount: threadData.messages.length,
                snippet: threadData.snippet || e.snippet,
              };
            }
            return e;
          });

          const updatedSelected =
            state.selectedEmail && (state.selectedEmail.threadId === threadId || state.selectedEmail.id === threadId)
              ? {
                  ...state.selectedEmail,
                  threadMessagesCount: threadData.messages.length,
                  snippet: threadData.snippet || state.selectedEmail.snippet,
                }
              : state.selectedEmail;

          return {
            activeThread: threadData,
            emails: updatedEmails,
            selectedEmail: updatedSelected,
            isLoadingThread: false,
          };
        });
      } else {
        set({ isLoadingThread: false });
      }
    } catch {
      set({ isLoadingThread: false });
    }
  },

  clearActiveThread: () => {
    set({ activeThread: null, isLoadingThread: false });
  },

  fetchFolderCounts: async () => {
    try {
      const res = await fetch('/api/mail/counts', { cache: 'no-store' });
      if (res.ok) {
        const data: MailCountsResult = await res.json();
        set({ folderCounts: data });
      }
    } catch {
      // Ignore count fetch errors gracefully
    }
  },

  markAsRead: async (id: string) => {
    clearMailboxCache();
    const email = get().emails.find((e) => e.id === id) || get().selectedEmail;
    if (!email || email.isRead) return;

    const previousIsRead = email.isRead;
    const previousLabels = [...email.labels];
    const previousFolderCounts = get().folderCounts;

    const hasOtherUnread = hasOtherUnreadMessagesInThread(email, get().emails, get().activeThread);
    const threadTransitionDelta = hasOtherUnread ? 0 : -1;

    const optimisticCounts = adjustOptimisticCounts(previousFolderCounts, email, -1, threadTransitionDelta);

    // Optimistic update in emails list, activeThread & counts
    const updatedEmails = get().emails.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          isRead: true,
          labels: e.labels.filter((l) => l !== 'UNREAD'),
        };
      }
      return e;
    });

    const selected = get().selectedEmail;
    const updatedSelected =
      selected && selected.id === id
        ? { ...selected, isRead: true, labels: selected.labels.filter((l) => l !== 'UNREAD') }
        : selected;

    const currentActiveThread = get().activeThread;
    let updatedActiveThread = currentActiveThread;
    if (currentActiveThread && currentActiveThread.messages) {
      updatedActiveThread = {
        ...currentActiveThread,
        messages: currentActiveThread.messages.map((m) =>
          m.id === id
            ? { ...m, isRead: true, labels: (m.labels || []).filter((l) => l !== 'UNREAD') }
            : m
        ),
      };
    }

    set({ emails: updatedEmails, selectedEmail: updatedSelected, activeThread: updatedActiveThread, folderCounts: optimisticCounts });

    try {
      const res = await fetch(`/api/mail/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server status ${res.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update read status';
      console.error(`[markAsRead Rollback]: ${msg}`);

      // Rollback optimistic update
      const rolledBackEmails = get().emails.map((e) => {
        if (e.id === id) {
          return {
            ...e,
            isRead: previousIsRead,
            labels: previousLabels,
          };
        }
        return e;
      });

      const currentSelected = get().selectedEmail;
      const rolledBackSelected =
        currentSelected && currentSelected.id === id
          ? { ...currentSelected, isRead: previousIsRead, labels: previousLabels }
          : currentSelected;

      set({ emails: rolledBackEmails, selectedEmail: rolledBackSelected, activeThread: currentActiveThread, folderCounts: previousFolderCounts });
      alert(`Unable to mark email as read in Gmail: ${msg}`);
    }
  },

  markAsUnread: async (id: string) => {
    clearMailboxCache();
    const email = get().emails.find((e) => e.id === id) || get().selectedEmail;
    if (!email || !email.isRead) return;

    const previousIsRead = email.isRead;
    const previousLabels = [...email.labels];
    const previousFolderCounts = get().folderCounts;

    const hasOtherUnread = hasOtherUnreadMessagesInThread(email, get().emails, get().activeThread);
    const threadTransitionDelta = hasOtherUnread ? 0 : 1;

    const optimisticCounts = adjustOptimisticCounts(previousFolderCounts, email, 1, threadTransitionDelta);

    // Optimistic update in emails list, activeThread & counts
    const updatedEmails = get().emails.map((e) => {
      if (e.id === id) {
        const labels = e.labels.includes('UNREAD') ? e.labels : [...e.labels, 'UNREAD'];
        return {
          ...e,
          isRead: false,
          labels,
        };
      }
      return e;
    });

    const selected = get().selectedEmail;
    const updatedSelected =
      selected && selected.id === id
        ? {
            ...selected,
            isRead: false,
            labels: selected.labels.includes('UNREAD') ? selected.labels : [...selected.labels, 'UNREAD'],
          }
        : selected;

    const currentActiveThread = get().activeThread;
    let updatedActiveThread = currentActiveThread;
    if (currentActiveThread && currentActiveThread.messages) {
      updatedActiveThread = {
        ...currentActiveThread,
        messages: currentActiveThread.messages.map((m) =>
          m.id === id
            ? {
                ...m,
                isRead: false,
                labels: (m.labels || []).includes('UNREAD') ? m.labels : [...(m.labels || []), 'UNREAD'],
              }
            : m
        ),
      };
    }

    set({ emails: updatedEmails, selectedEmail: updatedSelected, activeThread: updatedActiveThread, folderCounts: optimisticCounts });

    try {
      const res = await fetch(`/api/mail/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: false }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server status ${res.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update unread status';
      console.error(`[markAsUnread Rollback]: ${msg}`);

      // Rollback optimistic update
      const rolledBackEmails = get().emails.map((e) => {
        if (e.id === id) {
          return {
            ...e,
            isRead: previousIsRead,
            labels: previousLabels,
          };
        }
        return e;
      });

      const currentSelected = get().selectedEmail;
      const rolledBackSelected =
        currentSelected && currentSelected.id === id
          ? { ...currentSelected, isRead: previousIsRead, labels: previousLabels }
          : currentSelected;

      set({ emails: rolledBackEmails, selectedEmail: rolledBackSelected, activeThread: currentActiveThread, folderCounts: previousFolderCounts });
      alert(`Unable to mark email as unread in Gmail: ${msg}`);
    }
  },

  clearSelectedEmail: () => {
    set({ selectedEmail: null, selectedEmailId: null, activeThread: null, isLoadingThread: false });
  },

  syncMail: async () => {
    clearMailboxCache();
    set({ isSyncing: true, syncStatus: 'syncing' });
    try {
      await get().fetchFolderCounts();
      await get().fetchEmails(get().activeFolder, get().searchQuery, false, get().activeCategory, true);
    } finally {
      set({ isSyncing: false, syncStatus: activeEventSource ? 'live' : 'idle' });
    }
  },

  loadMore: async () => {
    const { nextPageToken, isLoading } = get();
    if (nextPageToken && !isLoading) {
      await get().fetchEmails(get().activeFolder, get().searchQuery, true, get().activeCategory);
    }
  },

  handleRealtimeGmailUpdate: async (data?: Record<string, unknown>) => {
    // 1. Immediately invalidate in-memory mailbox cache so any next fetch bypasses stale cache
    clearMailboxCache();

    if (data?.fullSyncRequired) {
      await get().syncMail();
      return;
    }

    // 2. Debounce rapid incoming push events (150ms window) to avoid redundant duplicate fetches
    if (sseUpdateDebounceTimer) clearTimeout(sseUpdateDebounceTimer);

    return new Promise<void>((resolve) => {
      pendingRealtimeResolvers.push(resolve);

      sseUpdateDebounceTimer = setTimeout(async () => {
        const currentResolvers = [...pendingRealtimeResolvers];
        pendingRealtimeResolvers = [];

        set({ syncStatus: 'syncing' });
        try {
          // Reconcile authoritative folder & category unread counts
          await get().fetchFolderCounts();
          // Refetch active folder/category view directly from Gmail with bypassCache = true
          await get().fetchEmails(get().activeFolder, get().searchQuery, false, get().activeCategory, true);

          // Realtime refetch for activeThread if currently open
          const currentThreadId = get().activeThread?.threadId || get().selectedEmail?.threadId;
          if (currentThreadId) {
            await get().fetchEmailThread(currentThreadId);
          }

          set({ syncStatus: 'updated' });
        } catch (err) {
          console.error('[MailStore]: Realtime update reconciliation failed:', err);
        } finally {
          if (updatedStatusTimer) clearTimeout(updatedStatusTimer);
          updatedStatusTimer = setTimeout(() => {
            set({ syncStatus: activeEventSource ? 'live' : 'idle' });
          }, 3000);
          currentResolvers.forEach((res) => res());
        }
      }, 150);
    });
  },

  connectRealtimeStream: () => {
    if (activeEventSource) return;
    if (typeof window === 'undefined') return;

    try {
      console.log('[MailStore]: Connecting to SSE stream /api/mail/stream...');
      const es = new EventSource('/api/mail/stream');
      activeEventSource = es;

      es.onopen = () => {
        console.log('[MailStore]: Real-time SSE stream connected.');
        set({ syncStatus: 'live' });
      };

      es.addEventListener('GMAIL_UPDATE', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[MailStore]: Received real-time GMAIL_UPDATE push event:', data);
          get().handleRealtimeGmailUpdate(data);
        } catch (parseErr) {
          console.error('[MailStore]: Error parsing SSE GMAIL_UPDATE payload:', parseErr);
        }
      });

      es.onerror = () => {
        console.warn('[MailStore]: SSE stream disconnected, reconnecting...');
        set({ syncStatus: 'reconnecting' });
      };
    } catch (err) {
      console.error('[MailStore]: Failed to establish SSE connection:', err);
    }
  },

  disconnectRealtimeStream: () => {
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
      console.log('[MailStore]: Disconnected SSE stream.');
    }
    if (updatedStatusTimer) {
      clearTimeout(updatedStatusTimer);
      updatedStatusTimer = null;
    }
    set({ syncStatus: 'idle' });
  },

  openCompose: (initialData) => {
    cancelComposeAnimation();
    set((state) => ({
      isComposeOpen: true,
      isTyping: false,
      composeDraft: initialData
        ? { ...initialDraft, ...initialData }
        : state.composeDraft,
    }));
  },

  closeCompose: () => {
    cancelComposeAnimation();
    set({ isComposeOpen: false, isTyping: false });
  },

  updateComposeDraft: (fields) =>
    set((state) => ({
      composeDraft: { ...state.composeDraft, ...fields },
    })),

  resetComposeDraft: () => {
    cancelComposeAnimation();
    set({ composeDraft: initialDraft, isComposeOpen: false, isTyping: false });
  },

  animateComposeFill: async (targetDraft: Partial<EmailDraft>, speedMs = 15) => {
    cancelComposeAnimation();
    const animId = currentAnimationId;

    const targetTo = targetDraft.to || '';
    const targetSubject = targetDraft.subject || '';
    const targetBody = targetDraft.body || '';

    // Open compose modal with target metadata (threadId, inReplyTo, references, draftId, etc.) and empty text fields
    set((state) => ({
      isComposeOpen: true,
      isTyping: true,
      composeDraft: {
        ...initialDraft,
        ...targetDraft,
        to: '',
        subject: '',
        body: '',
      },
    }));

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // 1. Type recipient 'to'
    for (let i = 1; i <= targetTo.length; i++) {
      if (currentAnimationId !== animId) {
        set({ isTyping: false });
        return;
      }
      set((state) => ({
        composeDraft: { ...state.composeDraft, to: targetTo.slice(0, i) },
      }));
      if (speedMs > 0) await delay(speedMs);
    }

    // 2. Type 'subject'
    for (let i = 1; i <= targetSubject.length; i++) {
      if (currentAnimationId !== animId) {
        set({ isTyping: false });
        return;
      }
      set((state) => ({
        composeDraft: { ...state.composeDraft, subject: targetSubject.slice(0, i) },
      }));
      if (speedMs > 0) await delay(speedMs);
    }

    // 3. Type 'body'
    for (let i = 1; i <= targetBody.length; i++) {
      if (currentAnimationId !== animId) {
        set({ isTyping: false });
        return;
      }
      set((state) => ({
        composeDraft: { ...state.composeDraft, body: targetBody.slice(0, i) },
      }));
      if (speedMs > 0) await delay(speedMs);
    }

    if (currentAnimationId === animId) {
      set((state) => ({
        isTyping: false,
        composeDraft: {
          ...state.composeDraft,
          to: targetTo,
          subject: targetSubject,
          body: targetBody,
        },
      }));
    } else {
      set({ isTyping: false });
    }
  },
}));

