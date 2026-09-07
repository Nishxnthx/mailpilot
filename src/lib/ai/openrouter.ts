import { z } from 'zod';

export const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

// Zod Validation Schemas for Server Tool Execution
export const toolSchemas = {
  search_emails: z.object({
    query: z.string().describe('Search query string e.g. "from:hiring" or "assessment"'),
    folder: z.string().optional().describe('Optional folder scope'),
  }),
  open_email: z.object({
    emailId: z.string().describe('ID of the email to open'),
  }),
  get_email_detail: z.object({
    emailId: z.string().describe('ID of the email to fetch detail for'),
  }),
  filter_emails: z.object({
    category: z.enum(['all', 'primary', 'promotions', 'social', 'updates']).optional().describe('Inbox category tab'),
    folder: z.enum(['inbox', 'sent', 'drafts', 'starred', 'archive', 'trash']).optional().describe('Target folder'),
    query: z.string().optional().describe('Optional Gmail search query string e.g. "is:unread newer_than:7d"'),
  }),
  navigate_mailbox: z.object({
    folder: z.enum(['inbox', 'sent', 'drafts', 'starred', 'archive', 'trash']).describe('Target folder name'),
  }),
  prepare_compose: z.object({
    to: z.string().optional().describe('Recipient email address'),
    cc: z.string().optional().describe('CC recipient email address'),
    bcc: z.string().optional().describe('BCC recipient email address'),
    subject: z.string().optional().describe('Email subject line'),
    body: z.string().optional().describe('Email body text'),
  }),
  prepare_reply: z.object({
    emailId: z.string().optional().describe('ID of the email to reply to'),
    to: z.string().optional().describe('Recipient email address'),
    subject: z.string().optional().describe('Reply subject line'),
    body: z.string().optional().describe('Generated reply body text'),
  }),
  prepare_forward: z.object({
    emailId: z.string().optional().describe('ID of the email to forward'),
    to: z.string().optional().describe('Target recipient email address or display name to forward to'),
    subject: z.string().optional().describe('Forward subject line'),
    body: z.string().optional().describe('Forward body text'),
  }),
  summarize_email: z.object({
    emailId: z.string().optional().describe('ID of the email to summarize'),
  }),
  prepare_send: z.object({
    to: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body content'),
    cc: z.string().optional(),
    bcc: z.string().optional(),
  }),
  send_email: z.object({
    to: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body content'),
    cc: z.string().optional(),
    bcc: z.string().optional(),
  }),
};

// OpenAI-compatible Function Tool Definitions for OpenRouter
export const mailPilotOpenRouterTools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_emails',
      description: 'Search and filter emails matching queries across the mailbox. Supports Gmail search operators like "is:unread", "is:read", "newer_than:7d", "newer_than:1d", "newer_than:10d", "after:YYYY/MM/DD", "before:YYYY/MM/DD", "from:<sender>", "subject:<term>". Use this tool whenever the user requests searching or filtering by sender, date/time range, keywords, or read/unread status.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Gmail search query string using search operators e.g. "is:unread newer_than:7d", "from:Sarah newer_than:10d", "is:read after:2026/08/01", "invoice".' },
          folder: { type: 'string', description: 'Optional folder scope e.g. "inbox" or "sent"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'open_email',
      description: 'Open and display a specific email in the UI viewer by its ID.',
      parameters: {
        type: 'object',
        properties: {
          emailId: { type: 'string', description: 'ID of the target email' },
        },
        required: ['emailId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_email_detail',
      description: 'Fetch the full content, body, and metadata of a specific email ID from Gmail.',
      parameters: {
        type: 'object',
        properties: {
          emailId: { type: 'string', description: 'ID of the email to fetch' },
        },
        required: ['emailId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'filter_emails',
      description: 'Apply category tab filters (primary, promotions, social, updates), folder filters, or Gmail search query filters.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category: all, primary, promotions, social, or updates' },
          folder: { type: 'string', description: 'Folder: inbox, sent, drafts, starred, archive, trash' },
          query: { type: 'string', description: 'Gmail search query string e.g. "is:unread newer_than:7d" or "from:Sarah"' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'navigate_mailbox',
      description: 'Switch active folder view in the MailPilot UI.',
      parameters: {
        type: 'object',
        properties: {
          folder: {
            type: 'string',
            description: 'Folder name: inbox, sent, drafts, starred, archive, trash',
          },
        },
        required: ['folder'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'prepare_compose',
      description: 'Open the compose modal UI window with populated draft fields (to, cc, bcc, subject, body) and stage an email for review. Call this tool ONCE. Do NOT call another staging tool in the same turn.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          cc: { type: 'string', description: 'CC recipient email address' },
          bcc: { type: 'string', description: 'BCC recipient email address' },
          subject: { type: 'string', description: 'Subject line' },
          body: { type: 'string', description: 'Email body text' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'prepare_reply',
      description: 'Open reply composer for an email with generated response content. Call this tool ONCE. Do NOT call another staging tool in the same turn.',
      parameters: {
        type: 'object',
        properties: {
          emailId: { type: 'string', description: 'ID of the target email' },
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Reply subject line' },
          body: { type: 'string', description: 'Generated reply body content' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'prepare_forward',
      description: 'Open forward composer for an email with target recipient, subject, and body text. Call this tool ONCE. Do NOT call another staging tool in the same turn.',
      parameters: {
        type: 'object',
        properties: {
          emailId: { type: 'string', description: 'ID of the target email' },
          to: { type: 'string', description: 'Target recipient email address or display name to forward to' },
          subject: { type: 'string', description: 'Forward subject line' },
          body: { type: 'string', description: 'Forward body text' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'summarize_email',
      description: 'Summarize the contents of the currently selected email or specified email ID.',
      parameters: {
        type: 'object',
        properties: {
          emailId: { type: 'string', description: 'ID of email to summarize' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'prepare_send',
      description: 'Stage an email for sending by creating an Action Preview UI card for explicit human confirmation before sending. MANDATORY for ANY prompt asking to "Prepare an email to...", "Send an email to...", "Get an email ready to send...", "Stage an email...", or "Draft an email to review before sending". Creates an Action Preview Card in Copilot panel without opening ComposeModal window. Call this tool ONCE. Do NOT call another staging tool in the same turn.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body text' },
          cc: { type: 'string', description: 'CC email addresses' },
          bcc: { type: 'string', description: 'BCC email addresses' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_email',
      description: 'Stage an email for sending by creating an Action Preview UI card for explicit human confirmation before sending. Call this tool ONCE. Do NOT call another staging tool in the same turn.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body text' },
          cc: { type: 'string', description: 'CC email addresses' },
          bcc: { type: 'string', description: 'BCC email addresses' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
];

export interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenRouterToolCall[];
}

export async function callOpenRouterApi(messages: OpenRouterMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in environment variables (.env.local).');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'MailPilot AI Assistant',
    },
    body: JSON.stringify({
      model,
      messages,
      tools: mailPilotOpenRouterTools,
      tool_choice: 'auto',
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg =
      errorData.error?.message || errorData.message || `OpenRouter API returned HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  const data = await res.json();
  return data;
}
