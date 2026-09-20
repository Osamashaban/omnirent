# OmniRent — working rules

This file is the rulebook for any agent working in this repository. Read it
before making changes, and follow it even when a shortcut would be faster.

Then read `PROJECT-STATE.md`. This file says how to work; that one says what
has actually been set up, what was decided and why, and what is still
unfinished — including the link to the design, once one exists. Conversations
do not survive between sessions, so anything agreed in a chat and not written
there is gone. Keep it current as you work.

## Who reviews this work, and what that means for you

The owner of this project is a product manager. He does not read code. He
reviews at two levels: the pull request description, and the preview
deployment he can click through in a browser.

That has one consequence worth stating plainly: **no human is going to catch a
mistake by reading the diff.** There is no second pair of eyes on the code
itself. Correctness is your responsibility, not review's. Before you open a
pull request, assume that whatever you wrote is what ships.

In practice this means: run the checks yourself, click through the behavior
yourself where you can, and prefer a change you can prove works over one you
believe should work.

## Pull request descriptions

Every pull request description has exactly three sections, in this order.
The template in `.github/pull_request_template.md` has them already.

**1. What changed.** Written in product language. Describe what a person using
the app can now do, or what now behaves differently. No file names, no function
names, no library names. If the change is invisible to users (tooling, cleanup,
configuration), say that in plain words and say why it was worth doing.

**2. How to verify.** Numbered steps someone can follow in the preview
deployment, starting from the preview link. Each step says what to click and
what should be seen. If checking the change needs particular data, say how to
create it. "Run the tests" is not a verification step — the reviewer is in a
browser, not a terminal.

**3. Risk flags.** Call out anything in the change that touches:

- the database schema
- authentication or login
- payments or billing
- permissions, or who can see what
- deleting data
- sending email, SMS, or any other message to real people

If none of these apply, write exactly: `No risk flags`. Do not leave the
section empty and do not delete it — an empty section reads as an oversight,
and the whole point is that the reviewer can trust the absence of a flag.

## Tests

New behavior ships with tests. The standard is specific: a test must actually
fail if the behavior it covers breaks. A test that passes whether or not the
feature works is worse than no test, because it creates false confidence in a
project where nobody is reading the code.

Never weaken, skip, or delete a test to make a build pass. A failing test is
information. If a test fails, either the code is wrong (fix the code) or the
test encodes an expectation that is genuinely no longer correct (change the
test deliberately, and say so explicitly in the pull request description, in
the "What changed" section, in plain words). Commenting out an assertion,
adding `.skip`, loosening a comparison until it passes, or deleting the test
file are all off limits.

## Database changes

The database holds real data belonging to real people. Treat it accordingly.

- **Schema changes only ever happen through migration files.** Never change the
  shape of the database by hand, by running ad-hoc SQL, or by pushing the
  schema directly. Edit `prisma/schema.prisma`, generate a migration, and
  commit the migration file alongside the schema change.
- **Prefer additive changes.** Adding a column, adding a table, adding an index
  is safe and reversible. Renaming, dropping, or retyping a column is not.
  Where a rename is really wanted, prefer adding the new column, moving the
  data, and removing the old one in a separate, later change.
- **Destructive migrations must be flagged at the very top of the pull request
  description**, above everything else, stating exactly what data would be
  lost — which table, which column, and which rows. A migration is destructive
  if it drops a table or column, changes a column's type in a way that cannot
  hold the existing values, or deletes rows.
- **Never run a migration against production as part of ordinary work.**
  Production migrations run only through the manual
  `.github/workflows/migrate-production.yml` workflow, started by a human who
  types a confirmation phrase and approves the run. Never call
  `prisma migrate deploy`, `prisma db push`, or `prisma migrate reset` against
  a production connection string, and never add a step that does so to a
  workflow that runs automatically.

## Git

- **Never commit to `main` directly.** All work goes on a branch and reaches
  `main` through a pull request.
- **Never force push to `main`**, for any reason.

## Secrets

**Never commit real credentials anywhere.** Not in source, not in
configuration, not in documentation, not in an example, not in a test fixture,
not in a commit message, and not "temporarily". This includes connection
strings, API keys, tokens, passwords, and webhook signing secrets — including
ones for staging or a personal account.

When a change introduces new configuration, add it to `.env.example` with a
placeholder value and a comment saying where the real value comes from and who
sets it. The test in `tests/env-vars-documented.test.mjs` enforces this: any
environment variable read by `app/` or `lib/` and missing from `.env.example`
fails the build.

## How to work

- **Ask when something is ambiguous.** Do not guess at intent and build the
  wrong thing well. A question costs a few minutes; the wrong feature costs a
  rebuild, and it may not be spotted until it is live. If a request can be read
  two ways and the readings lead to different work, ask which one is meant.
- **Prefer boring, conventional solutions.** Use the framework's normal way of
  doing things. Do not introduce a new dependency, a new pattern, or a clever
  abstraction when the ordinary approach works. Boring code is code that can be
  handed to someone else — or to a future agent — without explanation.
- **Say plainly when something is incomplete.** If part of a task is unfinished,
  untested, stubbed, or known to be shaky, say so in the pull request
  description in the "What changed" section, in words a non-engineer will
  understand. Never present partial work as done. Reporting a gap is always
  cheaper than having it discovered in production.

## Stack

Next.js 15 (App Router), TypeScript, Prisma against Postgres on Neon, Tailwind
v4, deployed on Vercel, Node 22. Adding anything else to this list is a
decision for the owner — ask first.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the app locally |
| `npm run build` | Production build (what Vercel runs) |
| `npm run typecheck` | TypeScript check, no build output |
| `npm run lint` | ESLint |
| `npm test` | Test suite |
| `npm run prisma:generate` | Regenerate the database client after schema edits |
| `npm run prisma:migrate` | Create and apply a migration locally |
| `npm run prisma:studio` | Browse the database in a GUI |

Before opening a pull request, run `npm run typecheck`, `npm run lint`,
`npm test`, and `npm run build`. All four must pass.
