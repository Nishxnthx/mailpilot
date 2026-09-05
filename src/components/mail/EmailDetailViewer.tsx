'use client';

import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Reply,
  Forward,
  Mail,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { useMailStore } from '@/stores/useMailStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/utils';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { Email } from '@/types/email';

export const EmailDetailViewer: React.FC = () => {
  const selectedEmail = useMailStore((state) => state.selectedEmail);
  const activeThread = useMailStore((state) => state.activeThread);
  const isLoadingDetail = useMailStore((state) => state.isLoadingDetail);
  const isLoadingThread = useMailStore((state) => state.isLoadingThread);
  const clearSelectedEmail = useMailStore((state) => state.clearSelectedEmail);
  const openCompose = useMailStore((state) => state.openCompose);
  const markAsRead = useMailStore((state) => state.markAsRead);
  const markAsUnread = useMailStore((state) => state.markAsUnread);

  // Map of messageId -> isExpanded boolean
  const [expandedMap, setExpandedMap] = React.useState<Record<string, boolean>>({});

  // Automatically mark email as read ONLY when detail is loaded & viewed
  React.useEffect(() => {
    if (selectedEmail && !selectedEmail.isRead) {
      markAsRead(selectedEmail.id);
    }
  }, [selectedEmail, markAsRead]);

  // Set default expansion: latest message expanded, older messages collapsed (preserving user toggles)
  React.useEffect(() => {
    if (activeThread && activeThread.messages.length > 0) {
      setExpandedMap((prev) => {
        const map: Record<string, boolean> = { ...prev };
        activeThread.messages.forEach((msg, idx) => {
          if (map[msg.id] === undefined) {
            map[msg.id] = idx === activeThread.messages.length - 1;
          }
        });
        return map;
      });
    }
  }, [activeThread]);

  if (isLoadingDetail || (selectedEmail?.threadId && isLoadingThread && !activeThread)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-950/40 select-none">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-medium">Loading conversation thread from Gmail...</p>
      </div>
    );
  }

  if (!selectedEmail) return null;

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReplyMessage = (msg: Email) => {
    const senderStr = msg.from.name
      ? `${msg.from.name} <${msg.from.email}>`
      : msg.from.email;
    const rawBody = msg.bodyText || msg.snippet || '';
    const quotedBody = rawBody.split('\n').map((line) => `> ${line}`).join('\n');
    const replySubject = /^re:\s*/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`;
    const replyMessageId = msg.messageId || msg.id;

    openCompose({
      to: msg.from.email,
      subject: replySubject,
      body: `\n\nOn ${formatDate(msg.date)}, ${senderStr} wrote:\n${quotedBody}`,
      threadId: msg.threadId,
      inReplyTo: replyMessageId,
      references: replyMessageId,
    });
  };

  const handleForwardMessage = (msg: Email) => {
    const senderStr = msg.from.name
      ? `${msg.from.name} <${msg.from.email}>`
      : msg.from.email;
    const toStr = msg.to
      .map((t) => (t.name ? `${t.name} <${t.email}>` : t.email))
      .join(', ');
    const rawBody = msg.bodyText || msg.snippet || '';
    const fwdSubject = /^fwd:\s*/i.test(msg.subject) ? msg.subject : `Fwd: ${msg.subject}`;
    const fwdHeader = `\n\n---------- Forwarded message ---------\nFrom: ${senderStr}\nDate: ${formatDate(msg.date)}\nSubject: ${msg.subject}\nTo: ${toStr}\n\n`;

    openCompose({
      to: '',
      subject: fwdSubject,
      body: `${fwdHeader}${rawBody}`,
      threadId: undefined,
      inReplyTo: undefined,
      references: undefined,
    });
  };

  // Determine thread messages to display (fallback to selectedEmail if single message)
  const threadMessages =
    activeThread && activeThread.messages.length > 0
      ? activeThread.messages
      : [selectedEmail];

  const hasMultipleMessages = threadMessages.length > 1;
  const latestMessage = threadMessages[threadMessages.length - 1];

  return (
    <div className="flex-1 flex flex-col bg-slate-950/60 overflow-hidden select-text">
      {/* Top Action Bar */}
      <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/90 select-none shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelectedEmail}
          className="gap-1.5 text-slate-400 hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedEmail.isRead) {
                markAsUnread(selectedEmail.id);
              } else {
                markAsRead(selectedEmail.id);
              }
            }}
            className="gap-1.5 text-xs text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-slate-100"
          >
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span>{selectedEmail.isRead ? 'Mark as Unread' : 'Mark as Read'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReplyMessage(latestMessage)}
            className="gap-1.5 text-xs text-blue-400 border-blue-800/60 hover:bg-blue-950/40"
          >
            <Reply className="h-3.5 w-3.5" />
            <span>Reply</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleForwardMessage(latestMessage)}
            className="gap-1.5 text-xs text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-slate-100"
          >
            <Forward className="h-3.5 w-3.5" />
            <span>Forward</span>
          </Button>
        </div>
      </div>

      {/* Main Detail Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Thread Header */}
        <div className="space-y-3 pb-4 border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold text-slate-100 leading-tight">
              {activeThread?.subject || selectedEmail.subject}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {hasMultipleMessages && (
                <Badge
                  variant="outline"
                  className="bg-blue-950/60 text-blue-400 border-blue-800/60 flex items-center gap-1 py-0.5 px-2"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>{threadMessages.length} messages</span>
                </Badge>
              )}
              {selectedEmail.labels.map((label) => (
                <Badge key={label} variant="outline" className="text-[10px] uppercase">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Thread Message List (Chronological Order) */}
        <div className="space-y-4">
          {threadMessages.map((msg, index) => {
            const isExpanded = hasMultipleMessages
              ? expandedMap[msg.id] ?? index === threadMessages.length - 1
              : true;
            const sanitizedHtml = msg.bodyHtml ? sanitizeHtml(msg.bodyHtml) : null;
            const senderInitial = msg.from.name
              ? msg.from.name.charAt(0).toUpperCase()
              : msg.from.email.charAt(0).toUpperCase();

            return (
              <div
                key={msg.id}
                className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden transition-all duration-150"
              >
                {/* Collapsible Header Bar */}
                {hasMultipleMessages ? (
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpand(msg.id)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-850/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0">
                        {senderInitial}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {msg.from.name || msg.from.email}
                          </span>
                          {!msg.isRead && (
                            <Badge className="bg-amber-950/60 text-amber-400 border-amber-800/60 text-[9px] py-0 px-1">
                              Unread
                            </Badge>
                          )}
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {msg.snippet || '(No snippet preview)'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(msg.date)}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                ) : (
                  /* Single Message Header */
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0">
                        {senderInitial}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-200">
                          {msg.from.name || msg.from.email}
                        </div>
                        <div className="text-[11px] text-slate-500">{msg.from.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{formatDate(msg.date)}</span>
                    </div>
                  </div>
                )}

                {/* Message Body & Actions (when expanded) */}
                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-slate-800/40">
                    {/* Rendered HTML or Text Body */}
                    <div className="gmail-body-container">
                      {sanitizedHtml ? (
                        <div
                          className="gmail-body-content"
                          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap font-sans text-slate-800 text-sm leading-relaxed">
                          {msg.bodyText || msg.snippet || '(Empty Body)'}
                        </div>
                      )}
                    </div>

                    {/* Per-Message Action Buttons (in multi-message thread) */}
                    {hasMultipleMessages && (
                      <div className="pt-3 border-t border-slate-800/60 flex items-center gap-2 justify-end select-none">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReplyMessage(msg)}
                          className="gap-1.5 text-xs text-blue-400 hover:bg-blue-950/40 h-7 px-2.5"
                        >
                          <Reply className="h-3.5 w-3.5" />
                          <span>Reply</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleForwardMessage(msg)}
                          className="gap-1.5 text-xs text-slate-400 hover:text-slate-200 h-7 px-2.5"
                        >
                          <Forward className="h-3.5 w-3.5" />
                          <span>Forward</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
