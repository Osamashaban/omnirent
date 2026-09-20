// ---------------------------------------------------------------------------
// Placeholder home page.
//
// This replaced the walking-skeleton status page, which reported whether a
// deployment could reach its database. That page did its job — the pipeline
// from a code change to a running deployment is working, and its two temporary
// tables have been removed — so there is nothing left for it to report on.
//
// Replace this with the first real screen.
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">OmniRent</h1>
      <p className="mt-2 text-sm text-[color:var(--color-muted)]">
        Nothing has shipped yet. This page is a placeholder for the first real screen.
      </p>
    </main>
  );
}
