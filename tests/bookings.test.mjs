// Bookings and Guests: stages and tabs, money, payments, double bookings,
// moving between apartments, direct booking checks, guest matching and
// duplicates, the CSV export guard, reading the connection partner's booking
// revisions and Airbnb requests, both languages, and that every server action
// checks the signed-in broker.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  aptStatus,
  canCancel,
  canMove,
  canReport,
  canReportNoShow,
  checkDirect,
  checkPayment,
  checkRefund,
  clashWith,
  commissionPct,
  csvCell,
  declineReasonCode,
  directNightly,
  doubleBooked,
  dueOf,
  duplicatePairs,
  emailKindOf,
  firstFreeApt,
  guestTags,
  hoursLeft,
  inTab,
  initialsOf,
  isIso,
  matchGuest,
  nightsOf,
  overlaps,
  paidOf,
  parseLiveRequest,
  parseRevisionDetails,
  payStateOf,
  payout,
  phoneKey,
  refundedOf,
  sortForTab,
  stageOf,
  toCsv,
  validMobile,
  vatFor,
  waLink,
} from "../lib/booking-rules.ts";
import { BOOKING_DICTS } from "../lib/booking-i18n.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(root + p, "utf8");
const TODAY = "2026-11-22";

test("dates: only real calendar days are accepted", () => {
  assert.equal(isIso("2026-11-22"), true);
  assert.equal(isIso("2026-02-30"), false);
  assert.equal(isIso("2026-1-2"), false);
  assert.equal(isIso(20261122), false);
  assert.equal(nightsOf("2026-11-20", "2026-11-23"), 3);
  assert.equal(nightsOf("2026-11-23", "2026-11-20"), 0);
  // Check-out day is free for the next arrival.
  assert.equal(overlaps({ arrival: "2026-11-20", departure: "2026-11-23" }, { arrival: "2026-11-23", departure: "2026-11-25" }), false);
  assert.equal(overlaps({ arrival: "2026-11-20", departure: "2026-11-23" }, { arrival: "2026-11-22", departure: "2026-11-25" }), true);
});

test("stages and tabs", () => {
  const s = (arrival, departure, cancelled = false) => stageOf({ arrival, departure, cancelled }, TODAY);
  assert.equal(s("2026-11-22", "2026-11-25"), "arr");
  assert.equal(s("2026-11-19", "2026-11-22"), "dep");
  assert.equal(s("2026-11-20", "2026-11-24"), "stay");
  assert.equal(s("2026-11-25", "2026-11-27"), "up");
  assert.equal(s("2026-11-01", "2026-11-05"), "past");
  assert.equal(s("2026-11-25", "2026-11-27", true), "canc");
  assert.equal(inTab("arr", "up"), true, "today's arrivals are upcoming too");
  assert.equal(inTab("stay", "up"), false);
  assert.equal(inTab("past", "all"), true);
  assert.equal(inTab("up", "req"), false);
  const rows = [{ arrival: "2026-11-01" }, { arrival: "2026-11-09" }];
  assert.equal(sortForTab(rows, "past")[0].arrival, "2026-11-09");
  assert.equal(sortForTab(rows, "up")[0].arrival, "2026-11-01");
});

test("money: payout, commission, VAT, paid and due", () => {
  const m = { nights: 1000, cleaning: 200, tax: 168, total: 1368, commission: 180 };
  assert.equal(payout(m), 1020);
  assert.equal(commissionPct(m), 15);
  assert.equal(vatFor("bdc", 1000, 200), 168);
  assert.equal(vatFor("abb", 1000, 200), 0);
  const pays = [
    { kind: "payment", amount: 500 },
    { kind: "payment", amount: 250.5 },
    { kind: "refund", amount: 100 },
  ];
  assert.equal(paidOf(pays), 750.5);
  assert.equal(refundedOf(pays), 100);
  assert.equal(dueOf({ total: 1000, paid: 750.5 }), 249.5);
  assert.equal(dueOf({ total: 1000, paid: 1200 }), 0);
  assert.equal(payStateOf({ collect: "ota", cancelled: false, total: 1000, paid: 0 }), "ota");
  assert.equal(payStateOf({ collect: "property", cancelled: false, total: 1000, paid: 0 }), "unpaid");
  assert.equal(payStateOf({ collect: "property", cancelled: false, total: 1000, paid: 400 }), "part");
  assert.equal(payStateOf({ collect: "property", cancelled: false, total: 1000, paid: 1000 }), "paid");
  assert.equal(payStateOf({ collect: "property", cancelled: true, total: 1000, paid: 0 }), "none");
});

