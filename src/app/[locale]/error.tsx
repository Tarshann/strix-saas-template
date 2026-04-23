'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-3xl font-black text-white">
        !
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        An unexpected error occurred. The team has been notified.
        {error.digest && (
          <span className="ml-1 font-mono text-xs text-muted-foreground/60">
            ({error.digest})
          </span>
        )}
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-muted"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
