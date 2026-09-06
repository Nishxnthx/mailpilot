'use client';

import React from 'react';
import { X, Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import { useMailStore, clearMailboxCache } from '@/stores/useMailStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const ComposeModal: React.FC = () => {
  const isComposeOpen = useMailStore((state) => state.isComposeOpen);
  const isTyping = useMailStore((state) => state.isTyping);
  const composeDraft = useMailStore((state) => state.composeDraft);
  const updateComposeDraft = useMailStore((state) => state.updateComposeDraft);
  const closeCompose = useMailStore((state) => state.closeCompose);
  const resetComposeDraft = useMailStore((state) => state.resetComposeDraft);
  const syncMail = useMailStore((state) => state.syncMail);

  const [isSending, setIsSending] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const saveSequenceRef = React.useRef(0);
  const isSendingRef = React.useRef(false);
  const composeDraftRef = React.useRef(composeDraft);
  composeDraftRef.current = composeDraft;

  // Reset states when modal is freshly opened
  React.useEffect(() => {
    if (isComposeOpen) {
      isSendingRef.current = false;
      setIsSending(false);
      setSaveStatus(composeDraft.draftId ? 'saved' : 'idle');
    }
  }, [isComposeOpen, composeDraft.draftId]);

  // Debounced Autosave (1000ms) - Suspended while AI character typing is active
  React.useEffect(() => {
    if (!isComposeOpen || isSendingRef.current || isTyping) return;

    const { to, cc, bcc, subject, body } = composeDraft;
    const hasMeaningfulContent =
      !!(to.trim() || cc?.trim() || bcc?.trim() || subject.trim() || body.trim());

    if (!hasMeaningfulContent) {
      setSaveStatus('idle');
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (isSendingRef.current) return;

      const currentDraft = composeDraftRef.current;
      const currentSeq = ++saveSequenceRef.current;
      setSaveStatus('saving');

      try {
        let res: Response;
        if (currentDraft.draftId) {
          res = await fetch(`/api/mail/drafts/${currentDraft.draftId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDraft),
          });
        } else {
          res = await fetch('/api/mail/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDraft),
          });
        }

        if (isSendingRef.current) return;

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const data = await res.json();

        // Concurrency guard: only apply if this is the latest sequence request
        if (currentSeq === saveSequenceRef.current && !isSendingRef.current) {
          if (data.draftId && !currentDraft.draftId) {
            updateComposeDraft({ draftId: data.draftId });
          }
          clearMailboxCache();
          setSaveStatus('saved');
        }
      } catch (err) {
        console.error('[Autosave Error]:', err);
        if (currentSeq === saveSequenceRef.current && !isSendingRef.current) {
          setSaveStatus('error');
        }
      }
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    isComposeOpen,
    isTyping,
    composeDraft,
    updateComposeDraft,
  ]);

  if (!isComposeOpen) return null;

  const handleSend = async () => {
    if (!composeDraft.to || !composeDraft.subject || !composeDraft.body) {
      alert('Please fill in recipient, subject, and message content before sending.');
      return;
    }

    // Immediately cancel pending autosave timers and set sending guard
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isSendingRef.current = true;
    setIsSending(true);

    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeDraft),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const sendResult = await res.json().catch(() => ({}));
      const sentThreadId = sendResult.threadId || composeDraft.threadId || useMailStore.getState().selectedEmail?.threadId;

      resetComposeDraft();
      closeCompose();

      if (sentThreadId) {
        await useMailStore.getState().fetchEmailThread(sentThreadId);
      }

      await syncMail();
    } catch (err) {
      isSendingRef.current = false;
      const message = err instanceof Error ? err.message : 'Failed to send email';
      alert(`Error sending email: ${message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:right-8 w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="h-11 bg-slate-950 px-4 flex items-center justify-between border-b border-slate-800 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            <span>{composeDraft.draftId ? 'Edit Draft' : 'New Message'}</span>
          </div>

          {/* Autosave & AI Typing Status Indicator */}
          {isTyping && (
            <div className="flex items-center gap-1 text-[11px] text-blue-400 font-medium bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40 animate-pulse">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>AI Typing...</span>
            </div>
          )}
          {!isTyping && saveStatus === 'saving' && (
            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {!isTyping && saveStatus === 'saved' && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              <span>Saved</span>
            </div>
          )}
          {!isTyping && saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-[11px] text-red-400 font-medium bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40">
              <span>Save failed</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={closeCompose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Controlled Fields Notice */}
      <div className="bg-blue-950/40 border-b border-blue-900/40 px-4 py-2 flex items-center gap-2 text-xs text-blue-300">
        <Bot className="h-4 w-4 text-blue-400 shrink-0" />
        <span>State-Controlled Form: AI Copilot can read & populate these fields via structured tool calls.</span>
      </div>

      {/* Form Inputs */}
      <div className="p-4 space-y-3 flex-1">
        {/* Recipient */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400 w-14 shrink-0">To:</label>
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={composeDraft.to}
            onChange={(e) => updateComposeDraft({ to: e.target.value })}
            className="h-8 text-xs bg-slate-950/60 border-slate-800"
          />
        </div>

        {/* Subject */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400 w-14 shrink-0">Subject:</label>
          <Input
            type="text"
            placeholder="Enter subject line..."
            value={composeDraft.subject}
            onChange={(e) => updateComposeDraft({ subject: e.target.value })}
            className="h-8 text-xs bg-slate-950/60 border-slate-800 font-medium"
          />
        </div>

        {/* Body */}
        <div className="pt-1">
          <textarea
            rows={8}
            placeholder="Write email content here..."
            value={composeDraft.body}
            onChange={(e) => updateComposeDraft({ body: e.target.value })}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none font-sans leading-relaxed"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="h-12 bg-slate-950/80 px-4 border-t border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSend}
            disabled={isSending}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-500 font-medium"
          >
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>{isSending ? 'Sending...' : 'Send'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetComposeDraft}
            disabled={isSending}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            Discard
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>AI Assisted</span>
        </div>
      </div>
    </div>
  );
};

