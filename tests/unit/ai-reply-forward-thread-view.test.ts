import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMailStore } from '@/stores/useMailStore';
import { useCopilotStore } from '@/stores/useCopilotStore';

describe('AI Reply & Forward Thread View Integration', () => {
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

  it('AI prepare_reply opens Thread View by setting selectedEmailId and populates compose modal', async () => {
    const mockEmail = {
      id: 'msg_100',
      threadId: 'thread_100',
      subject: 'Project Kickoff',
      from: { email: 'saravana@example.com', name: 'Saravana' },
      to: [{ email: 'user@example.com' }],
      date: '2026-09-07',
      snippet: 'Let us meet tomorrow.',
      isRead: true,
      labels: ['INBOX'],
    };

    const fetchMock = vi.fn().mockImplementation((url) => {
      if (url === '/api/ai/chat') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            reply: "I've drafted a reply for you.",
            uiActions: [
              {
                type: 'prepare_reply',
                payload: {
                  emailId: 'msg_100',
                  body: 'I will attend the meeting tomorrow.',
                },
              },
            ],
          }),
        });
      }
      if (url === '/api/mail/msg_100') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockEmail,
        });
      }
      if (url === '/api/mail/thread/thread_100') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            threadId: 'thread_100',
            messages: [mockEmail],
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation(
      (draft) => origAnimate(draft, 0)
    );

    await useCopilotStore.getState().sendMessage('Reply to this email saying I will attend');

    const mailState = useMailStore.getState();
    // 1. Thread View is opened in main workspace (selectedEmailId set to target emailId)
    expect(mailState.selectedEmailId).toBe('msg_100');
    expect(mailState.selectedEmail?.id).toBe('msg_100');

    // 2. Compose Modal is open and populated with reply draft
    expect(mailState.isComposeOpen).toBe(true);
    expect(mailState.composeDraft.to).toBe('saravana@example.com');
    expect(mailState.composeDraft.subject).toBe('Re: Project Kickoff');
    expect(mailState.composeDraft.body).toBe('I will attend the meeting tomorrow.');
    expect(mailState.composeDraft.threadId).toBe('thread_100');
  });

  it('AI prepare_forward opens Thread View by setting selectedEmailId and populates forward compose modal', async () => {
    const mockEmail = {
      id: 'msg_200',
      threadId: 'thread_200',
      subject: 'Quarterly Report',
      from: { email: 'boss@example.com', name: 'Boss' },
      to: [{ email: 'user@example.com' }],
      date: '2026-09-07',
      snippet: 'Here is the report.',
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
                  body: 'Please see the quarterly report attached below.',
                },
              },
            ],
          }),
        });
      }
      if (url === '/api/mail/msg_200') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockEmail,
        });
      }
      if (url === '/api/mail/thread/thread_200') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            threadId: 'thread_200',
            messages: [mockEmail],
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const origAnimate = useMailStore.getState().animateComposeFill;
    vi.spyOn(useMailStore.getState(), 'animateComposeFill').mockImplementation(
      (draft) => origAnimate(draft, 0)
    );

    await useCopilotStore.getState().sendMessage('Forward this email to team@example.com');

    const mailState = useMailStore.getState();
    // 1. Thread View is opened in main workspace
    expect(mailState.selectedEmailId).toBe('msg_200');
    expect(mailState.selectedEmail?.id).toBe('msg_200');

    // 2. Compose Modal is open with forward draft
    expect(mailState.isComposeOpen).toBe(true);
    expect(mailState.composeDraft.to).toBe('team@example.com');
    expect(mailState.composeDraft.subject).toBe('Fwd: Quarterly Report');
    expect(mailState.composeDraft.body).toBe('Please see the quarterly report attached below.');
    expect(mailState.composeDraft.threadId).toBe('thread_200');
  });
});
