import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMailStore } from '@/stores/useMailStore';
import { useCopilotStore } from '@/stores/useCopilotStore';

describe('AI Reply & Forward Workflow Tests', () => {
  beforeEach(() => {
    useMailStore.setState({
      selectedEmailId: null,
      selectedEmail: null,
      activeThread: null,
      isComposeOpen: false,
      isTyping: false,
      composeDraft: { to: '', cc: '', bcc: '', subject: '', body: '' },
    });
    useCopilotStore.setState({
      status: 'idle',
      stagedActionPreview: null,
      messages: [],
      error: null,
    });
    vi.restoreAllMocks();
  });

  // 1. AI Forward with valid email
  it('AI Forward with valid email populates to, subject, and body in compose draft', async () => {
    const mockEmail = {
      id: 'msg_200',
      threadId: 'thread_200',
      subject: 'Quarterly Report',
      from: { email: 'boss@example.com', name: 'Boss' },
      to: [{ email: 'user@example.com' }],
      date: '2026-09-07',
      snippet: 'Here is the quarterly report.',
      isRead: true,
      labels: ['INBOX'],
    };

    const fetchMock = vi.fn().mockImplementation((url) => {
      if (url === '/api/ai/chat') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            reply: "I've prepared the forward.",
            uiActions: [
              {
                type: 'prepare_forward',
                payload: {
                  emailId: 'msg_200',
                  to: 'team@example.com',
                  subject: 'Fwd: Quarterly Report',
                  body: 'Please review attached report.\n\n---------- Forwarded message ---------\nFrom: Boss <boss@example.com>\nDate: Sep 7\nSubject: Quarterly Report\nTo: user@example.com\n\nHere is the quarterly report.',
                },
              },
            ],
          }),
        });
      }
      if (url === '/api/mail/msg_200') {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockEmail });
      }
      if (url === '/api/mail/thread/thread_200') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ threadId: 'thread_200', messages: [mockEmail] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation((draft) => origAnimate(draft, 0));

    await useCopilotStore.getState().sendMessage('Forward this email to team@example.com');

    const mailState = useMailStore.getState();
    expect(mailState.isComposeOpen).toBe(true);
    expect(mailState.composeDraft.to).toBe('team@example.com');
    expect(mailState.composeDraft.subject).toBe('Fwd: Quarterly Report');
    expect(mailState.composeDraft.body).toContain('---------- Forwarded message ---------');
  });

  // 2. AI Forward with name recipient resolution
  it('AI Forward with recipient display name resolves to email address in draft.to', async () => {
    const mockEmail = {
      id: 'msg_300',
      threadId: 'thread_300',
      subject: 'Design Docs',
      from: { email: 'sarah@example.com', name: 'Sarah' },
      to: [{ email: 'user@example.com' }],
      date: '2026-09-07',
      snippet: 'Design specs for v2.',
      isRead: true,
      labels: ['INBOX'],
    };

    const fetchMock = vi.fn().mockImplementation((url) => {
      if (url === '/api/ai/chat') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            reply: "I've prepared the forward to Nishanth.",
            uiActions: [
              {
                type: 'prepare_forward',
                payload: {
                  emailId: 'msg_300',
                  to: 'nishanth@example.com',
                  subject: 'Fwd: Design Docs',
                  body: '---------- Forwarded message ---------\nFrom: Sarah <sarah@example.com>\nDate: Sep 7\nSubject: Design Docs\nTo: user@example.com\n\nDesign specs for v2.',
                },
              },
            ],
          }),
        });
      }
      if (url === '/api/mail/msg_300') {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockEmail });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation((draft) => origAnimate(draft, 0));

    await useCopilotStore.getState().sendMessage('Forward this email to Nishanth');

    const mailState = useMailStore.getState();
    expect(mailState.composeDraft.to).toBe('nishanth@example.com');
  });

  // 3. Forwarded content formatted in draft.body
  it('includes original email header and snippet in forwarded draft.body', async () => {
    const mockEmail = {
      id: 'msg_400',
      threadId: 'thread_400',
      subject: 'Security Audit',
      from: { email: 'sec@example.com', name: 'Security' },
      to: [{ email: 'user@example.com' }],
      date: '2026-09-07',
      snippet: 'Audit passed cleanly.',
      isRead: true,
      labels: ['INBOX'],
    };

    useMailStore.setState({ selectedEmailId: 'msg_400', selectedEmail: mockEmail });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: "Prepared forward.",
        uiActions: [
          {
            type: 'prepare_forward',
            payload: {
              emailId: 'msg_400',
              to: 'audit@example.com',
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation((draft) => origAnimate(draft, 0));

    await useCopilotStore.getState().sendMessage('Forward to audit@example.com');

    const draft = useMailStore.getState().composeDraft;
    expect(draft.body).toContain('---------- Forwarded message ---------');
    expect(draft.body).toContain('From: Security <sec@example.com>');
    expect(draft.body).toContain('Audit passed cleanly.');
  });

  // 4 & 5. Recipient resolution prompts
  it('asks for clarification when multiple matches exist or when recipient is unknown', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: 'I found multiple email addresses for "alex". Please specify.',
        uiActions: [],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await useCopilotStore.getState().sendMessage('Forward to alex');

    const copilotMessages = useCopilotStore.getState().messages;
    const lastMsg = copilotMessages[copilotMessages.length - 1];
    expect(lastMsg.content).toContain('multiple email addresses');
    expect(useMailStore.getState().isComposeOpen).toBe(false);
  });

  // 6 & 7. Auto Compose opening & Thread View state
  it('automatically opens Compose Modal and sets selectedEmailId for Thread View', async () => {
    const mockEmail = {
      id: 'msg_500',
      threadId: 'thread_500',
      subject: 'Weekly Status',
      from: { email: 'lead@example.com', name: 'Lead' },
      to: [{ email: 'user@example.com' }],
      date: '2026-09-07',
      snippet: 'Weekly update.',
      isRead: true,
      labels: ['INBOX'],
    };

    const fetchMock = vi.fn().mockImplementation((url) => {
      if (url === '/api/ai/chat') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            reply: "Prepared forward.",
            uiActions: [
              {
                type: 'prepare_forward',
                payload: {
                  emailId: 'msg_500',
                  to: 'manager@example.com',
                },
              },
            ],
          }),
        });
      }
      if (url === '/api/mail/msg_500') {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockEmail });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation((draft) => origAnimate(draft, 0));

    await useCopilotStore.getState().sendMessage('Forward this email to manager@example.com');

    expect(useMailStore.getState().selectedEmailId).toBe('msg_500');
    expect(useMailStore.getState().isComposeOpen).toBe(true);
  });

  // 8. Existing AI Reply behavior continues to work
  it('preserves existing AI Reply behavior and thread view opening', async () => {
    const mockEmail = {
      id: 'msg_600',
      threadId: 'thread_600',
      subject: 'Sync Request',
      from: { email: 'bob@example.com', name: 'Bob' },
      to: [{ email: 'user@example.com' }],
      date: '2026-09-07',
      snippet: 'Can we sync?',
      isRead: true,
      labels: ['INBOX'],
    };

    const fetchMock = vi.fn().mockImplementation((url) => {
      if (url === '/api/ai/chat') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            reply: "I've drafted your reply.",
            uiActions: [
              {
                type: 'prepare_reply',
                payload: {
                  emailId: 'msg_600',
                  body: 'Sure, let us talk at 2pm.',
                },
              },
            ],
          }),
        });
      }
      if (url === '/api/mail/msg_600') {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockEmail });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation((draft) => origAnimate(draft, 0));

    await useCopilotStore.getState().sendMessage('Reply saying sure');

    expect(useMailStore.getState().selectedEmailId).toBe('msg_600');
    expect(useMailStore.getState().isComposeOpen).toBe(true);
    expect(useMailStore.getState().composeDraft.to).toBe('bob@example.com');
    expect(useMailStore.getState().composeDraft.subject).toBe('Re: Sync Request');
    expect(useMailStore.getState().composeDraft.body).toBe('Sure, let us talk at 2pm.');
  });

  // 9. Existing AI Compose behavior continues to work
  it('preserves existing AI Compose behavior', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: "Prepared compose.",
        uiActions: [
          {
            type: 'prepare_compose',
            payload: {
              to: 'alice@example.com',
              subject: 'Hello',
              body: 'Test content',
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation((draft) => origAnimate(draft, 0));

    await useCopilotStore.getState().sendMessage('Compose an email to alice@example.com');

    expect(useMailStore.getState().isComposeOpen).toBe(true);
    expect(useMailStore.getState().composeDraft.to).toBe('alice@example.com');
    expect(useMailStore.getState().composeDraft.subject).toBe('Hello');
    expect(useMailStore.getState().composeDraft.body).toBe('Test content');
  });

  // 10. Human confirmation required before sending
  it('requires human confirmation in Compose Modal before sending email via API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: "Prepared forward.",
        uiActions: [
          {
            type: 'prepare_forward',
            payload: {
              emailId: 'msg_700',
              to: 'dest@example.com',
              subject: 'Fwd: Notice',
              body: 'Content',
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation((draft) => origAnimate(draft, 0));

    await useCopilotStore.getState().sendMessage('Forward to dest@example.com');

    // /api/mail/send was NOT called automatically by AI
    const sendCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/mail/send');
    expect(sendCalls.length).toBe(0);
    // Draft remains open for user to review and manually click Send
    expect(useMailStore.getState().isComposeOpen).toBe(true);
  });
});
