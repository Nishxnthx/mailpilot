import { describe, it, expect } from 'vitest';
import { toolSchemas } from '@/lib/ai/openrouter';

describe('AI Tool Zod Schema Validations', () => {
  it('validates prepare_send schema requires to, subject, and body', () => {
    const valid = {
      to: 'kaviya@example.com',
      subject: 'Quarterly Report',
      body: 'Here is the report.',
    };
    const parsed = toolSchemas.prepare_send.safeParse(valid);
    expect(parsed.success).toBe(true);

    const missingSubject = {
      to: 'kaviya@example.com',
      body: 'Here is the report.',
    };
    const invalidParsed = toolSchemas.prepare_send.safeParse(missingSubject);
    expect(invalidParsed.success).toBe(false);
  });

  it('validates send_email schema requires to, subject, and body', () => {
    const valid = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      cc: 'cc@example.com',
    };
    const parsed = toolSchemas.send_email.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cc).toBe('cc@example.com');
    }
  });

  it('validates search_emails requires a query string', () => {
    const valid = { query: 'is:unread newer_than:7d' };
    expect(toolSchemas.search_emails.safeParse(valid).success).toBe(true);

    const invalid = { folder: 'inbox' };
    expect(toolSchemas.search_emails.safeParse(invalid).success).toBe(false);
  });

  it('validates prepare_compose with optional fields', () => {
    const validFull = { to: 'a@b.com', subject: 'Hi', body: 'Hello' };
    const validEmpty = {};
    expect(toolSchemas.prepare_compose.safeParse(validFull).success).toBe(true);
    expect(toolSchemas.prepare_compose.safeParse(validEmpty).success).toBe(true);
  });

  it('validates prepare_reply and prepare_forward schemas', () => {
    const validReply = { emailId: 'msg-123', body: 'Thanks!' };
    const validForward = { emailId: 'msg-123', subject: 'Fwd: News' };
    expect(toolSchemas.prepare_reply.safeParse(validReply).success).toBe(true);
    expect(toolSchemas.prepare_forward.safeParse(validForward).success).toBe(true);
  });

  it('validates filter_emails schema with category and folder enums', () => {
    const validFilter = { category: 'promotions', folder: 'inbox' };
    expect(toolSchemas.filter_emails.safeParse(validFilter).success).toBe(true);

    const invalidCategory = { category: 'non_existent_category' };
    expect(toolSchemas.filter_emails.safeParse(invalidCategory).success).toBe(false);
  });
});
