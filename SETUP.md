# Setup runbook

One-time setup for OmniRent. Follow the steps in order — each one depends on
the one before it. No engineering background is assumed; where a step asks for
a value, it says exactly where to copy it from.

Budget about 45 minutes.

You will need accounts on [Neon](https://neon.tech), [Vercel](https://vercel.com),
and GitHub, all signed in.

---

## Step 1 — Create the Neon project and a `staging` branch

Neon is the database. A Neon "branch" is a separate copy of the database, so
that testing a change cannot touch real data.

1. Go to [console.neon.tech](https://console.neon.tech) and click **New
   Project**.
2. Name it `omnirent`. Choose the Postgres version Neon offers by default, and
   pick the region closest to where the app will be used.
3. Click **Create Project**. Neon creates a branch called `main` — this one
   holds real, production data.
4. In the left sidebar, click **Branches**, then **New Branch**.
5. Name it `staging`, and set **Parent branch** to `main`. Create it.

You now have two databases: `main` for production, `staging` for everything
else.

---

## Step 2 — Collect the four connection strings

Each Neon branch has two connection strings, and both are needed:

- **Pooled** — the everyday one the app uses. Its address contains `-pooler`.
- **Direct** — used only when changing the database structure. Same address
  without `-pooler`.

Do this for **both** branches:

1. In Neon, open **Dashboard** and use the **Branch** dropdown at the top to
   select the branch you want (`main`, then later `staging`).
2. Find the **Connection string** panel.
3. Make sure **Connection pooling** is switched **on**, and copy the string.
   This is the **pooled** value.
4. Switch **Connection pooling** **off**, and copy the string again. This is
   the **direct** value.

Paste all four somewhere safe and clearly labelled, for the next steps:

| Label | Neon branch | Pooling |
| --- | --- | --- |
| Production pooled | `main` | on |
| Production direct | `main` | off |
| Staging pooled | `staging` | on |
| Staging direct | `staging` | off |

> These are passwords. Do not paste them into a chat, a code file, a commit, or
> a pull request. They go only into the Neon, Vercel, and GitHub settings
> screens described below.

---

## Step 3 — Import the repository into Vercel and set environment variables

1. Go to [vercel.com/new](https://vercel.com/new) and import the `omnirent`
   GitHub repository. Vercel detects Next.js on its own — leave the build
   settings alone.
2. **Before clicking Deploy**, expand **Environment Variables** and add the
   four entries below. For each one, tick only the environments listed.

| Name | Value | Tick these environments |
| --- | --- | --- |
| `DATABASE_URL` | Production pooled | Production |
| `DIRECT_URL` | Production direct | Production |
| `DATABASE_URL` | Staging pooled | Preview, Development |
| `DIRECT_URL` | Staging direct | Preview, Development |

   The same variable name appears twice on purpose: production gets the Neon
   `main` values, and previews get the Neon `staging` values. That is what
   keeps a preview deployment from writing to real data.

3. Click **Deploy** and wait for it to finish.
4. Open the deployment URL. The status page should show:

   > **Database** — Connected, but the health check table is missing —
   > migrations have not been applied to this database yet

   That is the **correct** result at this point: the app has reached the
   database, and the database is simply still empty. You will apply the first
   migration in the final checklist below, after which this row reads
   *Connected*.

   If it instead says *Not configured*, the environment variables did not save
   — fix them in **Settings → Environment Variables** and redeploy. If it says
   *Could not connect*, the connection strings are wrong; re-copy them from
   Neon.

---

## Step 4 — Protect the `main` branch on GitHub

This stops anything reaching production without a pull request and green
checks.

1. On GitHub, open the repository → **Settings** → **Rules** → **Rulesets** →
   **New ruleset** → **New branch ruleset**.
2. Name it `main protection`. Set **Enforcement status** to **Active**.
3. Under **Target branches**, click **Add target** → **Include default
   branch**.
4. Tick these rules:
   - **Restrict deletions**
   - **Block force pushes**
   - **Require a pull request before merging** (set required approvals to 1 if
     you want to approve explicitly; 0 is fine if you are the only reviewer)
   - **Require status checks to pass** — then click **Add checks** and add
     **Typecheck, lint, test, build**.

   > That check only appears in the list after CI has run at least once. If it
   > is not there yet, open the first pull request, let CI finish, then come
   > back and add it.
5. Click **Create**.

---

## Step 5 — Add the production database secrets to GitHub

These are what the manual migration workflow uses.

1. Repository → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**.
2. Add:
   - Name `PRODUCTION_DATABASE_URL`, value **Production pooled** (from Step 2).
   - Name `PRODUCTION_DIRECT_URL`, value **Production direct** (from Step 2).

GitHub hides these values once saved. That is expected — they can be replaced,
not read back.

---

## Step 6 — Create the `production` GitHub environment

This adds a human approval gate in front of any production database change.

1. Repository → **Settings** → **Environments** → **New environment**.
2. Name it exactly `production` (lower case) and create it.
3. Tick **Required reviewers**, add yourself, and click **Save protection
   rules**.

From now on, the "Migrate production database" workflow pauses and emails you
for approval before it touches anything.

---

## Step 7 — Install the Claude GitHub App

This is what lets Claude review pull requests and fix its own CI failures.

1. Go to [github.com/apps/claude](https://github.com/apps/claude) and click
   **Install** (or **Configure** if it is already installed on your account).
2. Choose the account that owns `omnirent`.
3. Select **Only select repositories**, choose `omnirent`, and confirm.
4. If prompted in the Claude app to connect GitHub, do that too, at
   [claude.ai/connect-github](https://claude.ai/connect-github).

---

## Final checklist — prove the pipeline works end to end

Work through these in order. If one fails, fix it before moving on.

1. **The production database can only be changed by you, on purpose.** Go to
   Actions → **Migrate production database** → **Run workflow**. First type
   something *other* than `apply to production` and confirm the run fails
   immediately at the confirmation step. Run it again with the exact phrase
   `apply to production`, confirm the run **pauses and waits for your
   approval**, approve it, and confirm it finishes by applying the
   `init_health_check` migration.
2. **Production is live and reaches its database.** The Vercel production URL
   loads and the status page now shows *Application — Running*,
   *Environment — production*, and *Database — Connected*, with a row count.
3. **Previews are built.** Open any pull request; Vercel posts a preview link
   on it. The preview loads and shows *Environment — preview*.
4. **Previews use staging data, not production data.** The preview's Database
   row reports the state of the Neon `staging` branch, not `main`. Until
   `staging` has been migrated too, it will correctly say the health check
   table is missing — which is itself the proof that the preview is not
   pointing at production. (To migrate `staging`, run `npm run prisma:deploy`
   locally with the staging connection strings in `.env.local`.)
5. **CI gates merges, and `main` is protected.** On an open pull request, the
   *Typecheck, lint, test, build* check runs and shows in the merge box, and
   GitHub refuses to merge while it is failing or still running. Pushing
   straight to `main` from your computer is rejected with a message about the
   branch protection rule.
6. **Ordinary merges never touch the database.** Merge a pull request to
   `main`, confirm it deploys to production, and confirm that no migration ran
   as part of it — the only thing that changes the production database is the
   manual workflow from item 1.

Once all six pass, the pipeline is trustworthy: code reaches production only
through a reviewed pull request with green checks, and the database changes
only when you say so.
