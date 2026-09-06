import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMailStore } from '@/stores/useMailStore';
import { useCopilotStore } from '@/stores/useCopilotStore';

describe('AI Compose UX Animated Typing & State Control', () => {
  beforeEach(() => {
    useMailStore.setState({
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

  it('animates character-by-character fill into to, subject, and body fields', async () => {
    const targetDraft = {
      to: 'john@example.com',
      subject: 'Meeting Tomorrow',
      body: "Let's meet at 3pm",
    };

    // Run animateComposeFill with speedMs = 0 for fast test execution
    const animPromise = useMailStore.getState().animateComposeFill(targetDraft, 0);

    // Immediately after invocation, isComposeOpen should be true and isTyping true
    expect(useMailStore.getState().isComposeOpen).toBe(true);

    await animPromise;

    // After animation completes:
    const finalDraft = useMailStore.getState().composeDraft;
    expect(finalDraft.to).toBe('john@example.com');
    expect(finalDraft.subject).toBe('Meeting Tomorrow');
    expect(finalDraft.body).toBe("Let's meet at 3pm");
    expect(useMailStore.getState().isComposeOpen).toBe(true);
    expect(useMailStore.getState().isTyping).toBe(false);
  });

  it('cancels typing animation cleanly when closeCompose or resetComposeDraft is called', async () => {
    const targetDraft = {
      to: 'longrecipientaddress@example.com',
      subject: 'A very long subject line for testing cancellation',
      body: 'A very long email body string for testing cancellation mid-way through animation loop',
    };

    // Start animation with a non-zero delay
    const animPromise = useMailStore.getState().animateComposeFill(targetDraft, 10);

    expect(useMailStore.getState().isTyping).toBe(true);

    // Cancel mid-way
    useMailStore.getState().closeCompose();

    await animPromise;

    expect(useMailStore.getState().isComposeOpen).toBe(false);
    expect(useMailStore.getState().isTyping).toBe(false);
  });

  it('does NOT set isTyping when manual openCompose is invoked', () => {
    useMailStore.getState().openCompose({
      to: 'manual@example.com',
      subject: 'Manual Subject',
      body: 'Manual Body',
    });

    expect(useMailStore.getState().isComposeOpen).toBe(true);
    expect(useMailStore.getState().isTyping).toBe(false);
    expect(useMailStore.getState().composeDraft.to).toBe('manual@example.com');
  });

  it('AI Copilot prepare_compose action triggers animated fill and leaves draft open without sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: "I've drafted your email to john@example.com.",
        uiActions: [
          {
            type: 'prepare_compose',
            payload: {
              to: 'john@example.com',
              subject: 'Meeting Tomorrow',
              body: "Let's meet at 3pm",
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    // Override animateComposeFill speed in test by spying/wrapping or letting it run with 0 delay for test
    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation(
      (draft) => origAnimate(draft, 0)
    );

    await useCopilotStore
      .getState()
      .sendMessage("Compose an email to john@example.com with subject 'Meeting Tomorrow' and body 'Let's meet at 3pm'");

    // Verify AI chat called /api/ai/chat
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/chat');

    // Verify draft modal is open with populated text
    const storeState = useMailStore.getState();
    expect(storeState.isComposeOpen).toBe(true);
    expect(storeState.composeDraft.to).toBe('john@example.com');
    expect(storeState.composeDraft.subject).toBe('Meeting Tomorrow');
    expect(storeState.composeDraft.body).toBe("Let's meet at 3pm");

    // Verify /api/mail/send was NEVER called automatically
    expect(fetchMock).not.toHaveBeenCalledWith('/api/mail/send', expect.anything());
  });
});
