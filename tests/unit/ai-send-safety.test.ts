import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCopilotStore } from '@/stores/useCopilotStore';
import { mailPilotOpenRouterTools } from '@/lib/ai/openrouter';

describe('AI Email Send Safety & Confirmation System', () => {
  beforeEach(() => {
    useCopilotStore.setState({
      status: 'idle',
      stagedActionPreview: null,
      messages: [],
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('1. prepare_send stages an Action Preview Card without sending an email automatically', async () => {
    const stagedAction = {
      to: 'kaviya@example.com',
      subject: "Tomorrow's Report",
      body: 'I will send the report tomorrow.',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: 'I have prepared your email to kaviya@example.com.',
        actionPreview: stagedAction,
        uiActions: [],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await useCopilotStore.getState().sendMessage('Prepare an email to kaviya@example.com');

    // API endpoint called was /api/ai/chat (NOT /api/mail/send)
    const sendCalls = fetchMock.mock.calls.filter((call) => call[0] === '/api/mail/send');
    expect(sendCalls.length).toBe(0);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/chat');

    // stagedActionPreview is set in state for human review
    expect(useCopilotStore.getState().stagedActionPreview).toEqual(stagedAction);
  });

  it('2. only sends the email when confirmSendEmail is explicitly called', async () => {
    const stagedAction = {
      to: 'kaviya@example.com',
      subject: "Tomorrow's Report",
      body: 'I will send the report tomorrow.',
    };

    useCopilotStore.setState({
      stagedActionPreview: stagedAction,
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'I have prepared your email.',
          actionPreview: stagedAction,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'sent-id-123', threadId: 't-1', emails: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await useCopilotStore.getState().confirmSendEmail(stagedAction);

    // Explicit confirmation posts to /api/mail/send
    expect(fetchMock.mock.calls[0][0]).toBe('/api/mail/send');
    expect(useCopilotStore.getState().stagedActionPreview).toBeNull();
    const updatedMsgs = useCopilotStore.getState().messages;
    expect(updatedMsgs.every((m) => m.actionPreview === null || m.actionPreview === undefined)).toBe(true);
  });

  it('3. confirmSendEmail sends exactly ONE email via /api/mail/send', async () => {
    const stagedAction = {
      to: 'test@example.com',
      subject: 'Single Email Test',
      body: 'Testing single send',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'msg-100', threadId: 't-100' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await useCopilotStore.getState().confirmSendEmail(stagedAction);

    const sendCalls = fetchMock.mock.calls.filter((call) => call[0] === '/api/mail/send');
    expect(sendCalls.length).toBe(1);
    expect(JSON.parse(sendCalls[0][1].body)).toEqual(stagedAction);
  });

  it('4. prevents duplicate send executions on rapid double click', async () => {
    const stagedAction = {
      to: 'double@example.com',
      subject: 'Double Click Test',
      body: 'Testing double click guard',
    };

    let resolveFetch: (val: any) => void;
    const pendingPromise = new Promise((res) => {
      resolveFetch = res;
    });

    const fetchMock = vi.fn().mockImplementation(() =>
      pendingPromise.then(() => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'msg-200' }),
      }))
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    // Trigger first confirmSendEmail call (which sets status = 'executing')
    const p1 = useCopilotStore.getState().confirmSendEmail(stagedAction);

    // Rapid second call while status is 'executing'
    const p2 = useCopilotStore.getState().confirmSendEmail(stagedAction);

    // Resolve network request
    resolveFetch!({});
    await Promise.all([p1, p2]);

    // Should only have initiated /api/mail/send fetch once
    const sendCalls = fetchMock.mock.calls.filter((call) => call[0] === '/api/mail/send');
    expect(sendCalls.length).toBe(1);
  });

  it('5. cancelActionPreview atomically clears stagedActionPreview and all message actionPreviews', () => {
    const stagedAction = {
      to: 'stale@example.com',
      subject: 'Stale Preview',
      body: 'Testing stale preview clearance',
    };

    useCopilotStore.setState({
      stagedActionPreview: stagedAction,
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Prepared draft',
          actionPreview: stagedAction,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    useCopilotStore.getState().cancelActionPreview();

    expect(useCopilotStore.getState().stagedActionPreview).toBeNull();
    const msgs = useCopilotStore.getState().messages;
    expect(msgs[0].actionPreview).toBeNull();
  });

  it('6. sendMessage clears previous unconfirmed action previews when starting a new prompt', async () => {
    const oldAction = {
      to: 'old@example.com',
      subject: 'Old Action',
      body: 'Unconfirmed action',
    };

    useCopilotStore.setState({
      stagedActionPreview: oldAction,
      messages: [
        {
          id: 'msg-old',
          role: 'assistant',
          content: 'Old prepared draft',
          actionPreview: oldAction,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: 'Inbox filtered.',
        uiActions: [],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await useCopilotStore.getState().sendMessage('Show me unread emails');

    expect(useCopilotStore.getState().stagedActionPreview).toBeNull();
    const msgs = useCopilotStore.getState().messages;
    const oldMsg = msgs.find((m) => m.id === 'msg-old');
    expect(oldMsg?.actionPreview).toBeNull();
  });

  it('7. OpenRouter staging tool descriptions instruct single-turn staging execution', () => {
    const stagingToolNames = ['prepare_compose', 'prepare_reply', 'prepare_forward', 'prepare_send', 'send_email'];

    for (const toolName of stagingToolNames) {
      const toolDef = mailPilotOpenRouterTools.find((t) => t.function.name === toolName);
      expect(toolDef).toBeDefined();
      expect(toolDef?.function.description).toContain('Call this tool ONCE.');
    }
  });
});
