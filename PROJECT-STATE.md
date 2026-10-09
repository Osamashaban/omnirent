# Project state

What has actually been set up, what was decided and why, and what is still
open. This exists because conversations do not survive: an agent starting a new
session reads this repository and nothing else. Anything agreed in a chat and
not written here is lost.

Keep it current. It is a running record, not a document written once at the
end. Correct it when reality changes rather than appending to it.

Last updated: 2026-10-09.

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
| Vendor dashboard | https://app.getomnirent.com (coming-soon page) |
| Operations dashboard | https://ops.getomnirent.com (coming-soon page; `?site=ops` shows it on any link) |
| Staging | https://app.staging.getomnirent.com and https://ops.staging.getomnirent.com, serving the `staging` git branch (Neon `staging` database). Push a feature branch to `staging` for the owner to review it there before merging to `main`. |

Frankfurt was chosen because Neon offers no Middle East region and it is the
closest to Riyadh and Cairo, where the app will be used.

Design work happens in Claude Design. **When a design or design system artifact
exists, record its URL here** — an agent can read an artifact directly from its
link, so the artifact replaces any written description of the design. Without
the link recorded, a new session does not know it exists.

- Design system: https://claude.ai/artifact/K4f96mUX1D9v9yx4MVwxpR (tokens, brand book, logos)
- Design screens: Ossama's Claude Design canvas "Omnirent Design", https://claude.ai/code/artifact/9074ddb5-3a2c-442a-8150-bdfe21fd749d (one page per feature). The partner's canvas link goes here once onboarding sets it up. Every screen must come from a Claude Design canvas (see `PIPELINE.md` step 1).
- Approved designs archive: Figma "Omnirent Feature Designs", https://www.figma.com/design/XLdraTeNnugIZkweeXS9gE

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

Changes reach `main` through a pull request, following the feature pipeline
in `PIPELINE.md`. Two partners build in parallel, each with their own Claude
and accounts (agreed 2026-10-09): the requester approves in chat ("deploy",
then "looks good"), the other partner approves the pull request on GitHub
before anything touches production (Ossama, 2026-10-09: production only,
not staging), and the agent then merges. Pending approvals are listed on
the pinned page "Omnirent Release Approvals",
https://claude.ai/artifact/2Zy4AxAAaRweABu4oM8xQQ. This approval is a rule
the agents follow, not a GitHub setting: Ossama chose (2026-10-09) not to
turn on branch protection for now. Only one feature goes through backup, production
migration and merge at a time (the `shipping` label). Getting the second
partner set up is described in `docs/PARTNER-GUIDE.md`.

This puts real weight on the agent: run `npm run typecheck`, `npm run lint`,
`npm test` and `npm run build` before asking, and describe the change in
product language. The owner is a product manager and does not read code — the
pull request description and the preview deployment are the whole review.

**Every merge to `main` gets a version.** Numbering began at `0.001` on
2026-09-20 and goes up by one thousandth per merge. Before merging, add an
entry to `VERSIONS.md` — number, UTC timestamp, and what changed in product
language — and record the resulting merge commit in that entry afterwards. The
number is only an ordering; it is not semantic versioning.

Git tags are not used: pushing a tag from here is refused with a 403 and no
tool in the GitHub set creates tags or releases. The commit identifier serves
the same purpose. Do not retry tagging.

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

**Production has been migrated directly, outside the approval workflow.** On
2026-09-20 both migrations were applied straight to Neon `main` rather than
through `.github/workflows/migrate-production.yml`, at the owner's explicit
instruction, because the workflow cannot run (see below) and the database held
no data — both migrations were a single `CREATE TABLE` each, so nothing could
be lost.

The same applies to the later migration that dropped both tables: destructive,
run directly, but against tables holding no production data.

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

## Temporary scaffolding: removed

Both throwaway tables — `HealthCheck` and `ScratchNote` — and the status page
that reported on them were removed on 2026-09-20 once the pipeline was proven
working. The drop ran against both databases, deleting five test rows in
`staging` and two empty tables in `main`.

Both databases now hold only `_prisma_migrations`. The schema declares no
models. The front page is a plain placeholder awaiting the first real screen.

Nothing temporary is outstanding.

## Users, roles and modules

Added 2026-10-07 (branch `users-and-roles`). Every user has one role; roles get
access module by module (Module + RoleModule tables, list mirrored in
`lib/modules.ts`). Every role follows the same rule (Ossama, 2026-10-07: no
special Super Admin flag): a role may use exactly the modules it has RoleModule
rows for. Super Admin has a row for every module; any migration adding a module
must end with the "grant every module to role_super_admin" statement (a test
enforces it). The rule lives only in `lib/access.ts`. Roles and modules have one
name each (no separate Arabic/English columns); built-in module names are
translated in `lib/i18n.ts` by key. No vendor module for now (Ossama: "it's only
ops").

Passwords are stored as scrypt hashes (Node built-in, no extra library). The
first user is created per database by `scripts/create-first-user.mjs` from
`FIRST_USER_EMAIL` / `FIRST_USER_PASSWORD`, never from a committed value. From
the agent sandbox (no TCP to Neon) the same row is inserted through the Neon
connector with a hash generated by `lib/password.ts`. Ossama should change the
first user's password once sign-in is live (it was posted in chat).

Screens follow Ossama's design canvas (see Where things live / design link in
memory) and the Figma file "Omnirent Feature Designs"
(https://www.figma.com/design/XLdraTeNnugIZkweeXS9gE). They live on the ops
site only; app.* hosts redirect those routes to "/". Arabic is the default
(`omni_lang` cookie switches to English).

- Sign-in: 30-day sessions stored hashed in the Session table, so "sign out
  everywhere" works (used after a password reset and on deactivation). 5 wrong
  passwords in 15 minutes pause sign-in for 15 minutes; a warning shows from
  the 3rd.
- Email links (PasswordResetToken): reset links last 60 minutes, invite links
  7 days; single use, stored hashed, a new link cancels older ones.
- Email is sent through Resend's API (`RESEND_API_KEY`, `EMAIL_FROM`). Without
  a key the email is printed to the server log instead (never sent), which is
  how staging works until Ossama sets up Resend and verifies getomnirent.com.
- Assumptions to revisit: dates show in Cairo time; signing in lands on
  Settings > Users because there is no Ops home yet.
