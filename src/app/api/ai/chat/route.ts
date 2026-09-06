import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouterApi, toolSchemas, OpenRouterMessage } from '@/lib/ai/openrouter';
import { fetchMailList, fetchMailDetail } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export interface TimelineStep {
  step: 'understanding' | 'tool_selected' | 'execution' | 'result' | 'action';
  label: string;
  detail?: string;
  timestamp: string;
}

export interface UIAction {
  type: 'navigate_mailbox' | 'filter_emails' | 'search_emails' | 'open_email' | 'prepare_compose' | 'prepare_reply' | 'prepare_forward' | 'prepare_send';
  payload: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'OPENROUTER_API_KEY_MISSING',
          message: 'OPENROUTER_API_KEY is not configured in environment variables (.env.local).',
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { message, context, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'INVALID_PROMPT', message: 'Prompt message is required.' }, { status: 400 });
    }

    const timeline: TimelineStep[] = [
      {
        step: 'understanding',
        label: 'Understanding request',
        detail: `Analyzing prompt: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        timestamp: new Date().toISOString(),
      },
    ];

    const uiActions: UIAction[] = [];
    let actionPreview: Record<string, unknown> | null = null;
    let finalReplyText = '';

    // Build context summary for OpenRouter model
    const contextSummary = context
      ? `CURRENT WORKSPACE CONTEXT:
- Active Folder: ${context.activeFolder || 'inbox'}
- Active Category: ${context.activeCategory || 'all'}
- Search Query: "${context.searchQuery || ''}"
- Selected Email ID: ${context.selectedEmailId || 'none'}
- Selected Email Details: ${context.selectedEmail ? JSON.stringify({
    id: context.selectedEmail.id,
    subject: context.selectedEmail.subject,
    from: context.selectedEmail.from,
    to: context.selectedEmail.to,
    date: context.selectedEmail.date,
    snippet: context.selectedEmail.snippet,
  }) : 'none'}
- Visible Email Summaries (Top 5): ${context.visibleEmails ? JSON.stringify(context.visibleEmails) : 'none'}`
      : '';

    const systemInstruction = `You are MailPilot AI Assistant, an intelligent copilot integrated into the MailPilot email web application.
You control the MailPilot UI through tools. When a user asks to search, filter, navigate, open, compose, reply, or forward, use the appropriate tool instead of merely explaining how to do it.

CRITICAL UI CONTROL & SEARCH INSTRUCTIONS:
1. Tool Execution Requirement: Always call a tool to execute actions. NEVER state that filtering by time range, date, sender, or read/unread state is unsupported.
2. Gmail Search Query Translation: The "search_emails" tool performs Gmail API-backed searches. Translate all natural-language filter requests into valid Gmail search operator queries:
   - Read / Unread: "is:unread", "is:read"
   - Date / Time Ranges: "newer_than:7d" (this week / last 7 days), "newer_than:1d" (today / 24h), "newer_than:10d" (last 10 days), "newer_than:30d" (this month), "after:YYYY/MM/DD", "before:YYYY/MM/DD", "older_than:30d"
   - Sender / Recipient: "from:<name_or_email>", "to:<name_or_email>"
   - Subject & Keywords: "subject:<term>", or free text terms
   - COMBINING OPERATORS: Combine multiple filters in single query string as needed!
     Examples:
     - "Show me unread emails from this week" -> call search_emails with query: "is:unread newer_than:7d"
     - "Show unread emails from today" -> call search_emails with query: "is:unread newer_than:1d"
     - "Show me emails from Sarah from the last 10 days" -> call search_emails with query: "from:Sarah newer_than:10d"
     - "Show read emails from last month" -> call search_emails with query: "is:read newer_than:30d"
     - "Show emails from John with subject project" -> call search_emails with query: "from:John subject:project"
3. Server Tool Execution:
   - For searching or filtering emails by sender, date range, read/unread status, or keyword, call "search_emails".
   - For reading full details of an email, call "get_email_detail".
   - For opening an email in the UI, call "open_email".
   - For summarizing an email, call "summarize_email" or use "get_email_detail" to read and summarize.
4. UI Control Actions:
   - For switching folder views, call "navigate_mailbox".
   - For applying category/folder/query filters, call "filter_emails".
   - For drafting new emails, call "prepare_compose".
   - For replying, call "prepare_reply".
   - For forwarding, call "prepare_forward".
   - For sending emails, call "prepare_send" or "send_email".
5. Security & Human Confirmation (CRITICAL MANDATE):
   - You MUST call "prepare_send" (or "send_email") whenever the user asks to "prepare an email...", "send an email...", "get an email ready to send...", "write and send an email to...", "stage an email...", or "draft an email to review before sending".
   - Calling "prepare_send" creates an Action Preview Card in the Copilot panel for human confirmation. It DOES NOT open the ComposeModal window.
   - Use "prepare_compose" ONLY when the user explicitly requests opening the compose window (e.g., "open composer modal", "open a new message window").
   - NEVER claim an email has been directly sent without human confirmation. Calling "prepare_send" stages an Action Preview UI card for explicit human confirmation. You cannot directly execute email sending; the user must click the confirmation button in the UI.
6. Context Awareness:
   - Use the provided CURRENT WORKSPACE CONTEXT (active folder, selected email ID and details, search query, visible emails) to answer contextual requests like "reply to this" or "summarize this email".
7. Be concise, professional, helpful, and clear in your final text response.`;

    // Convert previous chat history into OpenRouter OpenAI-compatible messages format
    const conversationMessages: OpenRouterMessage[] = [];

    // System instruction message
    conversationMessages.push({
      role: 'system',
      content: `${systemInstruction}\n\n${contextSummary}`,
    });

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role && msg.content) {
          conversationMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: String(msg.content).substring(0, 1000),
          });
        }
      }
    }

    // Append latest user message
    conversationMessages.push({
      role: 'user',
      content: message,
    });

    // Multi-Turn Function Calling Loop (max 5 turns)
    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      turns++;

      const apiResponse = await callOpenRouterApi(conversationMessages);

      if (!apiResponse.choices || apiResponse.choices.length === 0) {
        throw new Error('OpenRouter returned an empty choices response.');
      }

      const choice = apiResponse.choices[0];
      const assistantMessage = choice.message;

      // If model returned no tool calls, capture final text response and exit loop
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalReplyText = assistantMessage.content || 'Action processed successfully.';
        timeline.push({
          step: 'result',
          label: 'Done',
          timestamp: new Date().toISOString(),
        });
        break;
      }

      // Preserve assistant tool_calls turn in conversation history
      conversationMessages.push({
        role: 'assistant',
        content: assistantMessage.content || null,
        tool_calls: assistantMessage.tool_calls,
      });

      // Process tool calls requested by OpenRouter model
      for (const toolCall of assistantMessage.tool_calls) {
        const callId = toolCall.id;
        const functionName = toolCall.function.name;
        let rawArgs: Record<string, unknown> = {};

        try {
          rawArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          rawArgs = {};
        }

        let userFriendlyLabel = 'Processing request...';
        let userFriendlyDetail: string | undefined = undefined;

        if (functionName === 'search_emails') {
          userFriendlyLabel = 'Checking your inbox...';
          userFriendlyDetail = 'Finding matching emails';
        } else if (functionName === 'get_email_detail' || functionName === 'summarize_email') {
          userFriendlyLabel = 'Reading conversation...';
          userFriendlyDetail = 'Extracting message details';
        } else if (functionName === 'open_email') {
          userFriendlyLabel = 'Opening conversation...';
        } else if (functionName === 'navigate_mailbox') {
          userFriendlyLabel = 'Opening mailbox view...';
        } else if (functionName === 'filter_emails') {
          userFriendlyLabel = 'Filtering emails...';
        } else if (functionName === 'prepare_compose') {
          userFriendlyLabel = 'Creating your email...';
        } else if (functionName === 'prepare_reply') {
          userFriendlyLabel = 'Drafting your reply...';
        } else if (functionName === 'prepare_forward') {
          userFriendlyLabel = 'Preparing forwarded message...';
        } else if (functionName === 'prepare_send' || functionName === 'send_email') {
          userFriendlyLabel = 'Preparing email to send...';
        }

        timeline.push({
          step: 'tool_selected',
          label: userFriendlyLabel,
          detail: userFriendlyDetail,
          timestamp: new Date().toISOString(),
        });

        let toolResultData: Record<string, unknown> = {};

        // Execute server data tools or stage UI actions
        if (functionName === 'search_emails') {
          const validArgs = toolSchemas.search_emails.parse(rawArgs);
          const searchRes = await fetchMailList({ query: validArgs.query, folder: (validArgs.folder as any) || undefined });
          toolResultData = {
            emailsCount: searchRes.emails.length,
            resultSizeEstimate: searchRes.resultSizeEstimate,
            sampleEmails: searchRes.emails.slice(0, 5).map((e) => ({
              id: e.id,
              subject: e.subject,
              from: e.from,
              date: e.date,
              snippet: e.snippet,
            })),
          };
          uiActions.push({ type: 'search_emails', payload: validArgs });
        } else if (functionName === 'get_email_detail' || functionName === 'summarize_email') {
          const validArgs = toolSchemas.get_email_detail.parse({
            emailId: rawArgs.emailId || context?.selectedEmailId || (context?.visibleEmails?.[0]?.id ?? ''),
          });
          let emailDetail: Record<string, unknown> = {};
          if (validArgs.emailId) {
            const fetched = await fetchMailDetail(validArgs.emailId);
            emailDetail = {
              id: fetched.id,
              subject: fetched.subject,
              from: fetched.from,
              to: fetched.to,
              date: fetched.date,
              snippet: fetched.snippet,
              bodySnippet: (fetched.bodyText || fetched.snippet).substring(0, 500),
            };
          } else if (context?.selectedEmail) {
            emailDetail = context.selectedEmail;
          }
          toolResultData = emailDetail;
          if (validArgs.emailId) {
            uiActions.push({ type: 'open_email', payload: { emailId: validArgs.emailId } });
          }
        } else if (functionName === 'open_email') {
          const validArgs = toolSchemas.open_email.parse(rawArgs);
          toolResultData = { status: 'staged_for_ui', emailId: validArgs.emailId };
          uiActions.push({ type: 'open_email', payload: validArgs });
        } else if (functionName === 'navigate_mailbox') {
          const validArgs = toolSchemas.navigate_mailbox.parse(rawArgs);
          toolResultData = { status: 'staged_for_ui', folder: validArgs.folder };
          uiActions.push({ type: 'navigate_mailbox', payload: validArgs });
        } else if (functionName === 'filter_emails') {
          const validArgs = toolSchemas.filter_emails.parse(rawArgs);
          if (validArgs.query) {
            const searchRes = await fetchMailList({ query: validArgs.query, folder: (validArgs.folder as any) || undefined });
            toolResultData = {
              status: 'staged_for_ui',
              filter: validArgs,
              emailsCount: searchRes.emails.length,
              sampleEmails: searchRes.emails.slice(0, 5).map((e) => ({
                id: e.id,
                subject: e.subject,
                from: e.from,
                date: e.date,
                snippet: e.snippet,
              })),
            };
          } else {
            toolResultData = { status: 'staged_for_ui', filter: validArgs };
          }
          uiActions.push({ type: 'filter_emails', payload: validArgs });
        } else if (functionName === 'prepare_compose') {
          const validArgs = toolSchemas.prepare_compose.parse(rawArgs);
          toolResultData = { status: 'staged_for_ui', draft: validArgs };
          uiActions.push({ type: 'prepare_compose', payload: validArgs });
        } else if (functionName === 'prepare_reply') {
          const targetEmailId = rawArgs.emailId || context?.selectedEmailId;
          const validArgs = toolSchemas.prepare_reply.parse({
            ...rawArgs,
            emailId: targetEmailId,
            to: rawArgs.to || context?.selectedEmail?.from?.email || context?.selectedEmail?.from,
          });
          toolResultData = { status: 'staged_for_ui', reply: validArgs };
          uiActions.push({ type: 'prepare_reply', payload: validArgs });
        } else if (functionName === 'prepare_forward') {
          const targetEmailId = rawArgs.emailId || context?.selectedEmailId;
          const validArgs = toolSchemas.prepare_forward.parse({
            ...rawArgs,
            emailId: targetEmailId,
          });
          toolResultData = { status: 'staged_for_ui', forward: validArgs };
          uiActions.push({ type: 'prepare_forward', payload: validArgs });
        } else if (functionName === 'prepare_send' || functionName === 'send_email') {
          const validArgs = toolSchemas.prepare_send.parse(rawArgs);
          toolResultData = { status: 'staged_for_action_preview', stagedSend: validArgs };
          actionPreview = validArgs;
          uiActions.push({ type: 'prepare_send', payload: validArgs });
        }

        // Append tool result message to conversation history for OpenRouter
        conversationMessages.push({
          role: 'tool',
          tool_call_id: callId,
          name: functionName,
          content: JSON.stringify(toolResultData),
        });
      }
    }

    return NextResponse.json({
      reply: finalReplyText || 'Task completed successfully.',
      uiActions,
      timeline,
      actionPreview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process AI chat request';
    console.error('[API /api/ai/chat Error]:', message);
    return NextResponse.json(
      {
        error: 'AI_CHAT_ERROR',
        message,
      },
      { status: 500 }
    );
  }
}
