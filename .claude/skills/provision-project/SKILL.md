---
name: provision-project
description: Provision a new project's hosting and database end to end — create the Neon project with main and staging branches, wire the four connection strings into Vercel with the right environment targets, apply migrations to staging, and align the Vercel Node version with package.json. Use when setting up a new project, wiring a repo to Vercel, splitting preview and production databases, or when a preview deployment is reading production data.
---

# Provisioning a project: Neon + Vercel

This is the procedure that was worked out and verified on OmniRent. Follow it
in order. Every default below is already decided — do not stop to ask about
anything marked "default". Stop only at the two gates in "Gates", which exist
because getting them wrong destroys something that cannot be recovered.

## Prerequisites

Both connectors must be connected at the account level, with the **team or
organization scope** that owns the projects — not a personal account. This is
the single most common failure, and it presents as `403 Forbidden ... You must
re-authenticate to this scope`.

- **Vercel** connector — authorize the team that owns the projects
- **Neon** connector — authorize the organization that owns the databases

Neither can be connected from a terminal session. If a scope is missing, the
user must fix it at claude.ai → Settings → Connectors. There is no tool, token
or workaround that substitutes; a token cannot widen its own scope. Say so once
and wait rather than exploring alternatives.

Note that `neon.tech`, `vercel.com` and TCP 5432 are all blocked by the sandbox
network policy. This does not matter — connector traffic routes through a
different path and works fine. It does mean `prisma migrate deploy` and `psql`
cannot run locally. Use the Neon connector's SQL tools instead.

## Defaults — apply without asking

| Decision | Default |
| --- | --- |
| Neon region | `aws-eu-central-1` (Frankfurt) — closest available to Riyadh/Cairo |
| Postgres version | Neon's default |
| Neon project name | the repository name |
| Branch names | `main` (production), `staging` (preview + development) |
| Node version on Vercel | whatever `package.json` `engines.node` allows |
| Preview protection | SSO off, so preview links open without a Vercel login |

Report each of these in the summary, but do not ask first.

## Steps

1. **Read the repo's own setup docs first.** `SETUP.md`, `.env.example` and
   `CLAUDE.md` usually already specify the intended layout. Follow what they
   say over what is here — they are project-specific and this file is generic.

2. **Check what exists** before creating anything:
   - `mcp__Neon__list_organizations`, then `list_projects` with the `org_id`
   - `mcp__Vercel__list_projects` and `get_git_deployment_context`

   `get_git_deployment_context` is the reliable way to see whether a Vercel
   project is linked to a GitHub repo. `get_project` omits the link field even
   when a link exists — do not conclude a repo is unlinked from its absence.

3. **Create the Neon project** with `create_project`, then the `staging` branch
   with `create_branch` (parent defaults to the default branch).

4. **Get connection strings** with `get_connection_string` for each branch.
   These return the **pooled** form. The **direct** form is the identical URL
   with `-pooler` removed from the host. Prisma needs both: pooled for queries,
   direct for migrations.

   Never print a connection string in chat, a commit, a PR or a log. Write it
   straight into Vercel.

5. **Set the four Vercel variables** — `create_project_env` for new ones,
   `edit_project_env` to retarget existing ones. Type `sensitive`. Add a
   `comment` naming the branch and purpose.

   | Variable | Value | Target |
   | --- | --- | --- |
   | `DATABASE_URL` | `main` pooled | `production` |
   | `DIRECT_URL` | `main` direct | `production` |
   | `DATABASE_URL` | `staging` pooled | `preview`, `development` |
   | `DIRECT_URL` | `staging` direct | `preview`, `development` |

   One variable name appearing twice with different targets is the point. It is
   what stops a preview deployment writing to real data.

6. **Align the Node version.** Compare `package.json` `engines.node` against the
   Vercel project's `nodeVersion` and fix Vercel with `update_project`. A
   mismatch fails the build before any code runs, and the error does not
   obviously point at the cause.

7. **Apply migrations to `staging` only.** Since 5432 is blocked, execute the
   migration SQL through `mcp__Neon__run_sql_transaction`, then record it in
   Prisma's tracking table so Prisma does not try to re-run it:

   ```sql
   CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
       "id" VARCHAR(36) PRIMARY KEY NOT NULL,
       "checksum" VARCHAR(64) NOT NULL,
       "finished_at" TIMESTAMPTZ,
       "migration_name" VARCHAR(255) NOT NULL,
       "logs" TEXT,
       "rolled_back_at" TIMESTAMPTZ,
       "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
       "applied_steps_count" INTEGER NOT NULL DEFAULT 0
   );
   ```

   The checksum must be the SHA-256 of the migration file's exact bytes
   (`sha256sum prisma/migrations/<name>/migration.sql`). A wrong checksum is
   worse than no record — Prisma then refuses with a mismatch error.

8. **Verify by reading back**, never by assuming a write succeeded:
   - `mcp__Neon__get_database_tables` on both branches
   - `mcp__Vercel__filter_project_envs` for the four rows

9. **Report** the region, project and branch IDs, the four-row table, what was
   applied where, and anything left undone.

## Gates — stop and ask

**Overwriting an environment variable that already holds a value.** Adding a
missing variable is safe. Replacing an existing one can silently disconnect a
working production database, and the old value is not recoverable — it cannot
be read back before being replaced. Show which variable and what it will become,
and get a yes.

**Anything touching a production database.** Migrations against production run
only through the repo's manual workflow (`.github/workflows/migrate-production.yml`),
started by a human. Never run `prisma migrate deploy`, `db push` or
`migrate reset` against a production connection string, and never add a step
that does so to a workflow that runs automatically. Leaving production without
tables is the correct outcome of this procedure — say so plainly in the report
rather than fixing it.

## Known gaps to flag, not fix

- A plain `next build` does not run migrations, so schema changes do not reach
  preview databases on their own. Mention it; changing the build command would
  also run migrations against production, which is forbidden.
- Turning SSO off makes preview URLs publicly reachable. That is the default
  here for reviewability, but say it in the summary so it is a known choice.
