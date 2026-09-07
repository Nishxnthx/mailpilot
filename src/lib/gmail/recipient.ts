import { fetchMailList } from './service';

/**
 * Resolves a recipient input string (display name or email address) to a single verified email address.
 * If input is a display name without '@', queries Gmail for matching contacts/emails.
 */
export async function resolveRecipientEmail(inputTo: string): Promise<{ resolvedEmail?: string; candidateEmails: string[] }> {
  const trimmed = inputTo.trim();
  if (!trimmed) return { candidateEmails: [] };

  // If input already contains a valid email address
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = trimmed.match(emailRegex);
  if (match) {
    return { resolvedEmail: match[1], candidateEmails: [match[1]] };
  }

  // Input is a display name (e.g. "Nishanth Sivakumar" or "Nishanth")
  try {
    const searchRes = await fetchMailList({ query: trimmed });
    const candidates = new Set<string>();
    const lowerInput = trimmed.toLowerCase();

    for (const email of searchRes.emails) {
      if (email.from?.email && email.from.email.includes('@')) {
        const fromName = (email.from.name || '').toLowerCase();
        const fromEmail = email.from.email.toLowerCase();
        if (fromName.includes(lowerInput) || fromEmail.includes(lowerInput)) {
          candidates.add(email.from.email);
        }
      }
      if (Array.isArray(email.to)) {
        for (const recipient of email.to) {
          if (recipient.email && recipient.email.includes('@')) {
            const toName = (recipient.name || '').toLowerCase();
            const toEmail = recipient.email.toLowerCase();
            if (toName.includes(lowerInput) || toEmail.includes(lowerInput)) {
              candidates.add(recipient.email);
            }
          }
        }
      }
    }

    const candidateList = Array.from(candidates);
    if (candidateList.length === 1) {
      return { resolvedEmail: candidateList[0], candidateEmails: candidateList };
    }
    return { candidateEmails: candidateList };
  } catch {
    return { candidateEmails: [] };
  }
}
