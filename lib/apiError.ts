// lib/apiError.ts
import { NextResponse } from 'next/server';
import { DatabaseUnavailableError } from './cognodb';

/**
 * Wraps a Next.js route handler so a DatabaseUnavailableError becomes a
 * clean 503 with no internal details, and any other unexpected error
 * becomes a generic 500 — never a raw stack trace or credential in the
 * response body. The real error is always logged server-side first.
 */
export function withApiErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return NextResponse.json(
          {
            error: 'database_unavailable',
            message:
              'Could not reach the graph database. Check that your CognoDB instance is ' +
              'running and COGNODB_URI / COGNODB_PASSWORD are set correctly.',
          },
          { status: 503 }
        );
      }
      console.error('[api] unexpected error:', err);
      return NextResponse.json(
        { error: 'internal_error', message: 'Something went wrong.' },
        { status: 500 }
      );
    }
  }) as T;
}
