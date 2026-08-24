import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/apiError';
import { discoverConnectedPlayers, getRelatedPlayers } from '@/lib/queries';

export const GET = withApiErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const clubId = req.nextUrl.searchParams.get('clubId');

    if (clubId) {
      // The exact PRD "Query 4" pattern: candidates reachable from this
      // player through 1-2 TEAMMATE_OF hops who previously played for
      // the given club.
      const candidates = await discoverConnectedPlayers(params.id, clubId);
      return NextResponse.json({ mode: 'discovery', candidates });
    }

    const related = await getRelatedPlayers(params.id, 12);
    return NextResponse.json({ mode: 'related', related });
  }
);