test("payments and refunds can't go over what is owed or paid", () => {
  assert.deepEqual(checkPayment(0, 500, TODAY), { code: "zero" });
  assert.deepEqual(checkPayment(600, 500, TODAY), { code: "over", due: 500 });
  assert.deepEqual(checkPayment(100, 500, "22/11/2026"), { code: "date" });
  assert.equal(checkPayment(500, 500, TODAY), null);
  assert.equal(checkRefund(300, 300), true);
  assert.equal(checkRefund(301, 300), false);
  assert.equal(checkRefund(-1, 300), false);
});

const slot = (id, apt, arrival, departure, extra = {}) => ({ id, unitTypeId: "u1", apt, arrival, departure, cancelled: false, guest: id, ...extra });

test("double bookings: same apartment, shared night, not cancelled, not checked out", () => {
  const list = [
    slot("a", 1, "2026-11-24", "2026-11-27"),
    slot("b", 1, "2026-11-26", "2026-11-28"),
    slot("c", 2, "2026-11-24", "2026-11-27"),
    slot("d", 1, "2026-11-24", "2026-11-27", { cancelled: true }),
    slot("e", 3, "2026-11-01", "2026-11-05"),
    slot("f", 3, "2026-11-03", "2026-11-06"),
  ];
  assert.deepEqual([...doubleBooked(list, TODAY)].sort(), ["a", "b"]);
  assert.equal(clashWith(list[0], list)?.id, "b");
  assert.equal(clashWith(list[2], list), undefined);
});

test("apartments: which are busy and the first free one", () => {
  const list = [slot("a", 1, "2026-11-24", "2026-11-27"), slot("b", 2, "2026-11-25", "2026-11-26")];
  const range = { arrival: "2026-11-25", departure: "2026-11-26" };
  const st = aptStatus(list, "u1", 3, range);
  assert.deepEqual(st.map((s) => s.busy?.id ?? null), ["a", "b", null]);
  assert.equal(firstFreeApt(list, "u1", 3, range), 3);
  assert.equal(firstFreeApt(list, "u1", 2, range), null);
  assert.equal(firstFreeApt(list, "u1", 2, range, "a"), 1, "the booking being moved doesn't block itself");
});

test("moving: only upcoming or arriving-today stays, between more than one apartment", () => {
  assert.equal(canMove({ cancelled: false, stage: "up" }, 2), true);
  assert.equal(canMove({ cancelled: false, stage: "arr" }, 2), true);
  assert.equal(canMove({ cancelled: false, stage: "stay" }, 2), false);
  assert.equal(canMove({ cancelled: false, stage: "dep" }, 2), false);
  assert.equal(canMove({ cancelled: false, stage: "past" }, 2), false);
  assert.equal(canMove({ cancelled: true, stage: "up" }, 2), false);
  assert.equal(canMove({ cancelled: false, stage: "up" }, 1), false);
});

test("cancel and report: direct bookings cancel here, Booking.com reports", () => {
  assert.equal(canCancel({ platform: "direct", cancelled: false, stage: "up" }), true);
  assert.equal(canCancel({ platform: "abb", cancelled: false, stage: "up" }), false);
  assert.equal(canCancel({ platform: "direct", cancelled: false, stage: "past" }), false);
  assert.equal(canCancel({ platform: "direct", cancelled: true, stage: "up" }), false);
  assert.equal(canReport({ platform: "bdc", cancelled: false, stage: "arr" }), true);
  assert.equal(canReport({ platform: "exp", cancelled: false, stage: "arr" }), false);
  assert.equal(canReportNoShow({ arrival: "2026-11-23" }, TODAY), false, "not before check-in");
  assert.equal(canReportNoShow({ arrival: "2026-11-21" }, TODAY), true);
  assert.equal(canReportNoShow({ arrival: "2026-11-18" }, TODAY), false, "too late after 48 hours");
});

