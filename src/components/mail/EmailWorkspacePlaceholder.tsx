'use client';

import React from 'react';
import { Mail, CheckCircle2, ShieldAlert, Sparkles, Filter, RefreshCw, Plug } from 'lucide-react';
import { useMailStore } from '@/stores/useMailStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const EmailWorkspacePlaceholder: React.FC = () => {
  const activeFolder = useMailStore((state) => state.activeFolder);
  const searchQuery = useMailStore((state) => state.searchQuery);
  const openCompose = useMailStore((state) => state.openCompose);
  const isGmailConnected = useMailStore((state) => state.isGmailConnected);

  const folderTitle = activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1);

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <main className="flex-1 flex flex-col bg-slate-950/30 overflow-hidden">
      {/* Workspace Toolbar / Header */}
      <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/40 select-none">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-100">{folderTitle}</h1>
          {searchQuery && (
            <Badge variant="outline" className="gap-1 bg-blue-950/40 text-blue-400 border-blue-800/50">
              <Filter className="h-3 w-3" />
              <span>Query: &quot;{searchQuery}&quot;</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-slate-400 gap-1.5" disabled>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Empty State / Integration Status Placeholder */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-xl w-full text-center space-y-6 bg-slate-900/50 p-8 rounded-2xl border border-slate-800/80 backdrop-blur">
          {/* Icon Badge */}
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              MailPilot Workspace Ready
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The application foundation and Gmail OAuth 2.0 security layer are established.
              {isGmailConnected
                ? ' Your Gmail account is connected! Next milestone will fetch real messages directly from Gmail API.'
                : ' Click "Connect Gmail" to initiate the Google OAuth consent flow.'}
            </p>
          </div>

          {/* Architecture Status Checklist */}
          <div className="text-left bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
            <h3 className="font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Architectural Milestone Status</span>
            </h3>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Next.js App Router + TypeScript + Tailwind CSS structure</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Zustand store driving navigation & compose state</span>
              </li>
              <li className="flex items-center gap-2">
                {isGmailConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                )}
                <span className={isGmailConnected ? 'text-slate-300' : 'text-amber-300 font-medium'}>
                  Gmail OAuth 2.0 Layer ({isGmailConnected ? 'Connected' : 'Ready to Connect'})
                </span>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <ShieldAlert className="h-4 w-4 text-slate-600 shrink-0" />
                <span>Vercel AI SDK Copilot Integration & Structured Tools (Next milestone)</span>
              </li>
            </ul>
          </div>

          {/* Test & OAuth Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!isGmailConnected ? (
              <Button
                onClick={handleConnectGmail}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto font-medium"
              >
                <Plug className="h-4 w-4" />
                <span>Connect Gmail Account</span>
              </Button>
            ) : (
              <Button
                onClick={() => openCompose({ to: 'hiring-manager@company.com', subject: 'Gmail OAuth Connected', body: 'Gmail OAuth 2.0 integration is complete and authenticated.' })}
                className="gap-2 bg-blue-600 hover:bg-blue-500 text-white w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Test State-Driven Compose</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
