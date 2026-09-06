'use client';

import React, { useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  CornerDownLeft,
  X,
  Command,
  Loader2,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Compass,
} from 'lucide-react';
import { useCopilotStore, StagedSendAction, TimelineStep } from '@/stores/useCopilotStore';
import { useMailStore } from '@/stores/useMailStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/utils';

export const CopilotPanelPlaceholder: React.FC = () => {
  const isCopilotOpen = useCopilotStore((state) => state.isCopilotOpen);
  const setCopilotOpen = useCopilotStore((state) => state.setCopilotOpen);
  const promptInput = useCopilotStore((state) => state.promptInput);
  const setPromptInput = useCopilotStore((state) => state.setPromptInput);
  const messages = useCopilotStore((state) => state.messages);
  const status = useCopilotStore((state) => state.status);
  const sendMessage = useCopilotStore((state) => state.sendMessage);
  const stagedActionPreview = useCopilotStore((state) => state.stagedActionPreview);
  const confirmSendEmail = useCopilotStore((state) => state.confirmSendEmail);
  const cancelActionPreview = useCopilotStore((state) => state.cancelActionPreview);

  const folderCounts = useMailStore((state) => state.folderCounts);
  const emails = useMailStore((state) => state.emails);
  const selectedEmail = useMailStore((state) => state.selectedEmail);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (!isCopilotOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || status === 'thinking' || status === 'executing') return;
    sendMessage();
  };

  const handleQuickPrompt = (text: string) => {
    if (status === 'thinking' || status === 'executing') return;
    sendMessage(text);
  };

  // Dynamic Greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  // Real Mailbox Insight Counts from useMailStore
  const inboxCountVal = folderCounts?.inbox?.threadsTotal ?? folderCounts?.inbox?.total ?? emails.length;
  const priorityCountVal =
    folderCounts?.categories?.primary?.threadsUnread ??
    folderCounts?.categories?.primary?.unread ??
    folderCounts?.inbox?.threadsUnread ??
    0;

  const inboxDisplayCount = typeof inboxCountVal === 'number' ? inboxCountVal.toLocaleString() : '0';
  const priorityDisplayCount = typeof priorityCountVal === 'number' ? priorityCountVal.toLocaleString() : '0';

  // Context-Aware AI Commands
  const commands = selectedEmail
    ? [
        {
          symbol: '✦',
          accentColor: '#60a5fa',
          title: 'Summarize this email',
          subtitle: `Get key takeaways from "${selectedEmail.subject}"`,
          prompt: `Summarize the email with subject "${selectedEmail.subject}"`,
        },
        {
          symbol: '◉',
          accentColor: '#34d399',
          title: 'Find unread',
          subtitle: 'Show emails that need attention',
          prompt: 'Show unread emails in inbox',
        },
        {
          symbol: '⌕',
          accentColor: '#fbbf24',
          title: 'Search my emails',
          subtitle: 'Find anything using natural language',
          prompt: 'Search my emails',
        },
        {
          symbol: '↗',
          accentColor: '#c084fc',
          title: 'Draft a reply',
          subtitle: `Create an AI reply to ${selectedEmail.from.name || selectedEmail.from.email}`,
          prompt: `Draft a reply to ${selectedEmail.from.email}`,
        },
      ]
    : [
        {
          symbol: '✦',
          accentColor: '#60a5fa',
          title: 'Summarize inbox',
          subtitle: 'Get a quick overview of important emails',
          prompt: 'Summarize the latest emails in inbox',
        },
        {
          symbol: '◉',
          accentColor: '#34d399',
          title: 'Find unread',
          subtitle: 'Show emails that need attention',
          prompt: 'Show unread emails in inbox',
        },
        {
          symbol: '⌕',
          accentColor: '#fbbf24',
          title: 'Search my emails',
          subtitle: 'Find anything using natural language',
          prompt: 'Search emails in inbox',
        },
        {
          symbol: '↗',
          accentColor: '#c084fc',
          title: 'Draft a reply',
          subtitle: 'Create a response with AI',
          prompt: 'Compose an email',
        },
      ];

  const renderTimelineStep = (step: TimelineStep, idx: number) => {
    if (
      !step.label ||
      step.label.startsWith('Tool selected:') ||
      step.label.startsWith('Executing') ||
      step.label.startsWith('Dispatched tool action') ||
      step.label === 'Understanding request'
    ) {
      return null;
    }

    return (
      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-400 py-0.5">
        <div className="pt-0.5 shrink-0">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-300 truncate">{step.label}</div>
        </div>
      </div>
    );
  };

  const renderActionPreviewCard = (action: StagedSendAction) => {
    return (
      <div className="mt-3 bg-slate-900 border border-amber-500/40 rounded-xl p-3.5 space-y-2.5 shadow-lg select-none">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Action Preview: Confirm Send</span>
          </div>
          <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300">
            Human Confirmation Required
          </Badge>
        </div>

        <div className="space-y-1 text-xs text-slate-300">
          <div>
            <span className="text-slate-500 font-medium">To:</span> {action.to}
          </div>
          {action.cc && (
            <div>
              <span className="text-slate-500 font-medium">CC:</span> {action.cc}
            </div>
          )}
          {action.bcc && (
            <div>
              <span className="text-slate-500 font-medium">BCC:</span> {action.bcc}
            </div>
          )}
          <div>
            <span className="text-slate-500 font-medium">Subject:</span> {action.subject}
          </div>
          <div className="bg-slate-950 p-2 rounded-lg text-[11px] text-slate-400 line-clamp-3 font-mono leading-relaxed">
            {action.body}
          </div>
        </div>

        <div className="pt-1 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => confirmSendEmail(action)}
            disabled={status === 'executing'}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1.5 text-xs h-8"
          >
            {status === 'executing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Confirm & Send via Gmail</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={cancelActionPreview}
            disabled={status === 'executing'}
            className="text-slate-400 hover:text-slate-200 text-xs h-8"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const displayMessages = messages.filter((m) => m.id !== 'welcome');

  return (
    <aside className="w-80 sm:w-96 border-l border-[#1b2230] bg-[#0e121c] flex flex-col justify-between select-none shrink-0 h-full">
      {/* 1. COPILOT HEADER */}
      <div className="h-14 border-b border-[#1b2230] px-4 flex items-center justify-between bg-[#0e121c] select-none shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>MailPilot AI</span>
            </h2>
            <p className="text-[10px] text-slate-400">Your email copilot</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCopilotOpen(false)}
          aria-label="Close AI Copilot panel"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. MAIN SCROLLABLE BODY */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
        {/* AI COMMAND CENTER DASHBOARD */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-3.5 shadow-inner">
          {/* GREETING SECTION */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                <span>✦ {getGreeting()}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight mt-0.5">
                What should we do?
              </h3>
            </div>
            <div className="h-6 w-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
              ✦
            </div>
          </div>

          {/* MAILBOX INSIGHT CARDS */}
          <div className="grid grid-cols-2 gap-2">
            {/* Card 1: INBOX */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-400">
                <span className="flex items-center gap-1">✦ INBOX</span>
              </div>
              <div className="my-1">
                <div className="text-base font-extrabold text-slate-100 tracking-tight">
                  {inboxDisplayCount}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">emails</div>
              </div>
            </div>

            {/* Card 2: PRIORITY */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                <span className="flex items-center gap-1">◉ PRIORITY</span>
              </div>
              <div className="my-1">
                <div className="text-base font-extrabold text-slate-100 tracking-tight">
                  {priorityDisplayCount}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">need you</div>
              </div>
            </div>
          </div>

          {/* AI COMMANDS */}
          <div className="space-y-2 pt-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
              AI Commands
            </div>

            <div className="space-y-1.5">
              {commands.map((cmd, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickPrompt(cmd.prompt)}
                  disabled={status === 'thinking' || status === 'executing'}
                  className="w-full p-2.5 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/90 hover:border-blue-500/40 rounded-xl flex items-center justify-between text-left transition-all duration-150 group disabled:opacity-50"
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: cmd.accentColor }}>
                      {cmd.symbol}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                        {cmd.title}
                      </div>
                      <div className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">
                        {cmd.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-transform font-mono shrink-0">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CHAT MESSAGES STREAM */}
        {displayMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col space-y-1.5 text-xs',
                isUser ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'p-3 rounded-2xl max-w-[90%] space-y-2 leading-relaxed',
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                )}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 mb-1 select-none">
                    <Bot className="h-3.5 w-3.5" />
                    <span>MailPilot Copilot</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Render AI Activity Timeline */}
                {!isUser && msg.timeline && msg.timeline.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 select-none">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      AI Timeline
                    </div>
                    {msg.timeline.map((step, sIdx) => renderTimelineStep(step, sIdx))}
                  </div>
                )}
              </div>

              {!isUser && msg.actionPreview && renderActionPreviewCard(msg.actionPreview)}
            </div>
          );
        })}

        {/* Global Active Action Preview */}
        {stagedActionPreview && !displayMessages.some((m) => m.actionPreview === stagedActionPreview) && (
          renderActionPreviewCard(stagedActionPreview)
        )}

        {/* Loading Indicator inside chat stream */}
        {(status === 'thinking' || status === 'executing') && (
          <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span>MailPilot is working...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. AI STATUS ROW */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-2 font-medium">
          {status === 'idle' && (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-slate-300 font-semibold tracking-wide">✓ READY</span>
            </>
          )}
          {(status === 'thinking' || status === 'executing') && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
              <span className="text-blue-400 font-semibold tracking-wide">● WORKING...</span>
            </>
          )}
          {status === 'error' && (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-red-400 font-semibold tracking-wide">⚠ ERROR</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          {status === 'idle' ? 'READY' : 'WORKING'}
        </span>
      </div>

      {/* 4. INPUT PROMPT & FOOTER */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 shrink-0">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Ask MailPilot..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={status === 'thinking' || status === 'executing'}
              className="pr-10 bg-slate-900 text-xs border-slate-800 focus:border-blue-500/60 rounded-xl h-9 text-slate-100 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!promptInput.trim() || status === 'thinking' || status === 'executing'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-400 disabled:opacity-40 transition-colors"
            >
              {status === 'thinking' || status === 'executing' ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              ) : (
                <CornerDownLeft className="h-4 w-4 text-blue-400" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <Command className="h-3 w-3 text-slate-400" />
              <span>OpenRouter AI</span>
            </span>
            <span className="text-blue-400 font-semibold">Tool Calling Active</span>
          </div>
        </form>
      </div>
    </aside>
  );
};

export const CopilotPanel = CopilotPanelPlaceholder;