test("direct booking checks", () => {
  const unit = { id: "u1", count: 1, maxGuests: 4 };
  const base = {
    unitTypeId: "u1",
    arrival: "2026-11-25",
    departure: "2026-11-27",
    adults: 2,
    children: 0,
    guestMode: "new",
    guestId: "",
    guestName: "Mona",
    guestPhone: "+20 100 123 4567",
    rate: null,
    deposit: 0,
  };
  const ctx = { today: TODAY, unit, bookings: [], total: 2000 };
  const codes = (f, c = ctx) => checkDirect({ ...base, ...f }, c).map((e) => e.code);
  assert.deepEqual(codes({}), []);
  assert.deepEqual(codes({}, { ...ctx, unit: null }), ["noUnit"]);
  assert.deepEqual(codes({ departure: "2026-11-25" }), ["badDates"]);
  assert.deepEqual(codes({ arrival: "2026-11-20", departure: "2026-11-21" }), ["past"]);
  assert.deepEqual(codes({ adults: 0 }), ["noGuests"]);
  assert.deepEqual(codes({ adults: 3, children: 2 }), ["tooMany"]);
  assert.deepEqual(codes({ guestName: " ", guestPhone: "123" }), ["noName", "badPhone"]);
  assert.deepEqual(codes({ guestMode: "old" }), ["noGuest"]);
  assert.deepEqual(codes({ rate: 0 }), ["badRate"]);
  assert.deepEqual(codes({ deposit: 2500 }), ["badDeposit"]);
  const taken = checkDirect(base, { ...ctx, bookings: [slot("Ahmed", 1, "2026-11-26", "2026-11-29")] });
  assert.deepEqual(taken, [{ field: "dates", code: "taken", guest: "Ahmed", from: "2026-11-26", to: "2026-11-29" }]);
  // A second identical apartment is free, so it isn't taken.
  assert.deepEqual(checkDirect(base, { ...ctx, unit: { ...unit, count: 2 }, bookings: [slot("Ahmed", 1, "2026-11-26", "2026-11-29")] }), []);
  assert.deepEqual(directNightly([{ d: "2026-11-25", p: 900 }], null), [{ d: "2026-11-25", p: 900 }]);
  assert.deepEqual(directNightly([{ d: "2026-11-25", p: 900 }], 750), [{ d: "2026-11-25", p: 750 }]);
});

test("guests: phones, tags, matching and duplicates", () => {
  assert.equal(phoneKey("+20 100-123 4567"), "201001234567");
  assert.equal(phoneKey("0020 100 123 4567"), "201001234567");
  assert.equal(validMobile("+20 100 123 4567"), true);
  assert.equal(validMobile("12345"), false);
  assert.equal(waLink("+20 100 123 4567"), "https://wa.me/201001234567");
  assert.equal(initialsOf("  mona   saeed ali"), "MS");
  assert.equal(emailKindOf("x1@guest.booking.com", "bdc"), "alias");
  assert.equal(emailKindOf("", "abb"), "hidden");
  assert.equal(emailKindOf("", "direct"), "");
  assert.deepEqual(guestTags({ stays: 3, vip: true, blocked: true }), ["vip", "repeat", "blocked"]);
  assert.deepEqual(guestTags({ stays: 1, vip: false, blocked: false }), []);
  const guests = [
    { id: "g1", phoneKey: "201001234567", email: "mona@x.com" },
    { id: "g2", phoneKey: "201001234567", email: "" },
    { id: "g3", phoneKey: "", email: "Ali@X.com" },
  ];
  assert.equal(matchGuest(guests, "+20 100 123 4567", "")?.id, "g1");
  assert.equal(matchGuest(guests, "", "ali@x.com")?.id, "g3");
  assert.equal(matchGuest(guests, "", ""), undefined);
  const d = duplicatePairs(guests);
  assert.equal(d.get("g1"), "g2");
  assert.equal(d.get("g2"), "g1");
  assert.equal(d.has("g3"), false);
});

test("requests: decline reasons and hours left", () => {
  assert.equal(declineReasonCode("dates"), "dates_not_available");
  assert.equal(declineReasonCode("fit"), "not_a_good_fit");
  assert.equal(declineReasonCode("other"), "not_comfortable");
  const now = new Date("2026-11-22T10:00:00Z");
  assert.equal(hoursLeft(new Date("2026-11-22T15:30:00Z"), now), 6);
  assert.equal(hoursLeft(new Date("2026-11-22T09:00:00Z"), now), 0);
});

test("export: formula cells are neutralised, quotes escaped, BOM kept for Arabic", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvCell("+20 100"), "'+20 100");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("-12.5"), "-12.5", "negative numbers stay numbers");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell(42), "42");
  const csv = toCsv(["الضيف"], [["منى"]]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(csv, "﻿الضيف\r\nمنى\r\n");
});

test("booking revision: nights, cleaning, VAT, guest and payment collection", () => {
  const r = parseRevisionDetails({
    amount: "1368",
    ota_commission: "180",
    currency: "egp",
    payment_collect: "ota",
    arrival_hour: "15:00",
    notes: "Late arrival",
    customer: { name: "Mona", surname: "Saeed", phone: "+201001234567", mail: "m@guest.booking.com", country: "eg" },
    rooms: [
      {
        occupancy: { adults: 2, children: 1 },
        days: { "2026-11-25": "500", "2026-11-26": 500, "bad-day": 99 },
        taxes: [
          { name: "Cleaning fee", total_price: "200", type: "fee" },
          { name: "VAT", total_price: "168", type: "tax" },
        ],
      },
    ],
  });
  assert.deepEqual(r.nightly, [
    { d: "2026-11-25", p: 500 },
    { d: "2026-11-26", p: 500 },
  ]);
  assert.equal(r.cleaning, 200);
  assert.equal(r.tax, 168);
  assert.equal(r.total, 1368);
  assert.equal(r.commission, 180);
  assert.equal(r.currency, "EGP");
  assert.equal(r.collect, "ota");
  assert.equal(r.adults, 2);
  assert.equal(r.children, 1);
  assert.equal(r.name, "Mona Saeed");
  assert.equal(r.country, "EG");
  assert.equal(r.arrivalTime, "15:00");
  const empty = parseRevisionDetails({});
  assert.equal(empty.adults, 1);
  assert.equal(empty.collect, "property");
  assert.equal(empty.total, 0);
});

