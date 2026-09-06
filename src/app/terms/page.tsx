import React from 'react';
import Link from 'next/link';
import { FileText, Mail, ArrowLeft, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - MailPilot AI',
  description: 'Terms of Service for MailPilot AI-controlled Gmail client application.',
};

export default function TermsOfServicePage() {
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
            <FileText className="h-3.5 w-3.5" />
            <span>Terms & User Agreement</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Last updated: September 6, 2026
          </p>
        </div>

        {/* Section 1: Acceptance of Terms */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">1.</span> Acceptance of Terms
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            By authenticating with Google OAuth and using the MailPilot application (&quot;the Application&quot; or &quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not authenticate or use the Service.
          </p>
        </section>

        {/* Section 2: Description of Service */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">2.</span> Description of Service
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            MailPilot is an AI-powered web mail client that enables users to manage Gmail messages, perform natural language email searches, summarize conversations, compose drafts with AI assistance, and synchronize mailbox updates in real time. MailPilot connects to Google Gmail API services using Google OAuth 2.0.
          </p>
        </section>

        {/* Section 3: Account Responsibility */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">3.</span> Google Account & User Responsibilities
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You are responsible for maintaining the security of your Google Account credentials. You are solely responsible for all activities and emails sent through your Google Account using MailPilot.
          </p>
        </section>

        {/* Section 4: AI Assistant Disclaimer */}
        <section className="p-4 rounded-2xl bg-amber-950/30 border border-amber-900/50 space-y-2">
          <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <span>AI Content Accuracy & Human Confirmation Disclaimer</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            MailPilot utilizes Artificial Intelligence models (via OpenRouter) to assist in drafting, searching, and summarizing emails. AI-generated suggestions, summaries, and email drafts may contain mistakes or inaccuracies. You are strictly responsible for reviewing and verifying all email contents before authorizing a send action. MailPilot enforces human confirmation before executing email send requests.
          </p>
        </section>

        {/* Section 5: Acceptable Use */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">5.</span> Acceptable Use & Conduct
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You agree not to use MailPilot for any unlawful activities, including but not limited to:
          </p>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside pl-2 leading-relaxed">
            <li>Sending unsolicited bulk email (spam), phishing attempts, or fraudulent communications.</li>
            <li>Transmitting malicious code, viruses, or disruptive scripts.</li>
            <li>Attempting to bypass security mechanisms or interfere with third-party API services.</li>
            <li>Violating Google&apos;s Terms of Service or API Use policies.</li>
          </ul>
        </section>

        {/* Section 6: Third-Party Services */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">6.</span> Third-Party Services
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            MailPilot relies on third-party API providers, including Google APIs and OpenRouter. Your use of these third-party services is subject to their respective terms and policies. MailPilot is not responsible for third-party service outages, rate limits, or API modifications.
          </p>
        </section>

        {/* Section 7: Disclaimers & Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">7.</span> Disclaimers & Limitation of Liability
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY LAW, MAILPILOT AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
          </p>
        </section>

        {/* Section 8: Changes to Terms */}
        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400 font-mono">8.</span> Modifications & Contact Information
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We reserve the right to update these terms at any time. Continued use of MailPilot constitutes acceptance of updated terms. For inquiries regarding these terms, contact us at:
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
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="text-blue-400 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
