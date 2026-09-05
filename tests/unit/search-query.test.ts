import { describe, it, expect } from 'vitest';
import { EmailFolder, EmailCategory } from '@/types/email';

/**
 * Pure query builder function mirroring fetchMailList query normalization
 */
export function buildGmailQueryParams(options: {
  folder?: EmailFolder;
  category?: EmailCategory;
  query?: string;
}) {
  const { folder = 'inbox', category = 'all', query = '' } = options;
  let labelIds: string[] | undefined = undefined;
  let q: string | undefined = undefined;

  const trimmedQuery = query.trim();

  if (folder === 'inbox') {
    if (category === 'primary') {
      const primaryQuery = 'in:inbox category:primary';
      q = trimmedQuery ? `${primaryQuery} ${trimmedQuery}` : primaryQuery;
      labelIds = undefined;
    } else if (category === 'promotions') {
      labelIds = ['INBOX', 'CATEGORY_PROMOTIONS'];
      q = trimmedQuery || undefined;
    } else if (category === 'social') {
      labelIds = ['INBOX', 'CATEGORY_SOCIAL'];
      q = trimmedQuery || undefined;
    } else if (category === 'updates') {
      labelIds = ['INBOX', 'CATEGORY_UPDATES'];
      q = trimmedQuery || undefined;
    } else if (category === 'forums') {
      labelIds = ['INBOX', 'CATEGORY_FORUMS'];
      q = trimmedQuery || undefined;
    } else {
      labelIds = ['INBOX'];
      q = trimmedQuery || undefined;
    }
  } else if (folder === 'sent') {
    labelIds = ['SENT'];
    q = trimmedQuery || undefined;
  } else if (folder === 'starred') {
    labelIds = ['STARRED'];
    q = trimmedQuery || undefined;
  } else if (folder === 'trash') {
    labelIds = ['TRASH'];
    q = trimmedQuery || undefined;
  } else if (folder === 'archive') {
    const baseArchiveQuery = '-in:inbox -in:sent -in:drafts -in:trash -in:spam';
    q = trimmedQuery ? `${baseArchiveQuery} ${trimmedQuery}` : baseArchiveQuery;
  }

  return { labelIds, q };
}

describe('Gmail Search Query Construction', () => {
  it('constructs correct query parameters for inbox with primary category using native in:inbox category:primary query', () => {
    const result = buildGmailQueryParams({ folder: 'inbox', category: 'primary' });
    expect(result.labelIds).toBeUndefined();
    expect(result.q).toBe('in:inbox category:primary');
  });

  it('constructs correct query parameters for archive folder with keyword', () => {
    const result = buildGmailQueryParams({ folder: 'archive', query: 'invoice' });
    expect(result.labelIds).toBeUndefined();
    expect(result.q).toBe('-in:inbox -in:sent -in:drafts -in:trash -in:spam invoice');
  });

  it('preserves Gmail search operators (is:unread, is:read, newer_than, from)', () => {
    const query = 'is:unread from:sarah@example.com newer_than:7d';
    const result = buildGmailQueryParams({ folder: 'inbox', query });
    expect(result.labelIds).toEqual(['INBOX']);
    expect(result.q).toBe('is:unread from:sarah@example.com newer_than:7d');
  });

  it('combines multiple search terms and operators seamlessly', () => {
    const query = 'is:read after:2026/08/01 "quarterly review"';
    const result = buildGmailQueryParams({ folder: 'inbox', query });
    expect(result.q).toBe('is:read after:2026/08/01 "quarterly review"');
  });
});
