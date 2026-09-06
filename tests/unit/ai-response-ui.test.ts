import { describe, it, expect } from 'vitest';
import { TimelineStep } from '@/stores/useCopilotStore';

describe('AI Response UI Consumer Presentation & Natural Language States', () => {
  it('ensures user-facing processing states do NOT expose technical tool names or JSON arguments', () => {
    const rawTimeline: TimelineStep[] = [
      {
        step: 'understanding',
        label: 'Understanding request',
        timestamp: new Date().toISOString(),
      },
      {
        step: 'tool_selected',
        label: 'Checking your inbox...',
        detail: 'Finding matching emails',
        timestamp: new Date().toISOString(),
      },
      {
        step: 'result',
        label: 'Done',
        timestamp: new Date().toISOString(),
      },
    ];

    rawTimeline.forEach((step) => {
      expect(step.label).not.toContain('search_emails');
      expect(step.label).not.toContain('get_email_detail');
      expect(step.label).not.toContain('Tool selected:');
      expect(step.label).not.toContain('Executing');
      expect(step.label).not.toContain('Dispatched');
      if (step.detail) {
        expect(step.detail).not.toContain('JSON');
        expect(step.detail).not.toContain('Arguments');
      }
    });
  });

  it('validates natural language processing labels for status bar and loading states', () => {
    const naturalLabels = [
      'Checking your inbox...',
      'Finding matching emails',
      'Reading conversation...',
      'Drafting your reply...',
      'Preparing forwarded message...',
      'Creating your email...',
      'Preparing email to send...',
      'Done',
      'MailPilot is working...',
      '● WORKING...',
      '✓ READY',
    ];

    naturalLabels.forEach((label) => {
      expect(label).not.toMatch(/search_emails|get_email_detail|prepare_compose|prepare_reply|prepare_forward|THINKING|ENGINE ACTIVE/);
      expect(label).not.toContain('OpenRouter reasoning');
    });
  });
});
