import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/apiError';
import { getPlayerProfile } from '@/lib/queries';

export const GET = withApiErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const profile = await getPlayerProfile(params.id);
    if (!profile) {
      return NextResponse.json(
        { error: 'not_found', message: 'Player not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json(profile);
  }
);
