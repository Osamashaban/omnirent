// ---------------------------------------------------------------------------
// Walking skeleton / deployment status page.
//
// This page exists to answer one question about a running deployment: "is this
// thing actually alive, and can it reach its own database?" It renders nothing
// that belongs to the product.
//
// DELETE THIS FILE once the first real feature ships, along with the
// HealthCheck model in prisma/schema.prisma.
// ---------------------------------------------------------------------------

// Never cache or pre-render this page: it must report the state of the running
// deployment at the moment it is loaded, not at the moment it was built.
export const dynamic = "force-dynamic";

type DatabaseStatus = {
  state: "ok" | "warning" | "error";
  detail: string;
};

/**
 * Reports whether this deployment can actually reach its database.
 *
 * Three things can go wrong, and they need different fixes, so they are
 * reported differently:
 *   - no connection string configured  -> the environment variables are missing
 *   - connection refused               -> the database is unreachable
 *   - connected but no health_check    -> migrations have not been applied yet
 */
async function checkDatabase(): Promise<DatabaseStatus> {
  if (!process.env.DATABASE_URL) {
    return {
      state: "warning",
      detail: "Not configured — DATABASE_URL is missing in this environment",
    };
  }

  // Imported here rather than at the top of the file so that the database
  // client is never constructed when there is no connection string to use.
  const { prisma } = await import("@/lib/db");

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    return { state: "error", detail: `Could not connect — ${summarize(error)}` };
  }

  try {
    const rows = await prisma.healthCheck.count();
    return {
      state: "ok",
      detail: `Connected — read ${rows} ${rows === 1 ? "row" : "rows"} from the health check table`,
    };
  } catch (error) {
    if (isMissingTable(error)) {
      return {
        state: "warning",
        detail: "Connected, but the health check table is missing — migrations have not been applied to this database yet",
      };
    }
    return { state: "error", detail: `Connected, but the query failed — ${summarize(error)}` };
  }
}

/**
 * Reports whether the throwaway ScratchNote table has reached this database.
 *
 * This exists to show a schema change arriving in a deployed environment: the
 * table is created by a migration, so a deployment that has not had that
 * migration applied says so instead of counting rows.
 *
 * DELETE THIS (and the ScratchNote model) once that has been demonstrated.
 */
async function checkScratchNote(): Promise<DatabaseStatus> {
  if (!process.env.DATABASE_URL) {
    return { state: "warning", detail: "Not checked — no database configured" };
  }

  const { prisma } = await import("@/lib/db");

  try {
    const rows = await prisma.scratchNote.count();
    return {
      state: "ok",
      detail: `Present — ${rows} ${rows === 1 ? "row" : "rows"}`,
    };
  } catch (error) {
    if (isMissingTable(error)) {
      return {
        state: "warning",
        detail: "Missing — the migration that creates it has not reached this database",
      };
    }
    return { state: "error", detail: `Query failed — ${summarize(error)}` };
  }
}

/** Postgres reports an unknown table as SQLSTATE 42P01; Prisma wraps it as P2021. */
function isMissingTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("42P01") || message.includes("P2021") || message.includes("does not exist");
}

/**
 * Prisma errors are multi-line and open with a line naming the query that
 * failed, which is noise here. Take the first line that explains the actual
 * problem, short enough to read at a glance.
 */
function summarize(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const line =
    raw
      .split("\n")
      .map((candidate) => candidate.trim())
      .find((candidate) => candidate.length > 0 && !candidate.includes("invocation")) ??
    "unknown error";
  return line.length > 160 ? `${line.slice(0, 160)}…` : line;
}

function StatusDot({ state }: { state: DatabaseStatus["state"] }) {
  const color =
    state === "ok"
      ? "var(--color-ok)"
      : state === "warning"
        ? "var(--color-warn)"
        : "var(--color-error)";

  return (
    <span
      aria-hidden="true"
      className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function StatusRow({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: DatabaseStatus["state"];
}) {
  return (
    <li className="flex gap-3 border-b border-[color:var(--color-border)] px-5 py-4 last:border-b-0">
      <StatusDot state={state} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-sm break-words text-[color:var(--color-muted)]">{value}</p>
      </div>
    </li>
  );
}

export default async function Home() {
  const database = await checkDatabase();
  const scratchNote = await checkScratchNote();

  const environment = process.env.VERCEL_ENV ?? "local development";
  const fullCommit = process.env.VERCEL_GIT_COMMIT_SHA;
  const commit = fullCommit ? fullCommit.slice(0, 7) : "unknown (not deployed from Vercel)";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">OmniRent</h1>
      <p className="mt-2 text-sm text-[color:var(--color-muted)]">
        Deployment status. No product features have shipped yet.
      </p>

      <ul className="mt-8 overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]">
        <StatusRow label="Application" value="Running" state="ok" />
        <StatusRow label="Environment" value={environment} state="ok" />
        <StatusRow label="Commit" value={commit} state={fullCommit ? "ok" : "warning"} />
        <StatusRow label="Database" value={database.detail} state={database.state} />
        <StatusRow label="ScratchNote table" value={scratchNote.detail} state={scratchNote.state} />
      </ul>

      <p className="mt-6 text-xs text-[color:var(--color-muted)]">
        This page is temporary and will be removed when the first real feature ships.
      </p>
    </main>
  );
}
