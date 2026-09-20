# Versions

Every merge to `main` gets a version number and a timestamp, newest first.

Numbering starts at `0.001` and goes up by one thousandth each time —
`0.001`, `0.002`, `0.003`. The number carries no meaning beyond order: it is
not semantic versioning, and a bigger jump does not signal a bigger change.

Each entry records the commit it was merged as, so the exact code behind any
version can be recovered later. Timestamps are UTC.

Git tags are deliberately not used. An agent working here can push branches but
not tags — the credential is refused with a 403, and no tool in the GitHub set
creates tags or releases. The commit identifier pins the code just as precisely,
so nothing is lost by recording it here instead. Do not spend time retrying tags.

Descriptions are written in product language, for the same reason pull request
descriptions are: the person reading this does not read code.

---

## 0.002 — 2026-09-20 21:03 UTC

Corrected how versions are recorded. The list originally said each version
would also be marked in the project's history under its own label; that turned
out not to be possible from here, so each entry now records the change's own
identifier instead. It pins the exact code just as precisely.

Nothing about the running application changed.

Commit: `pending`

---

## 0.001 — 2026-09-20 21:01 UTC

Recorded what has actually been set up on the project, why it was set up that
way, and what is still unfinished — so that starting a new conversation no
longer means losing the reasoning behind earlier decisions. Also started this
version list.

Nothing about the running application changed. No new behaviour, nothing
user-facing, no change to the database.

Commit: `3f5512f`
