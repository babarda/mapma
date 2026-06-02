"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-level error boundary. If any page in the app throws during render,
// React unmounts the subtree — without this, Next.js shows a bare
// "Application error" screen with no way to recover (every link dead).
// This gives the visitor a styled, escapable fallback instead.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in the console for debugging.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-parchment px-6 text-center">
      <h1 className="font-display text-3xl text-ink">Something went wrong</h1>
      <p className="max-w-md text-sm text-ink/60">
        An unexpected error interrupted the page. You can try again, or head
        back to the map.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-sepia-700 px-4 py-2 text-sm font-medium text-parchment transition hover:bg-sepia-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-sepia-300 px-4 py-2 text-sm text-sepia-800 transition hover:bg-sepia-100"
        >
          Back to the map
        </Link>
      </div>
    </main>
  );
}
