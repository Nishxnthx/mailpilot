import { NextRequest, NextResponse } from 'next/server';
import { fetchEmailThread } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const threadId = params.threadId;
    if (!threadId) {
      return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    }

    const threadData = await fetchEmailThread(threadId);
    return NextResponse.json(threadData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch thread';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error(`[API /api/mail/thread/${params.threadId} Error]:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
