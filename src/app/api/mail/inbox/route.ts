import { NextRequest, NextResponse } from 'next/server';
import { fetchMailList } from '@/lib/gmail/service';
import { EmailCategory } from '@/types/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || undefined;
    const query = searchParams.get('q') || undefined;
    const category = (searchParams.get('category') as EmailCategory) || 'all';

    const data = await fetchMailList({ folder: 'inbox', category, query, pageToken });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inbox';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[API /api/mail/inbox Error]:', message);
    return NextResponse.json({ error: 'Failed to fetch inbox emails' }, { status: 500 });
  }
}

