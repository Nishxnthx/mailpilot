import { EmailFolder, EmailDraft, EmailFilter } from './email';

export type NavigationTarget = EmailFolder | 'settings' | 'help';

export interface UIConfirmationModal {
  isOpen: boolean;
  title: string;
  description: string;
  actionType: 'send_email' | 'delete_email' | 'discard_draft';
  payload?: Record<string, unknown>;
}

export interface CopilotState {
  isOpen: boolean;
  status: 'idle' | 'thinking' | 'executing' | 'error';
  lastActionSummary?: string;
}
