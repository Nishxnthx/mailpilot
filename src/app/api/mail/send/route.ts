import { NextRequest, NextResponse } from 'next/server';
import { sendGmailMessage, deleteGmailDraft } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, body: content, cc, bcc, threadId, inReplyTo, references, draftId } = body;

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required parameters: to, subject, and body are required.' },
        { status: 400 }
      );
    }

    const result = await sendGmailMessage({
      to,
      subject,
      body: content,
      cc,
      bcc,
      threadId,
      inReplyTo,
      references,
    });

    if (draftId) {
      try {
        await deleteGmailDraft(draftId);
      } catch (err) {
        console.warn(`[API /api/mail/send]: Note on draft cleanup (${draftId}):`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully via Gmail API.',
      id: result.id,
      threadId: result.threadId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[API /api/mail/send Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
