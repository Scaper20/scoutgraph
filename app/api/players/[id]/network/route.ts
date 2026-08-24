import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/apiError';
import { getPlayerNetwork } from '@/lib/queries';

export const GET = withApiErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const network = await getPlayerNetwork(params.id);
    if (!network) {
      return NextResponse.json(
        { error: 'not_found', message: 'Player not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json(network);
  }
);
