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

## 0.006 — 2026-10-07 14:05 UTC

The Ops dashboard now has accounts. Team members sign in at ops.getomnirent.com
with their own email and password, in Arabic or English, on desktop or phone.
A Super Admin can add people, choose each person's role, and create roles that
see only the modules ticked for them. Forgotten passwords can be reset by
email, and new team members get an email invite to set their own password.
Emails reach real inboxes once Resend is set up for getomnirent.com.

Commit: `pending`

## 0.005 — 2026-10-05 15:09 UTC

Each web address now shows its own "coming soon" page in the Omnirent brand:
app.getomnirent.com says the Omnirent Vendor dashboard is coming soon, and
ops.getomnirent.com says the Omnirent Operation dashboard is coming soon. Both
pages carry the logo, the brand green and a short description in English and
Arabic.

Commit: `pending`

---

## 0.004 — 2026-10-03 11:17 UTC

Filled in a missing detail in this version list: the entry for 0.003 still
said its change identifier was "pending". It now records the real one, so the
exact code behind 0.003 can be recovered.

Nothing about the running application changed.

Commit: `pending`

---

## 0.003 — 2026-09-20 21:13 UTC

Cleared out the temporary scaffolding now that the pipeline from a code change
to a running site is working. The two throwaway tables used to prove it, and
all five test rows in them, were deleted from both the live database and the
one used for testing. The temporary status page that reported on them is gone
too, replaced by a plain placeholder.

Visible change: the site's front page no longer shows the list of green and
yellow status rows. It now shows the project name and a line saying nothing has
shipped yet. That is the expected result, not a fault.

The databases are now empty of application data, ready for the first real
table.

Commit: `b0bb0ca`

---

## 0.002 — 2026-09-20 21:03 UTC

Corrected how versions are recorded. The list originally said each version
would also be marked in the project's history under its own label; that turned
out not to be possible from here, so each entry now records the change's own
identifier instead. It pins the exact code just as precisely.

Nothing about the running application changed.

Commit: `03883ac`

---

## 0.001 — 2026-09-20 21:01 UTC

Recorded what has actually been set up on the project, why it was set up that
way, and what is still unfinished — so that starting a new conversation no
longer means losing the reasoning behind earlier decisions. Also started this
version list.

Nothing about the running application changed. No new behaviour, nothing
user-facing, no change to the database.

Commit: `3f5512f`
