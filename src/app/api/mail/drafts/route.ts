import { NextRequest, NextResponse } from 'next/server';
import { fetchMailList, createGmailDraft } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || undefined;
    const query = searchParams.get('q') || undefined;

    const data = await fetchMailList({ folder: 'drafts', query, pageToken });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch drafts';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[API /api/mail/drafts Error]:', message);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to = '', subject = '', body: content = '', cc, bcc, threadId, inReplyTo, references } = body;

    const result = await createGmailDraft({
      to,
      subject,
      body: content,
      cc,
      bcc,
      threadId,
      inReplyTo,
      references,
    });

    return NextResponse.json({
      success: true,
      draftId: result.draftId,
      messageId: result.messageId,
      threadId: result.threadId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create draft';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[API /api/mail/drafts POST Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

