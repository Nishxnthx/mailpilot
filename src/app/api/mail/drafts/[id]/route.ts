import { NextRequest, NextResponse } from 'next/server';
import { getGmailDraft, updateGmailDraft, deleteGmailDraft } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing draft ID' }, { status: 400 });
    }

    const data = await getGmailDraft(id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch draft';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error(`[API /api/mail/drafts/${params.id} GET Error]:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing draft ID' }, { status: 400 });
    }

    const body = await request.json();
    const { to = '', subject = '', body: content = '', cc, bcc, threadId, inReplyTo, references } = body;

    const result = await updateGmailDraft({
      draftId: id,
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
    const message = error instanceof Error ? error.message : 'Failed to update draft';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error(`[API /api/mail/drafts/${params.id} PUT Error]:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing draft ID' }, { status: 400 });
    }

    await deleteGmailDraft(id);
    return NextResponse.json({ success: true, draftId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete draft';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error(`[API /api/mail/drafts/${params.id} DELETE Error]:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
