import { NextRequest, NextResponse } from 'next/server';
import { fetchMailDetail, markGmailMessageRead, markGmailMessageUnread } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing email ID' }, { status: 400 });
    }

    const email = await fetchMailDetail(id);
    return NextResponse.json(email);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch email detail';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error(`[API /api/mail/${params.id} Error]:`, message);
    return NextResponse.json({ error: 'Failed to fetch email detail' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing email ID' }, { status: 400 });
    }

    const body = await request.json();
    const { isRead } = body;

    if (typeof isRead !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid payload: isRead (boolean) is required.' },
        { status: 400 }
      );
    }

    if (isRead) {
      await markGmailMessageRead(id);
    } else {
      await markGmailMessageUnread(id);
    }

    return NextResponse.json({ success: true, id, isRead });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update email status';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error(`[API /api/mail/${params.id} PATCH Error]:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

