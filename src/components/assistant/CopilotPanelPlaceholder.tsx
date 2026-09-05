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
  Search,
  Mail,
  Edit3,
} from 'lucide-react';
import { useCopilotStore, StagedSendAction, TimelineStep } from '@/stores/useCopilotStore';
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

  const renderTimelineStep = (step: TimelineStep, idx: number) => {
    return (
      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-400 py-0.5">
        <div className="pt-0.5 shrink-0">
          {step.step === 'understanding' && <Clock className="h-3 w-3 text-blue-400" />}
          {step.step === 'tool_selected' && <Wrench className="h-3 w-3 text-amber-400" />}
          {step.step === 'execution' && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
          {step.step === 'result' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
          {step.step === 'action' && <Compass className="h-3 w-3 text-indigo-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-300 truncate">{step.label}</div>
          {step.detail && <div className="text-[10px] text-slate-500 truncate">{step.detail}</div>}
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

  return (
    <aside className="w-80 sm:w-96 border-l border-[#1b2230] bg-[#0e121c] flex flex-col justify-between select-none shrink-0">
      {/* Header */}
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

      {/* Copilot Chat Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg) => {
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
        {stagedActionPreview && !messages.some((m) => m.actionPreview === stagedActionPreview) && (
          renderActionPreviewCard(stagedActionPreview)
        )}

        {/* Loading Indicator */}
        {(status === 'thinking' || status === 'executing') && (
          <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span>
              {status === 'thinking' ? 'OpenRouter reasoning & tool calling...' : 'Executing operation...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Action Chips */}
      <div className="px-3 py-2 bg-slate-950 border-t border-slate-850 space-y-1.5 shrink-0">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
          Suggested Actions
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => handleQuickPrompt('Summarize the latest emails in inbox')}
            className="py-1 px-2.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3 text-blue-400" />
            <span>Summarize inbox</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickPrompt('Show unread emails in inbox')}
            className="py-1 px-2.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Mail className="h-3 w-3 text-emerald-400" />
            <span>Show unread</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickPrompt('Search emails from recruiter')}
            className="py-1 px-2.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Search className="h-3 w-3 text-amber-400" />
            <span>Find emails</span>
          </button>
        </div>
      </div>

      {/* Input Prompt Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 shrink-0">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Ask MailPilot..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={status === 'thinking' || status === 'executing'}
              className="pr-10 bg-slate-900 text-xs border-slate-800 focus:border-blue-500/60 rounded-xl h-9 text-slate-100"
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
