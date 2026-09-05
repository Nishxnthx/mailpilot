import { NextResponse } from 'next/server';
import { fetchMailCounts } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const counts = await fetchMailCounts();
    return NextResponse.json(counts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch counts';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[API /api/mail/counts Error]:', message);
    return NextResponse.json({ error: 'Failed to fetch mailbox counts' }, { status: 500 });
  }
}
