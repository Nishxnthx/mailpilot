import { NextRequest, NextResponse } from 'next/server';
import { fetchMailList } from '@/lib/gmail/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || undefined;
    const query = searchParams.get('q') || undefined;

    const data = await fetchMailList({ folder: 'archive', query, pageToken });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch archived emails';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[API /api/mail/archive Error]:', message);
    return NextResponse.json({ error: 'Failed to fetch archived emails' }, { status: 500 });
  }
}
