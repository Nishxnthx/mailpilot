import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRecipientEmail } from '@/lib/gmail/recipient';
import * as service from '@/lib/gmail/service';

describe('AI Recipient Display Name Resolution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns explicit email address directly without querying Gmail', async () => {
    const fetchSpy = vi.spyOn(service, 'fetchMailList');
    const result = await resolveRecipientEmail('john.doe@example.com');

    expect(result.resolvedEmail).toBe('john.doe@example.com');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves display name to email address when exactly one confident match is found in Gmail', async () => {
    vi.spyOn(service, 'fetchMailList').mockResolvedValue({
      emails: [
        {
          id: 'm-1',
          threadId: 't-1',
          snippet: 'Hello',
          subject: 'Test',
          from: { name: 'Nishanth Sivakumar', email: 'nishanthsivakumarsto@gmail.com' },
          to: [{ email: 'me@example.com' }],
          date: '2026-09-07',
          internalDate: 12345,
          isRead: true,
          isStarred: false,
          folder: 'inbox',
          labels: ['INBOX'],
        },
      ],
      resultSizeEstimate: 1,
    });

    const result = await resolveRecipientEmail('Nishanth Sivakumar');

    expect(result.resolvedEmail).toBe('nishanthsivakumarsto@gmail.com');
    expect(result.candidateEmails).toEqual(['nishanthsivakumarsto@gmail.com']);
  });

  it('returns multiple candidate emails when multiple distinct email matches are found', async () => {
    vi.spyOn(service, 'fetchMailList').mockResolvedValue({
      emails: [
        {
          id: 'm-1',
          threadId: 't-1',
          snippet: 'Hi',
          subject: 'Test 1',
          from: { name: 'John Doe', email: 'john.doe@example.com' },
          to: [],
          date: '2026-09-07',
          internalDate: 12345,
          isRead: true,
          isStarred: false,
          folder: 'inbox',
          labels: ['INBOX'],
        },
        {
          id: 'm-2',
          threadId: 't-2',
          snippet: 'Hi 2',
          subject: 'Test 2',
          from: { name: 'John Smith', email: 'john.smith@example.com' },
          to: [],
          date: '2026-09-07',
          internalDate: 12346,
          isRead: true,
          isStarred: false,
          folder: 'inbox',
          labels: ['INBOX'],
        },
      ],
      resultSizeEstimate: 2,
    });

    const result = await resolveRecipientEmail('John');

    expect(result.resolvedEmail).toBeUndefined();
    expect(result.candidateEmails).toContain('john.doe@example.com');
    expect(result.candidateEmails).toContain('john.smith@example.com');
  });

  it('returns empty candidate list when no matching emails are found in Gmail', async () => {
    vi.spyOn(service, 'fetchMailList').mockResolvedValue({
      emails: [],
      resultSizeEstimate: 0,
    });

    const result = await resolveRecipientEmail('Nonexistent Person');

    expect(result.resolvedEmail).toBeUndefined();
    expect(result.candidateEmails).toEqual([]);
  });
});
