// Broker signup (design version 62): the sign-in lock, the list statuses and
// row actions in Ops › Brokers, the form rules, the email links, and the
// migration that adds the Brokers module.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BROKER_INVITE_TTL_MS,
  BROKER_RESET_TTL_MS,
  brokerActions,
  brokerLinkBase,
  brokerListStatus,
  companyInitials,
  formatMobile,
  normalizeMobile,
  parseApproxUnits,
  signInLock,
} from "../lib/broker-rules.ts";
import { brokerInviteEmail, brokerResetEmail } from "../lib/broker-emails.ts";
import { BROKER_DICTS, ago } from "../lib/broker-i18n.ts";
import { MODULES } from "../lib/modules.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(
  join(repoRoot, "prisma", "migrations", "20261022090000_broker_access", "migration.sql"),
  "utf8",
);

const MIN = 60 * 1000;
const now = new Date("2026-10-22T12:00:00Z");
const at = (minutesAgo) => new Date(now.getTime() - minutesAgo * MIN);
const failed = (minutesAgo) => ({ kind: "SIGN_IN_FAILED", createdAt: at(minutesAgo) });
const ok = (minutesAgo) => ({ kind: "SIGN_IN_OK", createdAt: at(minutesAgo) });

test("sign-in: three wrong passwords lock for 15 minutes and the error counts down", () => {
  assert.deepEqual(signInLock([], now), { locked: false, attemptsLeft: 3, lockedUntil: null });
  assert.equal(signInLock([failed(2)], now).attemptsLeft, 2);
  assert.equal(signInLock([failed(3), failed(2)], now).attemptsLeft, 1);
  const lock = signInLock([failed(3), failed(2), failed(1)], now);
  assert.equal(lock.locked, true);
  assert.equal(lock.attemptsLeft, 0);
  assert.equal(lock.lockedUntil.getTime(), at(1).getTime() + 15 * MIN);
});

test("sign-in: old failures and failures before a success don't count", () => {
  assert.equal(signInLock([failed(20), failed(18), failed(16)], now).locked, false);
  assert.equal(signInLock([failed(5), failed(4), ok(3), failed(1)], now).attemptsLeft, 2);
  // Order of rows from the database doesn't matter.
  assert.equal(signInLock([failed(1), ok(3), failed(4), failed(5)], now).attemptsLeft, 2);
});

test("list status: invited, invite expired, active, deactivated", () => {
  const active = { status: "ACTIVE" };
  const off = { status: "DEACTIVATED" };
  const future = new Date(now.getTime() + MIN);
  assert.equal(brokerListStatus(active, { status: "INVITED" }, future, now), "INVITED");
  assert.equal(brokerListStatus(active, { status: "INVITED" }, at(1), now), "EXPIRED");
  assert.equal(brokerListStatus(active, { status: "INVITED" }, null, now), "EXPIRED");
  assert.equal(brokerListStatus(active, { status: "ACTIVE" }, null, now), "ACTIVE");
  assert.equal(brokerListStatus(off, { status: "ACTIVE" }, null, now), "DEACTIVATED");
  assert.equal(brokerListStatus(off, { status: "INVITED" }, future, now), "DEACTIVATED");
  assert.equal(brokerListStatus(active, null, null, now), "DEACTIVATED");
});

test("row actions follow the design for each status", () => {
  assert.deepEqual(brokerActions("ACTIVE"), { resend: false, reactivate: false, deactivate: true });
  assert.deepEqual(brokerActions("INVITED"), { resend: true, reactivate: false, deactivate: true });
  assert.deepEqual(brokerActions("EXPIRED"), { resend: true, reactivate: false, deactivate: false });
  assert.deepEqual(brokerActions("DEACTIVATED"), { resend: false, reactivate: true, deactivate: false });
});

test("mobile numbers are cleaned to E.164 and wrong ones refused", () => {
  assert.equal(normalizeMobile("+20 100 555 2841"), "+201005552841");
  assert.equal(normalizeMobile("00201005552841"), "+201005552841");
  assert.equal(normalizeMobile("+20-100-555-2841"), "+201005552841");
  assert.equal(normalizeMobile("01005552841"), null);
  assert.equal(normalizeMobile("+2010"), null);
  assert.equal(normalizeMobile("+0123456789012"), null);
  assert.equal(normalizeMobile("+20abc5552841"), null);
  assert.equal(normalizeMobile(""), null);
  assert.equal(formatMobile("+201005552841"), "+20 100 555 2841");
  assert.equal(formatMobile("+971501234567"), "+971501234567");
});

