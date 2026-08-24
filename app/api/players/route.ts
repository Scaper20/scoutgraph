import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/apiError';
import { getDashboardStats, getFeaturedPlayers, searchPlayers } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();

  if (q) {
    const results = await searchPlayers(q, 30);
    return NextResponse.json({ players: results });
  }

  const [stats, featured] = await Promise.all([getDashboardStats(), getFeaturedPlayers(8)]);
  return NextResponse.json({ stats, featured });
});
