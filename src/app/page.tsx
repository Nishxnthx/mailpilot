import React from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { EmailWorkspace } from '@/components/mail/EmailWorkspace';
import { ComposeModal } from '@/components/mail/ComposeModal';
import { CopilotPanelPlaceholder } from '@/components/assistant/CopilotPanelPlaceholder';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950">
      {/* Header Bar */}
      <Header />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Central Live Email Workspace */}
        <EmailWorkspace />

        {/* Right AI Copilot Drawer */}
        <CopilotPanelPlaceholder />
      </div>

      {/* Controlled Compose Modal */}
      <ComposeModal />
    </div>
  );
}
