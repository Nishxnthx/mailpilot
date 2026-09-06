import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - MailPilot AI',
  description: 'Privacy Policy for MailPilot AI-controlled Gmail client application.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-slate-200 hover:text-white transition-colors">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">MailPilot AI</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to MailPilot</span>
          </Link>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8 select-text">
        {/* Document Title Banner */}
        <div className="space-y-3 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-400 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Legal & Privacy Disclosure</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Last updated: September 6, 2026
          </p>
        </div>

        {/* Section 1: Introduction */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">1.</span> Overview & Service Description
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            MailPilot (&quot;we&quot;, &quot;our&quot;, or &quot;the Application&quot;) is an AI-powered Gmail client web application developed for intelligent email management, natural language search, automated composition, and real-time synchronization. MailPilot integrates directly with Google API Services to access your Gmail account upon your explicit authentication via Google OAuth 2.0.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            This Privacy Policy explains how MailPilot accesses, collects, uses, stores, and protects information when you connect your Google Account to our application.
          </p>
        </section>

        {/* Section 2: Information We Access & Collect */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">2.</span> Information We Access & Process
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            To provide email operations and AI assistant capabilities, MailPilot requests access to specific Google user data through standard Gmail API scopes (`gmail.readonly`, `gmail.compose`):
          </p>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside pl-2 leading-relaxed">
            <li>
              <strong className="text-slate-100">Google Account Profile:</strong> Email address and profile display name used for account session identification.
            </li>
            <li>
              <strong className="text-slate-100">Email Messages & Metadata:</strong> Message headers (From, To, Cc, Bcc, Subject, Date, Message-ID), snippet previews, labels, folder assignments, and message body content (HTML and plain text) required to display emails, render detail views, and build conversation threads.
            </li>
            <li>
              <strong className="text-slate-100">OAuth Credentials:</strong> Access tokens and refresh tokens issued by Google OAuth 2.0 to authorize API calls on your behalf.
            </li>
            <li>
              <strong className="text-slate-100">AI Prompt Prompts & Context:</strong> Natural language text prompts submitted to the AI Copilot and relevant email context required to fulfill AI features (such as summarization, searching, or drafting replies).
            </li>
          </ul>
        </section>

        {/* Section 3: How We Use Information */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">3.</span> How We Use Your Data
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your information is used strictly to deliver the user-facing features of the MailPilot application:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="font-semibold text-xs text-blue-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Email Workspace Rendering</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Displaying inbox folders, category tabs, email threads, snippets, and unread counts in the user interface.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="font-semibold text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>AI Function Calling</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Translating natural language requests into Gmail search operators, creating compose drafts, and summarizing emails.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="font-semibold text-xs text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Email Sending & Drafts</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Creating, updating, and sending email drafts via Gmail API following explicit user human confirmation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="font-semibold text-xs text-purple-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Real-Time Synchronization</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Processing Google Cloud Pub/Sub webhooks and Server-Sent Events (SSE) to auto-update thread views without page refreshes.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Third-Party AI Services & OpenRouter */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">4.</span> Third-Party Processing & AI Services
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            MailPilot integrates with third-party infrastructure providers to support AI and authentication capabilities:
          </p>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside pl-2 leading-relaxed">
            <li>
              <strong className="text-slate-100">OpenRouter AI Infrastructure:</strong> When you invoke AI Assistant commands (such as searching, drafting, or summarizing emails), relevant user prompt text and email workspace context are transmitted to configured AI models via OpenRouter for function calling and text generation.
            </li>
            <li>
              <strong className="text-slate-100">Google Cloud Platform:</strong> Authentication tokens and push notification webhooks are processed through official Google Cloud OAuth 2.0 and Pub/Sub endpoints.
            </li>
          </ul>
        </section>

        {/* Section 5: Data Non-Sale & Sharing Commitment */}
        <section className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/50 space-y-2">
          <h2 className="text-base font-bold text-blue-300 flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-400" />
            <span>Strict Data Protection & Non-Sale Commitment</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            MailPilot does NOT sell, rent, or trade your personal information or Gmail data to third parties, advertisers, data brokers, or external entities under any circumstances. Gmail data is accessed strictly to fulfill user-initiated email operations within the application session.
          </p>
        </section>

        {/* Section 6: Security & Token Protection */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">6.</span> Data Security & Token Protection
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We implement industry-standard security measures to safeguard user data:
          </p>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside pl-2 leading-relaxed">
            <li>
              OAuth access and refresh tokens are stored securely in server-side session stores and are never exposed directly to the browser client.
            </li>
            <li>
              Client sessions are identified using encrypted, HTTP-only session cookies protected with `SameSite=Lax` and `Secure` attributes in production environments.
            </li>
            <li>
              Email HTML bodies are sanitized using DOMPurify (`DOMPurify.sanitize`) to prevent cross-site scripting (XSS) attacks before rendering.
            </li>
          </ul>
        </section>

        {/* Section 7: Google API Services User Data Policy Compliance */}
        <section className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Google API Services User Data Policy Compliance</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            MailPilot&apos;s use and transfer to any other app of information received from Google APIs will adhere to{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline font-semibold"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        {/* Section 8: Revocation & User Rights */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">8.</span> Account Revocation & Disconnection
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You retain complete control over your Google Account access. You may disconnect MailPilot at any time by selecting &quot;Disconnect Google Account&quot; in the application interface or by revoking permissions directly in your{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Google Account Permissions
            </a>{' '}
            settings.
          </p>
        </section>

        {/* Section 9: Contact Information */}
        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">9.</span> Contact Us
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            If you have any questions or privacy inquiries regarding MailPilot, please contact the developer team at:
          </p>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-blue-400">
            support@mailpilot.dev
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 bg-slate-950 select-none">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>© 2026 MailPilot AI. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