test("approximate units and company initials", () => {
  assert.equal(parseApproxUnits("40"), 40);
  assert.equal(parseApproxUnits(" 7 "), 7);
  for (const bad of ["", "0", "-3", "2.5", "abc", "100001"]) assert.equal(parseApproxUnits(bad), null, bad);
  assert.equal(companyInitials("Nile Stays"), "NS");
  assert.equal(companyInitials("  cairo  "), "C");
  assert.equal(companyInitials(""), "");
});

test("email links go to the broker site", () => {
  assert.equal(brokerLinkBase("https://ops.getomnirent.com"), "https://app.getomnirent.com");
  assert.equal(brokerLinkBase("https://ops.staging.getomnirent.com"), "https://app.staging.getomnirent.com");
  assert.equal(brokerLinkBase("https://app.getomnirent.com"), "https://app.getomnirent.com");
  assert.equal(brokerLinkBase("https://omnirent-git-x.vercel.app"), "https://omnirent-git-x.vercel.app/broker");
  assert.equal(brokerLinkBase("http://localhost:3000"), "http://localhost:3000/broker");
});

test("invite lasts 7 days and reset 60 minutes", () => {
  assert.equal(BROKER_INVITE_TTL_MS, 7 * 24 * 60 * MIN);
  assert.equal(BROKER_RESET_TTL_MS, 60 * MIN);
});

test("broker emails carry the link and never inject names as HTML", () => {
  for (const lang of ["ar", "en"]) {
    const invite = brokerInviteEmail({
      lang,
      to: "x@y.com",
      firstName: "<b>Ahmed</b>",
      company: "Nile & <Stays>",
      link: "https://app.getomnirent.com/set-password?token=abc",
      contactName: "<script>Mona</script>",
      whatsapp: "+20 100 000 1234",
    });
    assert.equal(invite.to, "x@y.com");
    assert.ok(invite.html.includes("https://app.getomnirent.com/set-password?token=abc"));
    assert.ok(invite.text.includes("https://app.getomnirent.com/set-password?token=abc"));
    assert.ok(!invite.html.includes("<b>Ahmed"));
    assert.ok(!invite.html.includes("<script>"));
    assert.ok(!invite.html.includes("<Stays>"));
    assert.ok(invite.html.includes("+20 100 000 1234"));

    const reset = brokerResetEmail({ lang, to: "x@y.com", firstName: "<i>A</i>", link: "https://app.getomnirent.com/reset-password?token=z" });
    assert.ok(reset.html.includes("reset-password?token=z"));
    assert.ok(!reset.html.includes("<i>A"));
  }
});

test("Arabic and English broker texts have the same keys", () => {
  assert.deepEqual(Object.keys(BROKER_DICTS.ar).sort(), Object.keys(BROKER_DICTS.en).sort());
  const en = BROKER_DICTS.en;
  assert.equal(ago(en, at(10), now), en.justNow);
  assert.equal(ago(en, at(25 * 60), now), "yesterday");
  assert.equal(ago(en, at(3 * 24 * 60), now), "3 days ago");
  assert.equal(ago(en, at(65 * 24 * 60), now), "2 months ago");
});

test("migration adds the Brokers module, gives it to Super Admin, and only adds", () => {
  assert.ok(MODULES.some((m) => m.key === "brokers"));
  assert.match(migration, /'module_brokers', 'brokers'/);
  assert.match(migration, /SELECT 'role_super_admin', "id" FROM "Module"\s+ON CONFLICT DO NOTHING;/);
  assert.doesNotMatch(migration, /\bDROP\b|\bTRUNCATE\b|\bDELETE FROM\b/i);
  assert.match(migration, /CREATE UNIQUE INDEX "BrokerUser_email_key"/);
  assert.match(migration, /CREATE UNIQUE INDEX "BrokerToken_tokenHash_key"/);
});
