# Feature pipeline

How every feature goes from "the design is ready" to live in production. Any
Claude working on this repository follows it, for whichever partner asked.
Nobody has to remember the steps: the partner only types a few phrases, and
the agent does everything else.

Two partners build OmniRent, each with their own accounts and their own
Claude. Both ship to the same production. This file is what keeps them in
step: it is the one copy of the process, and it lives here so both Claudes
read the same thing.

---

## What the partner types

| The partner says | What it means |
| --- | --- |
| "The [feature] design is ready" (with the design link) | Start a new feature at step 1. |
| "deploy" | The brief is approved. Go on from step 6. |
| "looks good" | Staging is approved. Go on from step 11. |

Anything else is a question or a change request about the feature in
progress. Answer it, or make the change, and keep going.

Two rules from `CLAUDE.md` frame everything below: the setup check runs
before step 1 of every feature, and no step is ever skipped, whoever asks.

Call the person who asked for the feature **the requester**, and the other
partner **the other partner**. Both are product people: they do not read
code. Talk to them in plain words, never in file names, commands or jargon.

## Feature status checklist

Each feature is one conversation (one thread). Keep a checklist of these
steps visible in it and update it as each step finishes.

1. **Read the design.** Read the design the requester linked, and any chat
   that came with it.
   - Ossama's designs live in his Claude Design session and canvas (links in
     `PROJECT-STATE.md`). His Claude reads both.
   - For the other partner, use the design link they give: a Claude Design
     artifact shared with them, or a page in the Figma file "Omnirent Feature
     Designs". If you cannot open the link, say so in one line and ask them to
     share it with their account. Never work from a guess of what the design
     looks like.
   - Before building, look at the open pull requests on this repository to
     see what the other partner is building. If it touches the same screens
     or database tables, tell the requester in one line before starting.
2. **Build it.** Branch from the latest `main`. Bigger or riskier features can
   ship hidden behind a switch and be turned on when the requester is ready.
3. **Test it.** Write and run every reasonable test case: happy paths, edge
   cases, wrong input, permissions and roles, Arabic and right-to-left, phone
   size. Fix failures before the brief. `npm run typecheck`, `npm run lint`,
   `npm test` and `npm run build` must all pass.
4. **Send the 5-minute brief** (format below).
5. **Wait for the requester to reply "deploy".**
6. **Open the pull request.** Use the template in
   `.github/pull_request_template.md`. CI runs on it.
7. **Staging preview.** Vercel posts a preview link on the pull request. It
   uses the staging database, never production. Use this per-pull-request
   link for review rather than pushing to the shared `staging` branch, so two
   features never overwrite each other there. Add `?site=ops` to the link to
   see the ops site. If the feature changes the database, apply its migration
   to the staging database first (see "Database changes" below).
8. **Security check on staging.** Database gaps (access rules, exposed data,
   injection, missing constraints) and hacking or back doors (auth bypass,
   role escalation, open endpoints, leaked secrets, insecure headers). Post
   GREEN or RED with findings. RED gets fixed before going further.
9. **Design match check.** Screenshot every staging screen (desktop and
   phone, English and Arabic) and compare it side by side with the design
   (layout, spacing, colors, fonts, text, icons, states). Post MATCH, or the
   list of differences with side-by-side images. Fix differences before the
   requester's review.
10. **Requester checks staging** (including Arabic and phone) **and says
    "looks good".**
11. **Add the design to Figma.** Add the design as approved on staging to the
    Figma file "Omnirent Feature Designs", one page per feature, and share the
    Figma link in the thread.
12. **Take the production lock, then back up production.** See "One release
    at a time" below. Then snapshot or back up the live Neon database
    (`main` branch).
13. **Run the production migration BEFORE the code goes live**, if the
    feature has one. Follow the production migration rule in `CLAUDE.md`
    and the current state of it in `PROJECT-STATE.md`.