test("Airbnb request from the live feed", () => {
  const now = new Date("2026-11-22T10:00:00Z");
  const req = parseLiveRequest(
    {
      id: "lf1",
      attributes: {
        event: "reservation_request",
        property_id: "p1",
        inserted_at: "2026-11-22T08:00:00Z",
        payload: { checkin_date: "2026-12-01", checkout_date: "2026-12-04", guest_name: "Sara Ali", number_of_adults: 3, total_price: 4500, expected_payout_amount: 3900, currency: "egp", message: "Hi" },
      },
    },
    now,
  );
  assert.equal(req.kind, "req");
  assert.equal(req.guest, "Sara Ali");
  assert.equal(req.adults, 3);
  assert.equal(req.payout, 3900);
  assert.equal(req.currency, "EGP");
  assert.equal(req.expiresAt.toISOString(), "2026-11-23T08:00:00.000Z", "24 hours from when it arrived when no expiry is given");
  const inq = parseLiveRequest({ id: "lf2", attributes: { event: "inquiry", payload: { start_date: "2026-12-01", end_date: "2026-12-02" } } }, now);
  assert.equal(inq.kind, "inq");
  assert.equal(parseLiveRequest({ id: "x", attributes: { event: "message", payload: {} } }), null);
  assert.equal(parseLiveRequest({ id: "x", attributes: { event: "inquiry", payload: { start_date: "2026-12-02", end_date: "2026-12-01" } } }), null);
  assert.equal(parseLiveRequest(null), null);
});

function keyShape(v, path = "") {
  if (typeof v === "function") return [`${path}()`];
  if (Array.isArray(v)) return [`${path}[${v.length}]`];
  if (v && typeof v === "object") return Object.keys(v).sort().flatMap((k) => keyShape(v[k], path ? `${path}.${k}` : k));
  return [path];
}

test("texts: Arabic and English have the same keys, and nothing is empty", () => {
  const { ar, en } = BOOKING_DICTS;
  assert.deepEqual(keyShape(en), keyShape(ar));
  assert.ok(ar.ph && en.ph, "phone texts exist");
  const empties = [];
  const walk = (v, p) => {
    if (typeof v === "string" && !v.trim()) empties.push(p);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
  };
  walk(ar, "ar");
  walk(en, "en");
  assert.deepEqual(empties, []);
  assert.equal(typeof ar.ph.hoursLeft(5), "string");
  assert.match(en.ph.hoursLeft(5), /5/);
});

test("broker app texts never name the connection partner", () => {
  const files = [
    "lib/booking-i18n.ts",
    "app/broker/bookings/BookingsApp.tsx",
    "app/broker/bookings/BookingDetail.tsx",
    "app/broker/bookings/BookingDialogs.tsx",
    "app/broker/bookings/RequestPanel.tsx",
    "app/broker/guests/GuestsApp.tsx",
  ];
  for (const f of files) assert.doesNotMatch(read(f), /channex/i, f);
});

test("every booking action checks the signed-in broker before doing anything", () => {
  const src = read("app/actions/bookings.ts");
  assert.match(src, /^"use server";/);
  const bodies = src.split(/\nexport async function /).slice(1);
  assert.ok(bodies.length >= 15, `found ${bodies.length} actions`);
  for (const b of bodies) {
    const name = b.slice(0, b.indexOf("("));
    const lines = b.split("\n").slice(1, 4).join("\n");
    assert.match(lines, /const current = await getCurrentBroker\(\);\s*\n\s*if \(!current\) return signedOut;/, name);
    assert.doesNotMatch(b, /brokerId:\s*(input|f|id)\b/, `${name} never takes the broker from the browser`);
  }
});

test("the Bookings and Guests pages are in the side menu", () => {
  const shell = read("components/broker/BrokerShell.tsx");
  assert.match(shell, /\/broker\/bookings/);
  assert.match(shell, /\/broker\/guests/);
});

test("English counts use the singular for one", () => {
  const { en } = BOOKING_DICTS;
  assert.equal(en.bookingsN(1), "1 booking");
  assert.equal(en.bookingsN(3), "3 bookings");
  assert.equal(en.guestsCount(1), "1 guest");
  assert.equal(en.guestsCount(2), "2 guests");
});
