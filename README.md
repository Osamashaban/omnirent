# OmniRent

A Next.js application backed by Postgres, deployed on Vercel.

At the moment the repository contains a **walking skeleton**: enough structure
to prove the pipeline works end to end (code → pull request → preview → merge →
production), and nothing more. No product features have been built yet.

## Stack

- **Next.js 15** with the App Router
- **TypeScript**
- **Prisma** against **Postgres on Neon**
- **Tailwind CSS v4**
- Deployed on **Vercel**
- **Node 22**

Nothing else gets added without the owner's agreement — see `CLAUDE.md`.

## First-time setup

If the Neon, Vercel, and GitHub side of this project has not been set up yet,
follow **[SETUP.md](./SETUP.md)** first. It is a step-by-step runbook and it
does not assume any engineering background.

## Running locally

Requires Node 22.

```bash
npm ci                    # install dependencies
cp .env.example .env.local
# paste your Neon connection strings into .env.local
npx prisma generate       # build the database client
npm run prisma:migrate    # create the tables in your database
npm run dev               # http://localhost:3000
```

Opening http://localhost:3000 shows the status page: whether the app is
running, which environment it thinks it is in, which commit it is built from,
and whether it can actually reach the database.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the app locally with hot reload |
| `npm run build` | Production build (the same one Vercel runs) |
| `npm run start` | Serve a production build locally |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Test suite |
| `npm run prisma:generate` | Regenerate the database client after editing the schema |
| `npm run prisma:migrate` | Create and apply a migration against your local/staging database |
| `npm run prisma:deploy` | Apply existing migrations (used by CI and the production workflow) |
| `npm run prisma:studio` | Browse the database in a GUI |

## How changes ship

1. Work happens on a branch, never on `main`.
2. Opening a pull request runs CI (typecheck, lint, test, build) and gives
   Vercel a preview deployment with its own URL.
3. The owner reviews the pull request description and clicks through the
   preview.
4. Merging to `main` deploys to production.
5. Database migrations are **not** applied automatically. A human runs the
   "Migrate production database" workflow by hand and approves it.

## Repository map

| Path | What it is |
| --- | --- |
| `CLAUDE.md` | The rulebook for agents working in this repo. Read it first. |
| `SETUP.md` | One-time setup runbook for Neon, Vercel, and GitHub. |
| `app/` | Application pages and layout (App Router). |
| `lib/db.ts` | The shared Prisma database client. |
| `prisma/schema.prisma` | The description of the database. |
| `prisma/migrations/` | The ordered history of changes applied to the database. |
| `tests/` | Tests run by `npm test` and by CI. |
| `.env.example` | Every environment variable the app needs, with placeholders. |
| `.github/workflows/` | CI, and the manual production migration workflow. |

## Temporary scaffolding

`app/page.tsx` and the `HealthCheck` model in `prisma/schema.prisma` exist only
to prove the app can reach its database. Delete both once the first real
feature ships.
