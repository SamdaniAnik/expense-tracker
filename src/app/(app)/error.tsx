"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-display text-2xl font-extrabold">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {error.message || "A server error occurred while loading this page."}
      </p>
      {error.digest ? (
        <p className="mt-1 text-xs text-[var(--faint)]">Digest: {error.digest}</p>
      ) : null}
      <button type="button" className="btn btn-primary mt-6" onClick={() => reset()}>
        Try again
      </button>
      <p className="mt-6 text-xs text-[var(--muted)]">
        If this keeps happening, run <code>supabase/fix-rls.sql</code> in the Supabase SQL
        editor, then reload.
      </p>
    </div>
  );
}
