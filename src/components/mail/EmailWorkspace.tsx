'use client';

import React from 'react';
import {
  Mail,
  Filter,
  RefreshCw,
  Plug,
  Check,
  AlertTriangle,
  Tag,
  Megaphone,
  Users,
  Bell,
  MessageSquare,
  MoreVertical,
} from 'lucide-react';
import { useMailStore, ReadFilterType } from '@/stores/useMailStore';
import { EmailCategory } from '@/types/email';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailList } from './EmailList';
import { EmailDetailViewer } from './EmailDetailViewer';
import { cn } from '@/lib/utils/utils';

const CATEGORIES: { id: EmailCategory; label: string; icon: React.ElementType }[] = [
  { id: 'primary', label: 'Primary', icon: Tag },
  { id: 'all', label: 'All', icon: Tag },
  { id: 'promotions', label: 'Promotions', icon: Megaphone },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'updates', label: 'Updates', icon: Bell },
  { id: 'forums', label: 'Forums', icon: MessageSquare },
];

const READ_FILTERS: { id: ReadFilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

export const EmailWorkspace: React.FC = () => {
  const activeFolder = useMailStore((state) => state.activeFolder);
  const activeCategory = useMailStore((state) => state.activeCategory);
  const setActiveCategory = useMailStore((state) => state.setActiveCategory);
  const readFilter = useMailStore((state) => state.readFilter);
  const setReadFilter = useMailStore((state) => state.setReadFilter);
  const searchQuery = useMailStore((state) => state.searchQuery);
  const isGmailConnected = useMailStore((state) => state.isGmailConnected);
  const selectedEmailId = useMailStore((state) => state.selectedEmailId);
  const isSyncing = useMailStore((state) => state.isSyncing);
  const syncStatus = useMailStore((state) => state.syncStatus);
  const syncMail = useMailStore((state) => state.syncMail);
  const emails = useMailStore((state) => state.emails);
  const nextPageToken = useMailStore((state) => state.nextPageToken);
  const resultSizeEstimate = useMailStore((state) => state.resultSizeEstimate);
  const folderCounts = useMailStore((state) => state.folderCounts);
  const isLoading = useMailStore((state) => state.isLoading);
  const loadMore = useMailStore((state) => state.loadMore);

  const folderTitle = activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1);

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/google';
  };

  const getCategoryCount = (id: EmailCategory): number | null => {
    if (!folderCounts) return null;
    switch (id) {
      case 'primary':
        return folderCounts.categories?.primary?.threadsUnread ?? folderCounts.categories?.primary?.unread ?? null;
      case 'all':
        return folderCounts.inbox?.threadsUnread ?? folderCounts.inbox?.unread ?? null;
      case 'promotions':
        return folderCounts.categories?.promotions?.threadsUnread ?? folderCounts.categories?.promotions?.unread ?? null;
      case 'social':
        return folderCounts.categories?.social?.threadsUnread ?? folderCounts.categories?.social?.unread ?? null;
      case 'updates':
        return folderCounts.categories?.updates?.threadsUnread ?? folderCounts.categories?.updates?.unread ?? null;
      case 'forums':
        return folderCounts.categories?.forums?.threadsUnread ?? folderCounts.categories?.forums?.unread ?? null;
      default:
        return null;
    }
  };

  const renderSyncIndicator = () => {
    if (syncStatus === 'live') {
      return (
        <Badge variant="outline" className="gap-1.5 bg-emerald-950/40 text-emerald-400 border-emerald-800/50 text-[11px] font-medium py-0.5 px-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live</span>
        </Badge>
      );
    }
    if (syncStatus === 'updated') {
      return (
        <Badge variant="outline" className="gap-1.5 bg-emerald-950/40 text-emerald-300 border-emerald-800/50 text-[11px] font-medium py-0.5 px-2">
          <Check className="h-3 w-3 text-emerald-400" />
          <span>Updated</span>
        </Badge>
      );
    }
    if (syncStatus === 'reconnecting') {
      return (
        <Badge variant="outline" className="gap-1.5 bg-amber-950/40 text-amber-400 border-amber-800/50 text-[11px] font-medium py-0.5 px-2">
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          <span>Reconnecting</span>
        </Badge>
      );
    }
    if (syncStatus === 'syncing' || isSyncing) {
      return (
        <Badge variant="outline" className="gap-1.5 bg-blue-950/40 text-blue-400 border-blue-800/50 text-[11px] font-medium py-0.5 px-2">
          <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
          <span>Syncing...</span>
        </Badge>
      );
    }
    return null;
  };

  if (isGmailConnected === false) {
    return (
      <main className="flex-1 flex flex-col bg-[#0a0d14] overflow-hidden p-3">
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-xl w-full text-center space-y-6 bg-[#0e121c] p-8 rounded-2xl border border-[#1b2230] backdrop-blur">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                Connect your Gmail Account
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connect your Gmail account to view your live Inbox, execute AI searches, and perform smart actions.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleConnectGmail}
                className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-6 shadow-md rounded-xl"
              >
                <Plug className="h-4 w-4" />
                <span>Connect Gmail Account</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (selectedEmailId) {
    return (
      <main className="flex-1 flex flex-col bg-[#0a0d14] overflow-hidden p-2">
        <EmailDetailViewer />
      </main>
    );
  }

  let paginationTotal = emails.length;
  if (!searchQuery && folderCounts) {
    if (activeFolder === 'inbox') {
      if (activeCategory === 'all') {
        paginationTotal = folderCounts.inbox?.threadsTotal ?? folderCounts.inbox?.total ?? (resultSizeEstimate || emails.length);
      } else if (activeCategory === 'primary') {
        paginationTotal = folderCounts.categories.primary?.threadsTotal ?? folderCounts.categories.primary?.total ?? (resultSizeEstimate || emails.length);
      } else if (activeCategory === 'promotions') {
        paginationTotal = folderCounts.categories.promotions?.threadsTotal ?? folderCounts.categories.promotions?.total ?? (resultSizeEstimate || emails.length);
      } else if (activeCategory === 'social') {
        paginationTotal = folderCounts.categories.social?.threadsTotal ?? folderCounts.categories.social?.total ?? (resultSizeEstimate || emails.length);
      } else if (activeCategory === 'updates') {
        paginationTotal = folderCounts.categories.updates?.threadsTotal ?? folderCounts.categories.updates?.total ?? (resultSizeEstimate || emails.length);
      } else if (activeCategory === 'forums') {
        paginationTotal = folderCounts.categories.forums?.threadsTotal ?? folderCounts.categories.forums?.total ?? (resultSizeEstimate || emails.length);
      }
    } else if (activeFolder === 'sent') {
      paginationTotal = folderCounts.sent?.threadsTotal ?? folderCounts.sent?.total ?? (resultSizeEstimate || emails.length);
    } else if (activeFolder === 'drafts') {
      paginationTotal = folderCounts.drafts?.threadsTotal ?? folderCounts.drafts?.total ?? (resultSizeEstimate || emails.length);
    } else if (activeFolder === 'starred') {
      paginationTotal = folderCounts.starred?.threadsTotal ?? folderCounts.starred?.total ?? (resultSizeEstimate || emails.length);
    } else if (activeFolder === 'trash') {
      paginationTotal = folderCounts.trash?.threadsTotal ?? folderCounts.trash?.total ?? (resultSizeEstimate || emails.length);
    } else if (activeFolder === 'archive') {
      paginationTotal = folderCounts.archive?.threadsTotal ?? folderCounts.archive?.total ?? (resultSizeEstimate || emails.length);
    }
  } else if (typeof resultSizeEstimate === 'number' && resultSizeEstimate > 0) {
    paginationTotal = resultSizeEstimate;
  }

  const paginationRange = emails.length > 0 ? `1–${emails.length} of ${paginationTotal.toLocaleString()}` : '0 emails';

  return (
    <main className="flex-1 flex flex-col bg-[#0a0d14] overflow-hidden p-2">
      <div className="flex-1 flex flex-col bg-[#0e121c] rounded-2xl border border-[#1b2230] overflow-hidden">
        {/* Workspace Top Toolbar */}
        <div className="h-12 border-b border-[#1b2230] px-4 flex items-center justify-between bg-[#0b0e14]/50 select-none shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="mp-checkbox"
            />
            <h1 className="text-sm font-bold text-slate-100">{folderTitle}</h1>

            {/* Read / Unread Filter Pills */}
            <div className="flex items-center gap-0.5 bg-[#0a0d14] p-0.5 rounded-lg border border-[#1b2230]">
              {READ_FILTERS.map((rf) => {
                const isActive = readFilter === rf.id;
                return (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => setReadFilter(rf.id)}
                    className={cn(
                      'px-2.5 py-0.5 text-[11px] font-medium rounded-md transition-all',
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {rf.label}
                  </button>
                );
              })}
            </div>

            {searchQuery && (
              <Badge variant="outline" className="gap-1 bg-blue-950/40 text-blue-400 border-blue-800/50 text-[11px]">
                <Filter className="h-3 w-3" />
                <span>&quot;{searchQuery}&quot;</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            {renderSyncIndicator()}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => syncMail()}
              disabled={isSyncing}
              className="h-8 text-slate-400 hover:text-slate-200 gap-1.5 text-xs px-2"
              title="Refresh Mail"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            </Button>

            <span className="font-medium text-[11px] text-slate-400">
              {paginationRange}
            </span>

            {/* Top Toolbar Load More Button */}
            {nextPageToken && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMore()}
                disabled={isLoading}
                className="h-7 px-2.5 text-xs text-blue-400 hover:text-blue-300 border-blue-800/60 bg-blue-950/40 hover:bg-blue-900/50 gap-1.5 rounded-lg transition-colors"
                title="Load next page of messages from Gmail"
              >
                {isLoading ? <RefreshCw className="h-3 w-3 animate-spin text-blue-400" /> : null}
                <span>Load More</span>
              </Button>
            )}
          </div>
        </div>

        {/* Category Sub-Tabs */}
        {activeFolder === 'inbox' && (
          <div className="border-b border-slate-850 bg-slate-950/40 px-4 flex items-center gap-1 select-none overflow-x-auto shrink-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              const count = getCategoryCount(cat.id);

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'py-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap',
                    isActive
                      ? 'border-blue-500 text-blue-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                  {count !== null && count > 0 && (
                    <span className="ml-1 text-[10px] font-bold bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded-full">
                      {count.toLocaleString()} new
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Main Email List */}
        <EmailList />
      </div>
    </main>
  );
};
