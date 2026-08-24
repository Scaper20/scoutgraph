import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/apiError';
import { searchPlayers } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const term = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!term) return NextResponse.json({ results: [] });

  const results = await searchPlayers(term, 12);
  return NextResponse.json({ results });
});
