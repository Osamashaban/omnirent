# Versions

Every merge to `main` gets a version number and a timestamp, newest first.

Numbering starts at `0.001` and goes up by one thousandth each time —
`0.001`, `0.002`, `0.003`. The number carries no meaning beyond order: it is
not semantic versioning, and a bigger jump does not signal a bigger change.

Each entry is also a git tag (`v0.001`), so the exact code behind any version
can be recovered later. Timestamps are UTC.

Descriptions are written in product language, for the same reason pull request
descriptions are: the person reading this does not read code.

---

## 0.001 — 2026-09-20 21:01 UTC

Recorded what has actually been set up on the project, why it was set up that
way, and what is still unfinished — so that starting a new conversation no
longer means losing the reasoning behind earlier decisions. Also started this
version list.

Nothing about the running application changed. No new behaviour, nothing
user-facing, no change to the database.
