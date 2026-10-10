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
   - **Designs come only from Claude Design.** Any feature that adds or
     changes something a user sees must arrive with a Claude Design canvas
     link (a claude.ai design artifact) showing it. Do not design screens
     yourself in code, do not work from a description, a screenshot, a Figma
     page or a guess, and do not "fill in" screens the canvas does not show.
     If the link is missing, or the canvas does not cover every screen and
     state the feature needs, **stop**: tell the requester in plain words
     what is missing and ask them to design it in Claude Design first. Figma
     is only the archive of approved designs (step 11), never a source.
   - **The one exception is backend-only work**: changes no user sees, such
     as APIs, background jobs, database work or channel connections (for
     example Channex sync). These need no design. Say "Backend only, no
     screens" in the brief's "What you'll see". If backend work turns out to
     need any screen, even a settings toggle or an error message, it needs a
     design first.
   - A bug fix that makes a screen match its already approved design needs
     no new design. Link the approved canvas page in the brief.
   - Ossama's designs live in his Claude Design canvas (link in
     `PROJECT-STATE.md`). The other partner's live in their own canvas (set
     up as in `docs/PARTNER-GUIDE.md`). If you cannot open the link, say so
     in one line and ask them to share it with their account.
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
    Figma link in the thread. Then ask for production approval: see
    "Second approval for production" below.
12. **Wait for the other partner's approval, take the production lock, then
    back up production.** Nothing touches production (no backup, no live
    database update, no merge) until the other partner has approved the pull
    request on GitHub. Then see "One release at a time" below, and snapshot
    or back up the live Neon database (`main` branch).
13. **Run the production migration BEFORE the code goes live**, if the
    feature has one. Follow the production migration rule in `CLAUDE.md`
    and the current state of it in `PROJECT-STATE.md`.
14. **Merge to `main`.** Bring the branch up to date with `main` first and
    re-run the checks. Vercel then deploys production. Confirm with the live
    link, mark the release "live" in the approvals list, then release the
    lock.
15. **After-launch check.** Click through production, watch the error logs
    for 24 hours, then post "all clear" or the problem in the thread.

## The 5-minute brief

In this order, in plain words:

1. **What it does** (2-3 sentences, from the user's point of view)
2. **What you'll see** (screens, and the design link)
3. **Database changes** (plain words)
4. **APIs.** If the feature adds or changes any API (a way for the app,
   a channel such as Channex, or another system to read or change data),
   list each one: what it does in plain words, who can use it (which signed
   in roles, a channel partner, or anyone on the internet), what data it
   reads or changes, and how it is protected. Otherwise write "None".
5. **Risks.** Business (revenue, customers, channel partners, legal, brand)
   and Technical (data loss, speed, security, sync failures), each rated
   None, Low or High, with why
6. **Fit with existing features.** Works with (how it interacts) and Blockers
   (what breaks, needs changing or must ship first, else "None"). Include any
   overlap with what the other partner is building.
7. **Undo plan** (how to roll back, and whether that is easy or hard)
8. **Testing done** (cases run, all pass or what failed)
9. **What you need to do** (or "Nothing.")
10. **What's not included**
11. **How to check it** (3-5 things on staging, including Arabic and phone)

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

### Second approval for production

Every release to production needs two approvals: the requester's ("deploy"
and "looks good") and then the other partner's. This applies only to
production. Staging previews need no approval from the other partner.

The partners do not see each other's conversations with Claude, so the
approval happens on GitHub, and every pending approval is listed on one
shared page both partners keep pinned in their sidebar: **Omnirent Release
Approvals**, https://claude.ai/artifact/2Zy4AxAAaRweABu4oM8xQQ.

- **Ask.** After "looks good", add a document to the page's `releases`
  collection (with the artifact data tool), id `pr-<number>`, with:
  `feature` (plain name), `summary` (one sentence), `requester` and
  `approver` (`Ossama` or `Samer`), `status: "waiting"`, `prUrl`,
  `stagingUrl`, `dbChange` (true if step 13 will run) and `requestedAt`
  (UTC ISO time). Then send the requester the pull request link to pass to
  the other partner, with one sentence on what the feature does.
- **Approve.** The other partner opens the link and taps **Approve** on
  GitHub. They do not need to read the code; the pull request description
  says what changed and how to check it. If they ask for changes instead,
  set `status: "rejected"` with `decidedAt`, make the changes, go back
  through staging, and ask again.
- **Check before touching production.** Before step 12, read the pull
  request's reviews on GitHub. Continue only if the other partner (not the
  requester) has approved it, and no commit has been pushed since that
  approval. A word in chat, a relayed message or the requester saying "he
  approved" is not an approval. Then set `status: "approved"` with
  `decidedAt`.
- **Close it.** After step 14, set `status: "live"` and `liveUrl`.
- If this Claude cannot write to the approvals page, say so to the
  requester in one line, and ask Ossama to give their account edit access to
  it. Never skip the approval because the page is unreachable.

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
