'use client';

import React from 'react';
import { Mail, Star, Loader2, RefreshCw, AlertCircle, Inbox, Archive, Trash2, MailOpen, GripVertical } from 'lucide-react';
import { useMailStore } from '@/stores/useMailStore';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/utils';
import { cn } from '@/lib/utils/utils';

export const EmailList: React.FC = () => {
  const emails = useMailStore((state) => state.emails);
  const readFilter = useMailStore((state) => state.readFilter);
  const isLoading = useMailStore((state) => state.isLoading);
  const error = useMailStore((state) => state.error);
  const nextPageToken = useMailStore((state) => state.nextPageToken);
  const setSelectedEmailId = useMailStore((state) => state.setSelectedEmailId);
  const markAsRead = useMailStore((state) => state.markAsRead);
  const markAsUnread = useMailStore((state) => state.markAsUnread);
  const loadMore = useMailStore((state) => state.loadMore);
  const syncMail = useMailStore((state) => state.syncMail);
  const activeFolder = useMailStore((state) => state.activeFolder);
  const openCompose = useMailStore((state) => state.openCompose);

  const filteredEmails = emails.filter((email) => {
    if (readFilter === 'unread') return !email.isRead;
    if (readFilter === 'read') return email.isRead;
    return true;
  });

  const handleItemClick = (email: (typeof emails)[0]) => {
    if (activeFolder === 'drafts' || email.folder === 'drafts' || email.labels.includes('DRAFT')) {
      openCompose({
        draftId: email.draftId || email.id,
        to: email.to.map((t) => t.email).join(', '),
        cc: email.cc?.map((t) => t.email).join(', '),
        bcc: email.bcc?.map((t) => t.email).join(', '),
        subject: email.subject === '(No Subject)' ? '' : email.subject,
        body: email.bodyText || '',
        threadId: email.threadId,
      });
    } else {
      setSelectedEmailId(email.id);
    }
  };

  if (isLoading && emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 space-y-3 select-none">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Fetching real Gmail messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 select-none">
        <div className="h-12 w-12 rounded-xl bg-red-950/50 border border-red-900/50 flex items-center justify-center text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-200">Unable to load messages</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">{error}</p>
        </div>
        <Button onClick={() => syncMail()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  if (filteredEmails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 text-slate-500 select-none">
        <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
          <Inbox className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-300">
            No {readFilter !== 'all' ? readFilter : ''} emails in {activeFolder}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Your Gmail mailbox in this view is currently clear.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Email List Scroll Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {filteredEmails.map((email) => {
          const senderName = email.from.name || email.from.email || 'Unknown';
          const isUnread = !email.isRead;

          return (
            <div
              key={email.id}
              onClick={() => handleItemClick(email)}
              className={cn(
                'group h-11 px-3 sm:px-4 cursor-pointer transition-colors flex items-center gap-2.5 select-none text-xs border-b border-[#1b2230]',
                isUnread
                  ? 'bg-[#151b26] hover:bg-[#1e2636]'
                  : 'bg-[#0c1017] hover:bg-[#141a24]'
              )}
            >
              {/* Drag Handle, Unread Indicator, Checkbox & Star */}
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <GripVertical className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity cursor-grab" />
                
                {isUnread ? (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Unread message" />
                ) : (
                  <span className="w-2 h-2 shrink-0 opacity-0" />
                )}

                <input
                  type="checkbox"
                  className="mp-checkbox"
                />
                <Star
                  className={cn(
                    'h-4 w-4 transition-colors cursor-pointer',
                    email.isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-600 group-hover:text-slate-400'
                  )}
                />
              </div>

              {/* Sender */}
              <div className="w-36 sm:w-44 shrink-0 truncate">
                <span className={cn(isUnread ? 'text-white font-bold' : 'text-slate-300 font-normal')}>
                  {senderName}
                </span>
              </div>

              {/* Subject & Snippet Inline */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate">
                <span className={cn(isUnread ? 'text-white font-bold' : 'text-slate-400 font-normal')}>
                  {email.subject}
                </span>
                <span className={cn('font-normal text-[11px] truncate', isUnread ? 'text-slate-400' : 'text-slate-600')}>
                  - {email.snippet}
                </span>
              </div>

              {/* Action Toolbar on Hover & Timestamp */}
              <div className="shrink-0 flex items-center gap-2">
                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (email.isRead) markAsUnread(email.id);
                      else markAsRead(email.id);
                    }}
                    title={email.isRead ? 'Mark as unread' : 'Mark as read'}
                    className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-[#151b26] transition-colors"
                  >
                    {email.isRead ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <span className={cn('text-[11px] shrink-0', isUnread ? 'text-blue-400 font-bold' : 'text-slate-500 font-normal')}>
                  {formatDate(email.date)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