14. **Merge to `main`.** Bring the branch up to date with `main` first and
    re-run the checks. Merging needs the other partner's approval on the pull
    request (see "Approval between partners"). Vercel then deploys
    production. Confirm with the live link, then release the lock.
15. **After-launch check.** Click through production, watch the error logs
    for 24 hours, then post "all clear" or the problem in the thread.

## The 5-minute brief

In this order, in plain words:

1. **What it does** (2-3 sentences, from the user's point of view)
2. **What you'll see** (screens, and the design link)
3. **Database changes** (plain words)
4. **Risks.** Business (revenue, customers, channel partners, legal, brand)
   and Technical (data loss, speed, security, sync failures), each rated
   None, Low or High, with why
5. **Fit with existing features.** Works with (how it interacts) and Blockers
   (what breaks, needs changing or must ship first, else "None"). Include any
   overlap with what the other partner is building.
6. **Undo plan** (how to roll back, and whether that is easy or hard)
7. **Testing done** (cases run, all pass or what failed)
8. **What you need to do** (or "Nothing.")
9. **What's not included**
10. **How to check it** (3-5 things on staging, including Arabic and phone)

End with: Reply "deploy" to ship.

---

## Working in parallel

Two Claudes can be partway through two features at the same time. These rules
stop them colliding.

### One release at a time

Steps 12 to 14 (back up, migrate production, merge) are the risky part, and
only one feature may be in them at once. The lock is the GitHub label
`shipping` on a pull request.

- Before step 12, list open pull requests with the `shipping` label. If one
  exists and it is not yours, wait: tell the requester in one line that the
  other partner's feature is going live first, and check again later.
- If none exists, add `shipping` to your pull request (create the label if it
  is missing), then start step 12.
- Remove the label as soon as step 14 is confirmed live, or if you stop
  partway. A label left behind blocks the other partner. If a `shipping`
  label has sat on a pull request for more than a day with no activity, ask
  your requester before removing it.

### Stay up to date with `main`

- Branch from the latest `main` at step 2.
- Bring the branch up to date with `main` before staging (step 7) and again
  before merging (step 14), and re-run all checks each time.
- `VERSIONS.md` and `PROJECT-STATE.md` are shared. Take the next version
  number only at merge time, after bringing the branch up to date, so two
  features never claim the same number.

### Database changes

Both features share one staging database and one production database.

- Follow the database rules in `CLAUDE.md`: migration files only, additive
  changes preferred, destructive changes flagged at the top of the pull
  request.
- Prefer additive migrations even more strongly here: the other partner's
  feature may be using the staging database at the same moment.
- Before applying a migration to staging, check which migrations staging
  already has. If another feature's migration is there that `main` does not
  have yet, that is the other partner's work in progress: leave it alone.
- Migration folder names sort by date. If `main` gained a newer migration
  than yours while you worked, rename yours so it sorts after it, and update
  its row in the staging database's `_prisma_migrations` table to match.

### Approval between partners

The partners do not see each other's conversations with Claude. GitHub is the
one place both can see, so it is where they sign off on each other's work.

- When the requester says "looks good", send them the pull request link to
  pass to the other partner, with one sentence on what the feature does.
- The other partner opens the link and taps **Approve**. They do not need to
  read the code; the pull request description says what changed and how to
  check it.
- The `main` branch protection enforces this: GitHub refuses to merge
  without one approval from someone other than the person who opened the
  pull request.

## Accounts each partner's Claude needs

Each partner uses their own accounts. Nobody shares a password. All four are
required: the setup check in `CLAUDE.md` refuses to start a feature without
them.

| Service | Used for |
| --- | --- |
| GitHub (collaborator on this repository) | Reading and changing the code, pull requests, approvals |
| Neon (member of the `omnirent` project) | Staging migrations, production backup and migration (steps 7, 12, 13) |
| Vercel (member of team `osamas-team1`) | Preview links, deploy status, error logs (steps 7, 14, 15) |
| Figma (member of the Omnirent team) | Approved designs (steps 1, 11) |
