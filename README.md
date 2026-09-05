# MailPilot ✈️

**MailPilot** is an AI-powered email web application where an embedded AI Copilot directly controls the email application UI through natural language commands and structured function calls.

---

## 🎯 Architectural Principles

1. **Separation of Concerns**: UI components, Mail Service abstractions, AI tools, Zustand application state, and database persistence layers are isolated cleanly.
2. **State-Driven UI & Controlled Fields**: Mail compose inputs, navigation, active filters, and selection states are completely driven by Zustand client stores, enabling the AI Copilot to inspect and control the interface transparently.
3. **Structured AI Function Calling**: The AI Assistant uses Vercel AI SDK function tools rather than fragile regex or keyword matching.
4. **Isolated Mail Service**: Gmail API interactions are confined strictly to a dedicated server-side mail service layer. Gmail messages are fetched directly without unneeded database duplication.
5. **Human-in-the-Loop Side Effects**: Sensitive side-effect operations (e.g. sending emails) support user confirmation flows before execution.
6. **Strict Security**: OAuth tokens and AI secrets remain strictly server-side.

---

## 📁 Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/        # Vercel AI SDK route handlers & tools
│   │   ├── auth/      # Google OAuth 2.0 auth endpoints
│   │   └── gmail/     # Server-side Gmail service proxy routes
│   ├── globals.css    # Global Tailwind styles & dark mode themes
│   ├── layout.tsx     # Root application layout
│   └── page.tsx       # MailPilot main workspace view
├── components/
│   ├── assistant/    # AI Copilot drawer & chat interface
│   ├── layout/       # App Shell header, sidebar & navigation
│   ├── mail/         # Mail workspace list, viewer & compose modal
│   └── ui/           # Reusable UI primitives (shadcn-style)
├── lib/
│   ├── ai/           # Tool definitions & copilot prompt engineering
│   ├── db/           # Supabase & Drizzle schema / persistence
│   ├── gmail/        # Google OAuth & Gmail API client SDK
│   └── utils/        # Classname merging and format helpers
├── stores/           # Zustand client state (Mail & Copilot)
└── types/            # TypeScript domain types (Email, AppState, AI)
```

---

## 🚀 Planned Capabilities

- **Natural Language Navigation**: Switch between Inbox, Sent, Drafts, and Trash.
- **Natural Language Search & Filtering**: Search emails by query, sender, date, or subject.
- **AI Compose Assistance**: Autopopulate recipient, subject, and body fields dynamically into controlled compose forms.
- **Smart Reply Preparation**: Generate tailored draft responses directly inside the compose modal.
- **Human Confirmation Flow**: Interactive confirmation dialogs before sending emails or deleting messages.

---

## 🛠️ Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local

# 3. Start development server
npm run dev
```
