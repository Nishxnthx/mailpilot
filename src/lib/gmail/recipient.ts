import { fetchMailList } from './service';

export interface RecipientResolutionResult {
  resolvedEmail?: string;
  candidateEmails: string[];
}

/**
 * Resolves a recipient input string (display name or email address) to a single verified email address.
 * Queries Gmail API headers (From, To, Cc, Reply-To) across all messages when given a name or partial name.
 */
export async function resolveRecipientEmail(inputTo: string): Promise<RecipientResolutionResult> {
  const trimmed = inputTo.trim();
  if (!trimmed) return { candidateEmails: [] };

  // 1. If input already contains a valid email address (e.g., "john@example.com" or "John <john@example.com>")
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = trimmed.match(emailRegex);
  if (match) {
    return { resolvedEmail: match[1], candidateEmails: [match[1]] };
  }

  // 2. Input is a display name or partial name (e.g., "kaviyanagaraj", "Kaviyanagaraj", "Nishanth Sivakumar")
  try {
    // Execute global search across all messages without folder restriction
    const searchRes = await fetchMailList({ query: trimmed, folder: undefined, maxResults: 50 });
    const candidates = new Set<string>();
    const lowerInput = trimmed.toLowerCase();
    const inputTokens = lowerInput.split(/\s+/).filter(Boolean);

    for (const email of searchRes.emails) {
      const headerAddresses: Array<{ name?: string; email: string }> = [];

      // Check From
      if (email.from?.email) {
        headerAddresses.push({ name: email.from.name, email: email.from.email });
      }

      // Check To
      if (Array.isArray(email.to)) {
        for (const recipient of email.to) {
          if (recipient.email) {
            headerAddresses.push({ name: recipient.name, email: recipient.email });
          }
        }
      }

      // Check Cc
      if (Array.isArray(email.cc)) {
        for (const recipient of email.cc) {
          if (recipient.email) {
            headerAddresses.push({ name: recipient.name, email: recipient.email });
          }
        }
      }

      // Check Bcc if present
      if (Array.isArray(email.bcc)) {
        for (const recipient of email.bcc) {
          if (recipient.email) {
            headerAddresses.push({ name: recipient.name, email: recipient.email });
          }
        }
      }

      // Evaluate each extracted address
      for (const addr of headerAddresses) {
        if (!addr.email || !addr.email.includes('@')) continue;

        const nameLower = (addr.name || '').toLowerCase();
        const emailLower = addr.email.toLowerCase();

        // Case-insensitive & partial substring matching:
        const matchesFull = nameLower.includes(lowerInput) || emailLower.includes(lowerInput);
        const matchesTokens =
          inputTokens.length > 0 &&
          inputTokens.every((token) => nameLower.includes(token) || emailLower.includes(token));

        if (matchesFull || matchesTokens) {
          candidates.add(addr.email);
        }
      }
    }

    const candidateList = Array.from(candidates);
    if (candidateList.length === 1) {
      return { resolvedEmail: candidateList[0], candidateEmails: candidateList };
    }
    return { candidateEmails: candidateList };
  } catch (err) {
    console.error('[Recipient Resolution Error]:', err);
    return { candidateEmails: [] };
  }
}
