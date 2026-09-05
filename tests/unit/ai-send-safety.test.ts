import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCopilotStore } from '@/stores/useCopilotStore';

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

  it('prepare_send stages an Action Preview Card without sending an email automatically', async () => {
    const stagedAction = {
      to: 'kaviya@example.com',
      subject: 'Tomorrow\'s Report',
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

    // 1. API endpoint called was /api/ai/chat (NOT /api/mail/send)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/chat');

    // 2. stagedActionPreview is set in state for human review
    expect(useCopilotStore.getState().stagedActionPreview).toEqual(stagedAction);
  });

  it('only sends the email when confirmSendEmail is explicitly called', async () => {
    const stagedAction = {
      to: 'kaviya@example.com',
      subject: 'Tomorrow\'s Report',
      body: 'I will send the report tomorrow.',
    };

    useCopilotStore.setState({ stagedActionPreview: stagedAction });

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
  });
});
