# MailPilot ✈️

**MailPilot** is an AI-powered Gmail client web application where an embedded AI Copilot directly controls the email workspace interface using natural language commands and structured tool/function calling.

Production Application: [https://mailpilot-production.onrender.com](https://mailpilot-production.onrender.com)  
Privacy Policy: [https://mailpilot-production.onrender.com/privacy](https://mailpilot-production.onrender.com/privacy)  
Terms of Service: [https://mailpilot-production.onrender.com/terms](https://mailpilot-production.onrender.com/terms)

---

## 1. Project Overview

MailPilot bridges modern generative AI capabilities with real-time email operations. Built as a single-page workspace with an intelligent AI sidebar, MailPilot translates natural language user intent into precise Gmail operations, instant UI filtering, thread viewing, and automated compose/reply preparation.

Gmail serves as the direct, authoritative source of truth for all mailbox data, eliminating database duplication while maintaining low-latency state synchronization via Google Cloud Pub/Sub and Server-Sent Events (SSE).

---

## 2. Features

- **Direct Gmail API Integration**: Authenticates securely via Google OAuth 2.0 with minimal required scopes (`gmail.readonly`, `gmail.compose`, `gmail.modify`).
- **AI-Controlled UI State**: The AI Copilot directly updates client-side Zustand application state (active view, active filter, selected email, compose modal) instead of outputting isolated text blobs.
- **Grouped Thread View**: Main inbox list groups messages by Gmail `threadId` into single, consolidated rows showing sender summaries, thread message counts, and latest snippets.
- **Human-in-the-Loop Safeguards**: Sensitive email sending operations require explicit human confirmation before dispatch.
- **Real-Time Synchronisation**: Instant push notifications via Google Cloud Pub/Sub and Server-Sent Events (SSE) automatically update the workspace without page refreshes.
- **Instant Client-Side Category Filters**: Instant filtering across Primary, Updates, Promotions, Social, Starred, and Unread attributes.
- **XSS-Sanitized Email Viewer**: Full HTML email rendering safely sanitized using DOMPurify.
- **Responsive Dark-Mode Workspace**: Sleek, high-density 3-pane email interface (Sidebar, Mailbox List & Detail Viewer, AI Copilot Drawer).

---

## 3. Gmail Integration

MailPilot integrates directly with official Google API Services using the `@googleapis/gmail` Node.js SDK:

- **Source of Truth**: All emails, drafts, threads, and label counts are fetched directly from live Gmail API endpoints. No user email body content or message data is replicated into an external database.
- **Authorized Scopes**:
  - `https://www.googleapis.com/auth/gmail.readonly` — Fetching message headers, snippets, HTML bodies, and thread metadata.
  - `https://www.googleapis.com/auth/gmail.compose` — Creating, updating, and managing draft messages.
  - `https://www.googleapis.com/auth/gmail.modify` — Performing mailbox state updates (marking read/unread, archiving, trashing).
- **Session Management**: OAuth tokens are exchanged and stored strictly server-side. Browsers communicate via encrypted HttpOnly session cookies.

---

## 4. AI Copilot & Structured Tool/Function Calling

The AI Copilot uses OpenRouter with OpenAI-compatible structured tool calling (`tools` array parameter) backed by Zod schema validation.

### Clean UI Architecture Principle
Rather than outputting redundant email card lists, top-5 preview widgets, or duplicate mailbox components inside the Copilot chat drawer, **AI tool executions directly mutate the main MailPilot workspace state**. The Copilot returns concise, natural language responses, while the central mailbox UI seamlessly displays matching emails, opens selected threads, or pre-fills draft forms.

### Implemented AI Tools / Actions

1. `search_emails`: Searches Gmail using queries or operators (e.g. `is:unread`, `from:alice`) and updates the main mailbox workspace view.
2. `open_email`: Finds and opens a specific email or thread by ID, subject, or sender in the central detail viewer.
3. `get_email_detail`: Fetches comprehensive details for a specific email message.
4. `filter_emails`: Applies instant client-side tab/category filters (Primary, Updates, Promotions, Social, Starred, Unread) to the mailbox list.
5. `navigate_mailbox`: Switches the active mailbox folder view (Inbox, Sent, Starred, Drafts, Trash).
6. `prepare_compose`: Opens the controlled compose modal and pre-fills `to`, `subject`, and `body` fields with animated typing effects.
7. `prepare_reply`: Opens the compose modal pre-configured to reply to a specific email/thread (setting `to`, `subject` (`Re:`), `threadId`, `inReplyTo`, and `references`).
8. `prepare_forward`: Opens the compose modal pre-configured for forwarding an email/thread (setting `subject` (`Fwd:`), pre-filling original body context).
9. `summarize_email`: Generates a concise executive summary of a specified email or active thread.
10. `prepare_send`: Prepares an email draft for dispatch and prompts the user for explicit confirmation.
11. `send_email`: Sends the composed/prepared email via Gmail API following human confirmation.

---

## 5. Human-in-the-Loop Email Sending Confirmation

To prevent accidental or unauthorized automated email dispatches:

1. When asked to compose or send an email, the AI Copilot executes `prepare_compose` or `prepare_send` to populate the controlled compose modal.
2. The compose modal displays the recipient, subject, and generated body content in the UI.
3. **Explicit User Approval**: The email is **NOT** sent automatically. The user must review the contents and explicitly click **Send Email** in the UI to confirm execution.

---

## 6. Real-Time Gmail Synchronization

MailPilot implements a real-time event pipeline for instantaneous mailbox updates:

```
Gmail API  ──>  Google Cloud Pub/Sub  ──>  /api/webhooks/gmail  ──>  Gmail History Processor  ──>  SSE (/api/mail/stream)  ──>  Zustand Store  ──>  UI
```

1. **Watch Registration**: The server registers a push subscription via `gmail.users.watch()` targeting a Google Cloud Pub/Sub topic (`GMAIL_PUBSUB_TOPIC`).
2. **Push Webhooks**: Gmail posts real-time change notifications to `/api/webhooks/gmail`.
3. **Incremental History Fetch**: The webhook handler inspects the incoming `historyId` and queries `gmail.users.history.list()` for incremental changes.
4. **Server-Sent Events (SSE)**: History updates are broadcast to connected browser clients over an active SSE stream (`/api/mail/stream`).
5. **Client Reaction**: The client-side SSE listener receives history events, triggers background reconciliation in `useMailStore`, and updates unread counts and thread views without page reloads.

---

## 7. Search & Filtering

- **Server-Side Gmail Search**: Supports full Gmail search syntax (`from:`, `to:`, `subject:`, `is:unread`, `is:starred`, `after:`, etc.) executed via `/api/mail/search`.
- **Client-Side Category Filtering**: Instant filtering across standard Gmail category labels (`CATEGORY_PERSONAL`/Primary, `CATEGORY_UPDATES`, `CATEGORY_PROMOTIONS`, `CATEGORY_SOCIAL`) and system flags (Starred, Unread).
- **Dynamic Badge Counts**: Unread and category counts are updated optimistically on client actions and reconciled against live Gmail API responses.

---

## 8. Thread Support

- **Main Inbox Thread Grouping**: Gmail messages sharing a `threadId` are grouped into **ONE** consolidated row in the mailbox list (e.g. displaying combined sender names `Nishanth, me 5`, thread message count badge, subject, and latest snippet).
- **Chronological Thread Reader**: Opening a thread retrieves full thread history via `gmail.users.threads.get` and renders all messages chronologically in the central workspace.
- **Thread Continuity**: Reply and Forward operations preserve strict thread metadata (`threadId`, `In-Reply-To`, `References` headers).

---

## 9. UI Capabilities

- **3-Pane Layout**:
  - *Left Sidebar*: Folder navigation (Inbox, Sent, Starred, Drafts, Trash), category tabs, unread count badges, and legal links.
  - *Center Workspace*: Search bar, quick action filters, thread-grouped message list, and HTML detail viewer.
  - *Right AI Copilot*: Conversational drawer with suggested prompt chips and real-time status indicators.
- **Controlled Compose Modal**: Modal interface supporting manual input or AI auto-fill with smooth typing animations.
- **Legal & Public Pages**: Dedicated `/privacy` Policy and `/terms` of Service routes styled cleanly in dark mode.

---

## 10. Architecture

MailPilot follows a decoupled, state-driven architecture:

- **Client Layer**: React 18, Next.js App Router, Tailwind CSS, Lucide icons, Zustand state stores (`useMailStore`, `useCopilotStore`).
- **Server API Layer**: Next.js App Router API endpoints (`/api/mail/*`, `/api/ai/*`, `/api/auth/*`, `/api/webhooks/*`).
- **Integration Layer**: Official Google APIs SDK (`googleapis`), OpenRouter AI SDK interface (OpenAI-compatible fetch with Zod schema validation).
- **Sync & Push Engine**: Google Cloud Pub/Sub push webhooks and Server-Sent Events (SSE).

---

## 11. Architectural Principles

1. **Gmail as Source of Truth**: Live Gmail API requests serve mailbox content; no local database replication of email data.
2. **State-Driven UI & Controlled Stores**: Client state is centralized in Zustand, giving the AI Copilot transparent read/write control over the interface.
3. **Structured AI Tool Calling**: Deterministic Zod schemas prevent regex parsing errors and ensure type-safe function execution.
4. **Main UI State Control**: AI function calls directly manipulate workspace selection, search filters, and compose states instead of polluting the chat stream with list widgets.
5. **Human-in-the-Loop Safety**: Sensitive actions (sending mail) require explicit user confirmation.
6. **Server-Side Token Security**: OAuth credentials and AI API keys reside exclusively on the server. Clients hold opaque, encrypted HttpOnly session cookies.

---

## 12. Project Directory Structure

```
C:\Projects\Nebula Mail Project\
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/chat/               # OpenRouter AI chat & tool execution endpoint
│   │   │   ├── auth/google/           # OAuth login, callback, status, disconnect endpoints
│   │   │   ├── mail/                  # Mail endpoints (inbox, sent, thread, search, drafts, send, stream, counts)
│   │   │   └── webhooks/gmail/        # Google Cloud Pub/Sub webhook endpoint
│   │   ├── privacy/                   # Privacy Policy page (/privacy)
│   │   ├── terms/                     # Terms of Service page (/terms)
│   │   ├── globals.css                # Global Tailwind CSS styles & dark theme
│   │   ├── layout.tsx                 # Root application layout
│   │   └── page.tsx                   # Main MailPilot workspace view
│   ├── components/
│   │   ├── assistant/                 # AI Copilot drawer component
│   │   ├── layout/                    # Header, Sidebar, FilterPopover
│   │   ├── mail/                      # EmailWorkspace, EmailList, EmailDetailViewer, ComposeModal
│   │   └── ui/                        # Reusable UI primitives (badge, button, input)
│   ├── lib/
│   │   ├── ai/openrouter.ts           # OpenRouter client & Zod tool definitions
│   │   ├── gmail/                     # Gmail API client, OAuth flow, session store, history processor, SSE stream, watch
│   │   └── utils/                     # DOMPurify HTML sanitizer & utility helpers
│   ├── stores/                        # Zustand stores (useMailStore, useCopilotStore)
│   └── types/                         # TypeScript domain models (email, appState)
├── tests/
│   ├── e2e/                           # Playwright end-to-end test suite
│   │   └── critical-path.spec.ts
│   └── unit/                          # Vitest unit test suite (12 test suites, 58 tests)
│       ├── ai-compose-animation.test.ts
│       ├── ai-response-ui.test.ts
│       ├── ai-send-safety.test.ts
│       ├── ai-tool-schemas.test.ts
│       ├── html-sanitization.test.ts
│       ├── inbox-category-defaults.test.ts
│       ├── inflight-dedup.test.ts
│       ├── mailbox-cache.test.ts
│       ├── optimistic-counts.test.ts
│       ├── realtime-sse.test.ts
│       ├── search-query.test.ts
│       └── thread-behavior.test.ts
├── next.config.mjs                    # Next.js configuration
├── package.json                       # Dependencies & scripts
├── tailwind.config.ts                 # Tailwind styling configuration
├── tsconfig.json                      # TypeScript configuration
└── vitest.config.ts                   # Vitest unit testing configuration
```

---

## 13. Tech Stack

- **Framework**: Next.js 14.2 (App Router), React 18
- **Language**: TypeScript 5.6
- **Styling & UI**: Tailwind CSS 3.4, Lucide React icons, Class Variance Authority (`cva`), `clsx`, `tailwind-merge`
- **State Management**: Zustand 4.5
- **Mail Integration**: Official Google APIs Node.js SDK (`googleapis` 178.0)
- **Real-Time Sync**: Google Cloud Pub/Sub, Server-Sent Events (SSE)
- **AI Engine**: OpenRouter API (`google/gemini-2.5-flash` / configurable models) with OpenAI-compatible tool calling
- **Schema Validation**: Zod 3.23
- **Security & Sanitization**: DOMPurify 3.4 (`dompurify`, `@types/dompurify`)
- **Testing**: Vitest 2.1 (Unit & Integration), Playwright 1.50 (E2E)
- **Deployment**: Render Web Service (`https://mailpilot-production.onrender.com`)

---

## 14. Getting Started

### Prerequisites
- Node.js 18+ and `npm`
- Google Cloud Project with Gmail API enabled and OAuth 2.0 Client Credentials
- OpenRouter API Key

### Setup Instructions

```bash
# 1. Clone repository and install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables section)

# 3. Start local development server
npm run dev

# 4. Open application in browser
# http://localhost:3000
```

### Build & Utility Commands

```bash
# Run unit tests
npm test

# Run linter
npm run lint

# Build for production
npm run build

# Start production server locally
npm start
```

---

## 15. Environment Variables

Create a `.env.local` file in the project root. Secrets and private credentials must never be committed to Git.

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Cloud Pub/Sub Topic (for Real-time Sync)
GMAIL_PUBSUB_TOPIC=projects/your-project-id/topics/gmail-notifications

# OpenRouter AI Configuration
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=google/gemini-2.5-flash

# Application URLs & Session Security
APP_URL=http://localhost:3000
SESSION_SECRET=your-random-32-character-secret
```

---

## 16. Testing

MailPilot maintains unit, integration, and end-to-end test coverage across critical workflows:

### Unit & Integration Tests (Vitest)
Run with `npm test` (12 test suites, 58 unit tests):

- `ai-compose-animation.test.ts`: Validates AI auto-fill typing animation logic and field updates.
- `ai-response-ui.test.ts`: Verifies AI response formatting and clean UI control rules.
- `ai-send-safety.test.ts`: Ensures AI actions cannot execute email sends without user confirmation.
- `ai-tool-schemas.test.ts`: Validates Zod schemas for all 11 AI function tools.
- `html-sanitization.test.ts`: Verifies DOMPurify XSS sanitization across malicious HTML emails.
- `inbox-category-defaults.test.ts`: Checks category mapping rules for Primary, Updates, Promotions, and Social.
- `inflight-dedup.test.ts`: Tests deduplication of concurrent API requests.
- `mailbox-cache.test.ts`: Verifies client-side caching and cache invalidation in `useMailStore`.
- `optimistic-counts.test.ts`: Validates optimistic unread count updates and server reconciliation.
- `realtime-sse.test.ts`: Tests SSE stream event parsing and event handler dispatch.
- `search-query.test.ts`: Verifies Gmail search query construction from user inputs.
- `thread-behavior.test.ts`: Validates thread grouping, thread ID matching, message count badges, and reply/forward thread header continuity.

### End-to-End Tests (Playwright)
Run with `npm run test:e2e`:

- `tests/e2e/critical-path.spec.ts`: Validates application loading, sidebar navigation, mail listing, filter switching, compose modal controls, and AI sidebar interaction.

---

## 17. Production Deployment

MailPilot is deployed live on Render as a Node.js Web Service:

- **Production URL**: [https://mailpilot-production.onrender.com](https://mailpilot-production.onrender.com)
- **Privacy Policy**: [https://mailpilot-production.onrender.com/privacy](https://mailpilot-production.onrender.com/privacy)
- **Terms of Service**: [https://mailpilot-production.onrender.com/terms](https://mailpilot-production.onrender.com/terms)

### Deployment Configuration
- Build Command: `npm run build`
- Start Command: `npm start`
- Environment Variables: Configured securely via Render Dashboard.

---

## 18. Security & Privacy

- **Token & Key Isolation**: `GOOGLE_CLIENT_SECRET`, `OPENROUTER_API_KEY`, and `SESSION_SECRET` are kept strictly in server-side environment variables and are excluded from Git repository history.
- **Server-Side Session Store**: Google OAuth access and refresh tokens are handled exclusively on the server. The client browser receives an opaque session identifier via an `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
- **XSS Protection**: All email HTML content is sanitized using `DOMPurify.sanitize()` prior to rendering in the DOM.
- **Limited Data Use**: Gmail data is accessed ephemerally to fulfill active user requests and is never stored, sold, or shared with third parties for advertising or AI training.

---

## 19. Design Trade-offs

- **Direct Gmail API vs. Database Replication**:
  - *Trade-off*: Fetching directly from Gmail eliminates database sync drift, storage costs, and privacy compliance risks, but requires robust client-side caching (`useMailStore`) and Pub/Sub SSE push notifications to maintain snappy UI performance.
- **Main UI Control vs. Chat Result Widgets**:
  - *Trade-off*: Updating the main workspace UI directly instead of rendering search result cards inside the Copilot chat drawer keeps the AI assistant conversational and uncluttered, matching standard desktop email client UX.
- **Mandatory Confirmation vs. Autonomous AI Sending**:
  - *Trade-off*: Requiring explicit human approval before dispatching emails prevents unintended sends, prioritizing user safety over fully autonomous execution.

---

## 20. Future Improvements

- Multi-account Google OAuth switching.
- Offline read-only mode using IndexedDB cache for draft creation while offline.
- Custom AI writing persona and tone selector in compose modal.
- Advanced Gmail label management (creating, coloring, and deleting custom labels).

---

## 21. Summary

MailPilot demonstrates a production-grade, secure, AI-controlled email client built on Next.js 14 and the official Gmail API. By leveraging structured tool calling, real-time Pub/Sub SSE push updates, Zustand state management, and human-in-the-loop safety controls, MailPilot delivers a modern, intelligent email workspace while strictly preserving data privacy and user control.
