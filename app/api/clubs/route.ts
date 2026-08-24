import { NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/apiError';
import { listClubs } from '@/lib/queries';

export const GET = withApiErrorHandling(async () => {
  const clubs = await listClubs();
  return NextResponse.json({ clubs });
});
