import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-3xl font-black text-black">
        S
      </div>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        This page doesn't exist. If you followed a link, it may have moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/strix-store"
          className="rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-muted"
        >
          Open demo
        </Link>
      </div>
    </div>
  );
}
