import { NextRequest, NextResponse } from 'next/server';
import { fetchMailList } from '@/lib/gmail/service';
import { EmailFolder, EmailCategory } from '@/types/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const folder = (searchParams.get('folder') as EmailFolder) || 'inbox';
    const category = (searchParams.get('category') as EmailCategory) || 'all';
    const pageToken = searchParams.get('pageToken') || undefined;

    const data = await fetchMailList({ folder, category, query: q, pageToken });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute search';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[API /api/mail/search Error]:', message);
    return NextResponse.json({ error: 'Failed to search emails' }, { status: 500 });
  }
}
