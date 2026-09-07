import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatForwardBody(msg: {
  from?: { name?: string; email?: string } | string;
  to?: Array<{ name?: string; email?: string }> | string;
  date?: string;
  subject?: string;
  bodyText?: string;
  snippet?: string;
}): string {
  if (!msg) return '';

  let senderStr = '';
  if (typeof msg.from === 'object' && msg.from) {
    senderStr = msg.from.name ? `${msg.from.name} <${msg.from.email}>` : (msg.from.email || '');
  } else {
    senderStr = String(msg.from || '');
  }

  let toStr = '';
  if (Array.isArray(msg.to)) {
    toStr = msg.to.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email)).join(', ');
  } else if (typeof msg.to === 'object' && msg.to) {
    toStr = (msg.to as any).name ? `${(msg.to as any).name} <${(msg.to as any).email}>` : ((msg.to as any).email || '');
  } else {
    toStr = String(msg.to || '');
  }

  const rawBody = msg.bodyText || msg.snippet || '';
  const dateStr = formatDate(msg.date || '');
  return `\n\n---------- Forwarded message ---------\nFrom: ${senderStr}\nDate: ${dateStr}\nSubject: ${msg.subject || ''}\nTo: ${toStr}\n\n${rawBody}`;
}
