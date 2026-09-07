import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRecipientEmail } from '@/lib/gmail/recipient';
import * as service from '@/lib/gmail/service';

describe('AI Recipient Display Name Resolution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exact email address -> remains supported directly without querying Gmail', async () => {
    const fetchSpy = vi.spyOn(service, 'fetchMailList');
    const result = await resolveRecipientEmail('john.doe@example.com');

    expect(result.resolvedEmail).toBe('john.doe@example.com');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('partial name -> one matching email -> resolves automatically from Gmail header data', async () => {
    vi.spyOn(service, 'fetchMailList').mockResolvedValue({
      emails: [
        {
          id: 'm-1',
          threadId: 't-1',
          snippet: 'Testing message',
          subject: 'Report',
          from: { name: 'Kaviyanagaraj', email: 'kaviyanagaraj75@gmail.com' },
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

    const result = await resolveRecipientEmail('kaviyanagaraj');

    expect(result.resolvedEmail).toBe('kaviyanagaraj75@gmail.com');
    expect(result.candidateEmails).toEqual(['kaviyanagaraj75@gmail.com']);
  });

  it('case-insensitive name matching -> resolves uppercase/mixed-case inputs correctly', async () => {
    vi.spyOn(service, 'fetchMailList').mockResolvedValue({
      emails: [
        {
          id: 'm-2',
          threadId: 't-2',
          snippet: 'Hello',
          subject: 'Greetings',
          from: { name: 'KAVIYA NAGARAJ', email: 'kaviya.nagaraj@gmail.com' },
          to: [],
          date: '2026-09-07',
          internalDate: 12346,
          isRead: true,
          isStarred: false,
          folder: 'inbox',
          labels: ['INBOX'],
        },
      ],
      resultSizeEstimate: 1,
    });

    const result = await resolveRecipientEmail('kaviya nagaraj');

    expect(result.resolvedEmail).toBe('kaviya.nagaraj@gmail.com');
    expect(result.candidateEmails).toEqual(['kaviya.nagaraj@gmail.com']);
  });

  it('multiple matching emails -> returns candidates without guessing so AI can ask for clarification', async () => {
    vi.spyOn(service, 'fetchMailList').mockResolvedValue({
      emails: [
        {
          id: 'm-3',
          threadId: 't-3',
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
          id: 'm-4',
          threadId: 't-4',
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

  it('no matching email -> returns empty candidates so AI asks for full email address', async () => {
    vi.spyOn(service, 'fetchMailList').mockResolvedValue({
      emails: [],
      resultSizeEstimate: 0,
    });

    const result = await resolveRecipientEmail('Nonexistent Person');

    expect(result.resolvedEmail).toBeUndefined();
    expect(result.candidateEmails).toEqual([]);
  });
});
