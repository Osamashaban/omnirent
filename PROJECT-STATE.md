# Project state

What has actually been set up, what was decided and why, and what is still
open. This exists because conversations do not survive: an agent starting a new
session reads this repository and nothing else. Anything agreed in a chat and
not written here is lost.

Keep it current. It is a running record, not a document written once at the
end. Correct it when reality changes rather than appending to it.

Last updated: 2026-09-20.

---

## Where things live

| Thing | Where |
| --- | --- |
| Repository | `Osamashaban/omnirent` |
| Hosting | Vercel project `omnirent`, team `osamas-team1` |
| Database | Neon project `omnirent` (`withered-grass-50384799`), Frankfurt, Postgres 18 |
| Production database | Neon branch `main` |
| Preview / local database | Neon branch `staging` |
| Live site | https://omnirent-sooty.vercel.app |

Frankfurt was chosen because Neon offers no Middle East region and it is the
closest to Riyadh and Cairo, where the app will be used.

Design work happens in Claude Design. **When a design or design system artifact
exists, record its URL here** — an agent can read an artifact directly from its
link, so the artifact replaces any written description of the design. Without
the link recorded, a new session does not know it exists.

- Design system: _not created yet_
- Design screens: _not created yet_

## How environments are separated

Four environment variables in Vercel, two names across two targets:

| Variable | Points at | Applies to |
| --- | --- | --- |
| `DATABASE_URL` | Neon `main`, pooled | Production |
| `DIRECT_URL` | Neon `main`, direct | Production |
| `DATABASE_URL` | Neon `staging`, pooled | Preview, Development |
| `DIRECT_URL` | Neon `staging`, direct | Preview, Development |

This is what stops a preview deployment writing to real data. It is verified by
the status page on any deployment: preview and production report different row
counts because they are reading different databases.

## Working agreement

Changes reach `main` through a pull request. The owner approves in chat, and
the agent then merges. The owner does not click through GitHub.

This puts real weight on the agent: run `npm run typecheck`, `npm run lint`,
`npm test` and `npm run build` before asking, and describe the change in
product language. The owner is a product manager and does not read code — the
pull request description and the preview deployment are the whole review.

## Decisions worth not relitigating

**Preview links are public.** Vercel SSO protection was deliberately turned off
so preview URLs open without a login. Accepted trade-off for reviewability;
revisit when previews show real data.

**Migrations are applied through the Neon connector, not `prisma migrate`.**
TCP 5432 is blocked from the agent sandbox, so `prisma migrate deploy` cannot
run there. Migration SQL is generated offline with `prisma migrate diff` and
executed through the connector, with a matching row written into
`_prisma_migrations` using the migration file's real SHA-256. A wrong checksum
is worse than no row, because Prisma then refuses with a mismatch error.

**Production was migrated once, directly, outside the approval workflow.** On
2026-09-20 the initial migration was applied straight to Neon `main` rather
than through `.github/workflows/migrate-production.yml`, at the owner's
explicit instruction, because the workflow could not run (see below) and the
database was verified empty beforehand — zero tables, zero rows, and the
migration was a single `CREATE TABLE`, so nothing could be lost.

That reasoning does not carry forward. Once production holds real data, a
migration can destroy it, and the workflow is the mechanism that exists to slow
that down. Treat the rule in `CLAUDE.md` as binding.

## Open items

These are all browser-only settings that an agent cannot configure: there is no
tool for GitHub repository secrets or deployment environments, and this session
has no direct GitHub API access. They are specified in `SETUP.md`.

1. **`PRODUCTION_DATABASE_URL` and `PRODUCTION_DIRECT_URL` do not exist**
   (`SETUP.md` step 5). The production migration workflow fails without them —
   `prisma migrate status` exits with an empty-connection-string error before
   anything is applied. Values come from the Neon `main` branch, pooled and
   direct.
2. **The `production` GitHub environment has no required reviewers**
   (`SETUP.md` step 6). The workflow declares `environment: production` but ran
   end to end with no approval prompt, so that safeguard is not in effect.
3. **`main` has no branch protection** (`SETUP.md` step 4). Nothing technically
   prevents a direct push, despite the rule in `CLAUDE.md`.

Until these exist, the only thing standing between a mistake and the live site
is the agent checking carefully and the owner approving in chat.

## Temporary things to remove

- **`ScratchNote`** — model, migration, and the row on the status page. Added
  only to prove a schema change reaches a running deployment. It is on `main`
  and will be created in production the next time a migration runs there.
  Removing it needs its own migration.
- **`HealthCheck` and `app/page.tsx`** — the walking-skeleton status page, to be
  deleted when the first real feature ships, as the files themselves say.
