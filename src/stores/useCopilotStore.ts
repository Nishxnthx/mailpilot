import { create } from 'zustand';
import { useMailStore } from './useMailStore';
import { formatForwardBody } from '@/lib/utils/utils';

export interface TimelineStep {
  step: 'understanding' | 'tool_selected' | 'execution' | 'result' | 'action';
  label: string;
  detail?: string;
  timestamp: string;
}

export interface StagedSendAction {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timeline?: TimelineStep[];
  actionPreview?: StagedSendAction | null;
  timestamp: string;
}

interface CopilotStoreState {
  isCopilotOpen: boolean;
  status: 'idle' | 'thinking' | 'executing' | 'error';
  promptInput: string;
  messages: CopilotMessage[];
  stagedActionPreview: StagedSendAction | null;
  error: string | null;

  toggleCopilot: () => void;
  setCopilotOpen: (open: boolean) => void;
  setPromptInput: (prompt: string) => void;
  setStatus: (status: 'idle' | 'thinking' | 'executing' | 'error') => void;
  setStagedActionPreview: (action: StagedSendAction | null) => void;

  sendMessage: (promptText?: string) => Promise<void>;
  confirmSendEmail: (actionData: StagedSendAction) => Promise<void>;
  cancelActionPreview: () => void;
  clearMessages: () => void;
}

export const useCopilotStore = create<CopilotStoreState>((set, get) => ({
  isCopilotOpen: true,
  status: 'idle',
  promptInput: '',
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your MailPilot AI assistant powered by OpenRouter function calling. Ask me to search emails, switch folders, summarize messages, or draft responses!',
      timestamp: new Date().toISOString(),
    },
  ],
  stagedActionPreview: null,
  error: null,

  toggleCopilot: () => set((state) => ({ isCopilotOpen: !state.isCopilotOpen })),
  setCopilotOpen: (open) => set({ isCopilotOpen: open }),
  setPromptInput: (prompt) => set({ promptInput: prompt }),
  setStatus: (status) => set({ status }),
  setStagedActionPreview: (action) => set({ stagedActionPreview: action }),

  cancelActionPreview: () =>
    set((state) => ({
      stagedActionPreview: null,
      messages: state.messages.map((m) => (m.actionPreview ? { ...m, actionPreview: null } : m)),
    })),

  clearMessages: () =>
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I am your MailPilot AI assistant powered by OpenRouter function calling.',
          timestamp: new Date().toISOString(),
        },
      ],
      stagedActionPreview: null,
      error: null,
    }),

  sendMessage: async (promptText?: string) => {
    const textToSend = promptText || get().promptInput;
    if (!textToSend.trim()) return;

    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      promptInput: '',
      status: 'thinking',
      error: null,
    }));

    try {
      // Gather current MailPilot context from useMailStore
      const mailState = useMailStore.getState();
      const contextPayload = {
        activeFolder: mailState.activeFolder,
        activeCategory: mailState.activeCategory,
        searchQuery: mailState.searchQuery,
        selectedEmailId: mailState.selectedEmailId,
        selectedEmail: mailState.selectedEmail,
        visibleEmails: mailState.emails.slice(0, 5).map((e) => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          date: e.date,
          snippet: e.snippet,
        })),
      };

      const historyPayload = get()
        .messages.filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          context: contextPayload,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const { reply, uiActions = [], timeline = [], actionPreview } = data;

      // Execute returned UI Actions on useMailStore
      for (const action of uiActions) {
        if (action.type === 'navigate_mailbox') {
          mailState.setActiveFolder(action.payload.folder);
        } else if (action.type === 'search_emails') {
          mailState.setSearchQuery(action.payload.query);
        } else if (action.type === 'filter_emails') {
          if (action.payload.folder) mailState.setActiveFolder(action.payload.folder);
          if (action.payload.category) mailState.setActiveCategory(action.payload.category);
          if (action.payload.query) mailState.setSearchQuery(action.payload.query);
        } else if (action.type === 'open_email') {
          mailState.setSelectedEmailId(action.payload.emailId);
        } else if (action.type === 'prepare_compose') {
          await mailState.animateComposeFill({
            to: action.payload.to || '',
            cc: action.payload.cc || '',
            bcc: action.payload.bcc || '',
            subject: action.payload.subject || '',
            body: action.payload.body || '',
          });
        } else if (action.type === 'prepare_reply') {
          const targetEmailId = action.payload.emailId || mailState.selectedEmailId;
          if (targetEmailId) {
            mailState.setSelectedEmailId(targetEmailId);
            if (!mailState.selectedEmail || mailState.selectedEmail.id !== targetEmailId) {
              await mailState.fetchEmailDetail(targetEmailId);
            }
          }
          const selected = useMailStore.getState().selectedEmail;
          const replySubject = action.payload.subject || (selected ? (/^re:\s*/i.test(selected.subject) ? selected.subject : `Re: ${selected.subject}`) : '');
          await mailState.animateComposeFill({
            to: action.payload.to || selected?.from.email || '',
            subject: replySubject,
            body: action.payload.body || '',
            threadId: action.payload.threadId || selected?.threadId || undefined,
            inReplyTo: action.payload.inReplyTo || selected?.messageId || selected?.id || undefined,
            references: action.payload.references || selected?.messageId || selected?.id || undefined,
          });
        } else if (action.type === 'prepare_forward') {
          const targetEmailId = action.payload.emailId || mailState.selectedEmailId;
          if (targetEmailId) {
            mailState.setSelectedEmailId(targetEmailId);
            if (!mailState.selectedEmail || mailState.selectedEmail.id !== targetEmailId) {
              await mailState.fetchEmailDetail(targetEmailId);
            }
          }
          const selected = useMailStore.getState().selectedEmail;
          const fwdSubject = (action.payload.subject as string) || (selected ? (/^fwd:\s*/i.test(selected.subject) ? selected.subject : `Fwd: ${selected.subject}`) : '');
          
          let fwdBody = (action.payload.body as string) || '';
          if (selected) {
            const formattedFwd = formatForwardBody(selected);
            if (!fwdBody) {
              fwdBody = formattedFwd.trimStart();
            } else if (!fwdBody.includes('Forwarded message')) {
              fwdBody = `${fwdBody}\n\n${formattedFwd.trimStart()}`;
            }
          }

          await mailState.animateComposeFill({
            to: (action.payload.to as string) || '',
            subject: fwdSubject,
            body: fwdBody,
            threadId: selected?.threadId || undefined,
          });
        }
      }

      // If prepare_send actionPreview was staged, store it for human confirmation
      if (actionPreview) {
        set({ stagedActionPreview: actionPreview });
      }

      const assistantMessage: CopilotMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timeline,
        actionPreview: actionPreview || null,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        status: 'idle',
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI Copilot failed to process request';
      set({
        error: errorMessage,
        status: 'error',
        messages: [
          ...get().messages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  },

  confirmSendEmail: async (actionData: StagedSendAction) => {
    set({ status: 'executing' });
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      const mailState = useMailStore.getState();
      mailState.closeCompose();
      mailState.resetComposeDraft();
      mailState.syncMail();

      set((state) => ({
        stagedActionPreview: null,
        status: 'idle',
        messages: [
          ...state.messages.map((m) => (m.actionPreview ? { ...m, actionPreview: null } : m)),
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `✓ Email sent successfully to ${actionData.to} via Gmail API.`,
            timestamp: new Date().toISOString(),
          },
        ],
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send email';
      set({
        status: 'error',
        messages: [
          ...get().messages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠ Failed to send email: ${message}`,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  },
}));
