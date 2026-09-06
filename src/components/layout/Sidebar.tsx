'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Inbox,
  Send,
  FileText,
  Trash2,
  Star,
  Archive,
  Clock,
  AlertOctagon,
  Tag,
  Users,
  Megaphone,
  Bell,
  MessageSquare,
  Folder,
} from 'lucide-react';
import { useMailStore } from '@/stores/useMailStore';
import { EmailFolder, EmailCategory } from '@/types/email';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

interface FolderNavItem {
  id: EmailFolder;
  label: string;
  icon: React.ElementType;
}

const folderItems: FolderNavItem[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'trash', label: 'Trash', icon: Trash2 },
  { id: 'archive', label: 'Archive', icon: Archive },
];

interface CategoryNavItem {
  id: EmailCategory;
  label: string;
  icon: React.ElementType;
}

const categoryItems: CategoryNavItem[] = [
  { id: 'primary', label: 'Primary', icon: Tag },
  { id: 'promotions', label: 'Promotions', icon: Megaphone },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'updates', label: 'Updates', icon: Bell },
  { id: 'forums', label: 'Forums', icon: MessageSquare },
];

export const Sidebar: React.FC = () => {
  const activeFolder = useMailStore((state) => state.activeFolder);
  const activeCategory = useMailStore((state) => state.activeCategory);
  const setActiveFolder = useMailStore((state) => state.setActiveFolder);
  const setActiveCategory = useMailStore((state) => state.setActiveCategory);
  const openCompose = useMailStore((state) => state.openCompose);
  const folderCounts = useMailStore((state) => state.folderCounts);
  const fetchFolderCounts = useMailStore((state) => state.fetchFolderCounts);

  useEffect(() => {
    fetchFolderCounts();
  }, [fetchFolderCounts]);

  const getFolderCount = (id: EmailFolder): number | null => {
    if (!folderCounts) return null;
    switch (id) {
      case 'inbox':
        return (
          folderCounts.categories?.primary?.threadsUnread ??
          folderCounts.categories?.primary?.unread ??
          folderCounts.inbox?.threadsUnread ??
          folderCounts.inbox?.unread ??
          null
        );
      case 'starred':
        return folderCounts.starred?.threadsTotal ?? folderCounts.starred?.total ?? null;
      case 'sent':
        return folderCounts.sent?.threadsTotal ?? folderCounts.sent?.total ?? null;
      case 'drafts':
        return folderCounts.drafts?.threadsTotal ?? folderCounts.drafts?.total ?? null;
      case 'trash':
        return folderCounts.trash?.threadsTotal ?? folderCounts.trash?.total ?? null;
      default:
        return null;
    }
  };

  const getCategoryCount = (id: EmailCategory): number | null => {
    if (!folderCounts?.categories) return null;
    switch (id) {
      case 'primary':
        return folderCounts.categories.primary?.threadsUnread ?? folderCounts.categories.primary?.unread ?? null;
      case 'promotions':
        return folderCounts.categories.promotions?.threadsUnread ?? folderCounts.categories.promotions?.unread ?? null;
      case 'social':
        return folderCounts.categories.social?.threadsUnread ?? folderCounts.categories.social?.unread ?? null;
      case 'updates':
        return folderCounts.categories.updates?.threadsUnread ?? folderCounts.categories.updates?.unread ?? null;
      case 'forums':
        return folderCounts.categories.forums?.threadsUnread ?? folderCounts.categories.forums?.unread ?? null;
      default:
        return null;
    }
  };

  return (
    <aside className="w-60 border-r border-[#1b2230] bg-[#0e121c] p-3 flex flex-col justify-between select-none overflow-y-auto shrink-0">
      <div className="space-y-6">
        {/* Compose Button */}
        <Button
          onClick={() => openCompose()}
          className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/20 text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Message</span>
        </Button>

        {/* Main Folder Navigation */}
        <div className="space-y-1">
          {folderItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeFolder === item.id;
            const count = getFolderCount(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveFolder(item.id);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-500 rounded-r-full" />
                )}
                <div className="flex items-center gap-3">
                  <Icon className={cn('h-4 w-4', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
                  <span>{item.label}</span>
                </div>
                {count !== null && count > 0 && (
                  <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded-md', isActive ? 'bg-blue-900/40 text-blue-300' : 'text-slate-400')}>
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Categories Section */}
        <div className="space-y-2 pt-2 border-t border-slate-850">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Categories
          </div>
          <div className="space-y-1">
            {categoryItems.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeFolder === 'inbox' && activeCategory === cat.id;
              const count = getCategoryCount(cat.id);

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveFolder('inbox');
                    setActiveCategory(cat.id);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
                    <span>{cat.label}</span>
                  </div>
                  {count !== null && count > 0 && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-blue-400')}>
                      {count.toLocaleString()} new
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Gmail User Labels Section */}
        {folderCounts?.userLabels && folderCounts.userLabels.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-850">
            <div className="px-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Labels</span>
              <Plus className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-200" />
            </div>
            <div className="space-y-1">
              {folderCounts.userLabels.map((lbl) => (
                <div
                  key={lbl.id}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Folder className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{lbl.name}</span>
                  </div>
                  {lbl.unread > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {lbl.unread}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-850 text-xs text-slate-500 space-y-1.5">
        <p className="text-[10px] text-center leading-relaxed">
          MailPilot AI • Real Gmail Data
        </p>
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <Link href="/privacy" className="hover:text-blue-400 underline transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-blue-400 underline transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </aside>
  );
};
