// The broker Calendar: what each night shows, how edits change nights, the
// bulk edit guard rails, the date presets and the values sent to Channex.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addDays,
  applyEdit,
  blankSpec,
  buildAri,
  bulkPreview,
  checkBulk,
  checkQuickEdit,
  dateRange,
  isEmptyOverride,
  isIsoDate,
  lastEditable,
  monthCells,
  newPrice,
  nightOf,
  overrideKey,
  presets,
  priceFloor,
  readSpec,
  targetNights,
  todayIn,
  weekday,
} from "../lib/calendar-rules.ts";
import { CALENDAR_DICTS } from "../lib/calendar-i18n.ts";

const chalet = {
  id: "t1",
  propertyId: "p1",
  name: "2-bedroom chalet",
  count: 4,
  price: 7800,
  minStay: 2,
  maxStay: 0,
  closedToArrival: [5], // Fridays
  link: null,
};
const studio = { ...chalet, id: "t2", name: "Studio", count: 1, price: 9500, minStay: 1, closedToArrival: [] };

const spec = (patch = {}) => ({ ...blankSpec(), ...patch });
const bulk = (patch = {}) => ({ ...blankSpec("pctUp"), typeIds: ["t1", "t2"], from: "2026-10-22", to: "2026-10-28", confirm: false, ...patch });

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

test("dates are checked and counted as plain calendar days", () => {
  assert.equal(isIsoDate("2026-10-22"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("22/10/2026"), false);
  assert.equal(isIsoDate(20261022), false);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(weekday("2026-10-22"), 4); // Thursday
  assert.deepEqual(dateRange("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  // 500 nights can be edited, today included.
  assert.equal(lastEditable("2026-10-22"), "2028-03-04");
});

test("today is the date in the given time zone, not the server's", () => {
  // 23:30 UTC on Oct 22 is already Oct 23 in Cairo.
  assert.equal(todayIn("Africa/Cairo", new Date("2026-10-22T23:30:00Z")), "2026-10-23");
  assert.equal(todayIn("UTC", new Date("2026-10-22T23:30:00Z")), "2026-10-22");
});

test("month grids start on Saturday", () => {
  const oct = monthCells(2026, 9); // October 2026 starts on a Thursday
  assert.equal(oct.length % 7, 0);
  assert.deepEqual(oct.slice(0, 6), [null, null, null, null, null, "2026-10-01"]);
  assert.equal(oct.filter(Boolean).length, 31);
  assert.equal(oct.at(-1) === null || oct.at(-1) === "2026-10-31", true);
  // August 2026 starts on a Saturday: no blank before the 1st.
  assert.equal(monthCells(2026, 7)[0], "2026-08-01");
});

// ---------------------------------------------------------------------------
// Nights
// ---------------------------------------------------------------------------

test("a night without changes uses the unit type's defaults", () => {
  const n = nightOf(chalet, "2026-10-22", undefined);
  assert.equal(n.price, 7800);
  assert.equal(n.minStay, 2);
  assert.equal(n.unitsOpen, 4);
  assert.equal(n.left, 4);
  assert.equal(n.cta, false);
  // The rate's closed-to-arrival weekdays apply (Oct 23 2026 is a Friday).
  assert.equal(nightOf(chalet, "2026-10-23", undefined).cta, true);
});

test("changes on a night win over the defaults, and closed nights sell nothing", () => {
  const n = nightOf(chalet, "2026-10-23", { price: 9000, minStay: 3, cta: false, unitsOpen: 2 });
  assert.equal(n.price, 9000);
  assert.equal(n.minStay, 3);
  assert.equal(n.cta, false);
  assert.equal(n.left, 2);
  assert.equal(nightOf(chalet, "2026-10-22", { unitsOpen: 9 }).unitsOpen, 4, "never more units open than exist");
  assert.equal(nightOf(chalet, "2026-10-22", { stop: true }).left, 0);
  assert.equal(nightOf(chalet, "2026-10-22", { block: "owner" }).left, 0);
  assert.equal(nightOf(chalet, "2026-10-22", undefined, 3).left, 1, "bookings take units");
  assert.equal(nightOf(chalet, "2026-10-22", undefined, 0, true).left, 0, "a linked booking closes the night");
});

test("an override with nothing left in it is empty", () => {
  assert.equal(isEmptyOverride({}), true);
  assert.equal(isEmptyOverride({ price: null, stop: undefined }), true);
  assert.equal(isEmptyOverride({ stop: false }), false);
  assert.equal(overrideKey("t1", "2026-10-22"), "t1|2026-10-22");
});

// ---------------------------------------------------------------------------
// Quick edit
// ---------------------------------------------------------------------------

test("quick edit checks run in the design's order", () => {
  assert.equal(checkQuickEdit(spec({ value: "0" })), "aboveZero");
  assert.equal(checkQuickEdit(spec({ value: "-5" })), "aboveZero");
  assert.equal(checkQuickEdit(spec({ mode: "pctDown", value: "100" })), "decreaseUnder100");
  assert.equal(checkQuickEdit(spec({ min: "0" })), "minStay");
  assert.equal(checkQuickEdit(spec({ min: "1.5" })), "minStay");
  assert.equal(checkQuickEdit(spec({ max: "-1" })), "maxStay");
  assert.equal(checkQuickEdit(spec({ min: "4", max: "3" })), "maxBelowMin");
  assert.equal(checkQuickEdit(spec({ min: "4", max: "0" })), null, "0 = no limit");
  assert.equal(checkQuickEdit(spec({ units: "-1" })), "units");
  assert.equal(checkQuickEdit(spec({ value: "9000", days: [false, false, false, false, false, false, false] })), "weekday");
  assert.equal(checkQuickEdit(spec()), "nothing");
  assert.equal(checkQuickEdit(spec({ stop: "on" })), null);
  assert.equal(checkQuickEdit(spec({ value: "9,000" })), null, "a thousands comma is fine");
  // The first problem is reported, not a later one.
  assert.equal(checkQuickEdit(spec({ value: "0", min: "0" })), "aboveZero");
});

test("price changes: set, percentages and amounts", () => {
  assert.equal(newPrice(7800, "set", 9000), 9000);
  assert.equal(newPrice(7800, "pctUp", 10), 8580);
  assert.equal(newPrice(9500, "pctUp", 10), 10450);
  assert.equal(newPrice(9000, "pctDown", 50), 4500);
  assert.equal(newPrice(9000, "amtUp", 500), 9500);
  assert.equal(newPrice(9000, "amtDown", 500), 8500);
  assert.equal(newPrice(9000, "keep", 500), 9000);
});

test("an edit changes only what was filled in", () => {
  const before = { price: 9000, stop: true };
  const after = applyEdit(chalet, "2026-10-22", before, spec({ min: "3", cta: "on" }));
  assert.deepEqual(after, { price: 9000, stop: true, minStay: 3, cta: true });
  assert.deepEqual(before, { price: 9000, stop: true }, "the stored night isn't changed in place");
  // Percentages apply to the night's current price, not the base price.
  assert.equal(applyEdit(chalet, "2026-10-22", { price: 9000 }, spec({ mode: "pctUp", value: "10" })).price, 9900);
  assert.equal(applyEdit(chalet, "2026-10-22", undefined, spec({ stop: "off", ctd: "on" })).stop, false);
  assert.equal(applyEdit(chalet, "2026-10-22", undefined, spec({ stop: "off", ctd: "on" })).ctd, true);
});

test("units open only apply to types with several units, capped at the count", () => {
  assert.equal(applyEdit(chalet, "2026-10-22", undefined, spec({ units: "2" })).unitsOpen, 2);
  assert.equal(applyEdit(chalet, "2026-10-22", undefined, spec({ units: "9" })).unitsOpen, 4);
  assert.equal(applyEdit(studio, "2026-10-22", undefined, spec({ units: "0" })).unitsOpen, undefined);
});

test("edits touch the picked weekdays and skip fully booked nights", () => {
  const onlyFri = [false, false, false, false, false, true, false];
  const { targets } = targetNights([chalet], "2026-10-22", "2026-11-04", onlyFri);
  assert.deepEqual(targets.map((x) => x.date), ["2026-10-23", "2026-10-30"]);
  const full = (typeId, date) => (date === "2026-10-23" ? 4 : 0);
  const r = targetNights([chalet], "2026-10-22", "2026-10-24", blankSpec().days, full);
  assert.equal(r.targets.length, 2);
  assert.equal(r.skipped, 1);
});

// ---------------------------------------------------------------------------
// Bulk edit
// ---------------------------------------------------------------------------

test("the minimum price is 60% of the base price, to the nearest 100", () => {
  assert.equal(priceFloor(chalet), 4700);
  assert.equal(priceFloor(studio), 5700);
});

test("bulk preview counts nights, prices below the minimum and shows one example per type", () => {
  const p = bulkPreview([chalet, studio], new Map([["t1|2026-10-22", { price: 9000 }]]), bulk({ value: "10" }));
  assert.equal(p.nights, 14);
  assert.equal(p.below, 0);
  assert.deepEqual(
    p.examples.map((e) => [e.typeId, e.date, e.from, e.to]),
    [
      ["t1", "2026-10-22", 9000, 9900],
      ["t2", "2026-10-22", 9500, 10450],
    ],
  );
  const low = bulkPreview([chalet, studio], new Map(), bulk({ mode: "pctDown", value: "50" }));
  assert.equal(low.below, 14);
  assert.equal(low.examples.every((e) => e.below), true);
  // Only the chosen types count.
  assert.equal(bulkPreview([chalet, studio], new Map(), bulk({ typeIds: ["t2"], value: "10" })).nights, 7);
});

test("bulk checks run in the design's order, and big changes need a confirm", () => {
  const today = "2026-10-22";
  const run = (patch) => {
    const s = bulk(patch);
    return checkBulk(s, bulkPreview([chalet, studio], new Map(), s), today);
  };
  assert.equal(run({ typeIds: [] }), "noTypes");
  assert.equal(run({ from: "2026-10-21" }), "range", "no past nights");
  assert.equal(run({ to: "2028-03-05" }), "range", "no more than 500 days ahead");
  assert.equal(run({ from: "2026-10-28", to: "2026-10-22" }), "range");
  assert.equal(run({ days: [false, false, false, false, false, false, false] }), "range");
  assert.equal(run({ value: "" }), "priceValue");
  assert.equal(run({ mode: "pctDown", value: "100" }), "decreaseUnder100");
  assert.equal(run({ value: "10", min: "0" }), "minStay");
  assert.equal(run({ mode: "keep" }), "nothing");
  assert.equal(run({ mode: "keep", stop: "on" }), null);
  assert.equal(run({ mode: "pctDown", value: "50" }), "below");
  assert.equal(run({ value: "10", to: "2026-12-31" }), "confirm");
  assert.equal(run({ value: "10", to: "2026-12-31", confirm: true }), null);
  assert.equal(run({ value: "10" }), null);
});

test("date presets are in the future and inside the 500 days", () => {
  const today = "2026-10-22"; // a Thursday
  const list = presets(today);
  const byKey = Object.fromEntries(list.map((p) => [p.key, p]));
  assert.deepEqual([byKey.wknd.from, byKey.wknd.to], ["2026-10-29", "2026-10-30"], "next week's Thursday and Friday nights");
  assert.deepEqual([byKey.n30.from, byKey.n30.to], ["2026-10-22", "2026-11-20"]);
  assert.deepEqual([byKey.eid.from, byKey.eid.to, byKey.eid.year], ["2027-05-15", "2027-05-19", 2027]);
  assert.deepEqual([byKey.summer.from, byKey.summer.to, byKey.summer.year], ["2027-06-01", "2027-09-30", 2027]);
  assert.deepEqual([byKey.ny.from, byKey.ny.to], ["2026-12-30", "2027-01-01"]);
  for (const p of list) assert.ok(p.from >= today && p.to <= lastEditable(today), p.key);
  // In July, this summer starts today.
  const july = Object.fromEntries(presets("2027-07-10").map((p) => [p.key, p]));
  assert.equal(july.summer.from, "2027-07-10");
  assert.equal(july.summer.year, 2027);
});

// ---------------------------------------------------------------------------
// Values sent to Channex
// ---------------------------------------------------------------------------

const ids = { propertyId: "cx-p", roomTypes: { t1: "cx-room" }, ratePlans: { t1: "cx-rate" } };

test("consecutive nights with the same values go to Channex as one range", () => {
  const nights = ["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-26"].map((date) => ({
    type: { ...chalet, closedToArrival: [] },
    date,
    night: nightOf({ ...chalet, closedToArrival: [] }, date, date === "2026-10-24" ? { price: 9000 } : undefined),
  }));
  const { restrictions, availability } = buildAri(ids, nights);
  assert.deepEqual(
    restrictions.map((r) => [r.date_from, r.date_to, r.rate]),
    [
      ["2026-10-22", "2026-10-23", "7800.00"],
      ["2026-10-24", "2026-10-24", "9000.00"],
      ["2026-10-26", "2026-10-26", "7800.00"],
    ],
  );
  assert.deepEqual(
    availability.map((a) => [a.date_from, a.date_to, a.availability]),
    [
      ["2026-10-22", "2026-10-24", 4],
      ["2026-10-26", "2026-10-26", 4],
    ],
  );
  assert.equal(restrictions[0].property_id, "cx-p");
  assert.equal(restrictions[0].rate_plan_id, "cx-rate");
  assert.equal(restrictions[0].min_stay_arrival, 2);
  assert.equal(availability[0].room_type_id, "cx-room");
});

test("closed and blocked nights send no availability, and rules go with the price", () => {
  const date = "2026-10-22";
  const { restrictions, availability } = buildAri(ids, [
    { type: chalet, date, night: nightOf(chalet, date, { block: "maint", ctd: true, stop: true }) },
  ]);
  assert.equal(availability[0].availability, 0);
  assert.equal(restrictions[0].stop_sell, true);
  assert.equal(restrictions[0].closed_to_departure, true);
  // Unit types not on Channex yet are left out.
  assert.deepEqual(buildAri(ids, [{ type: studio, date, night: nightOf(studio, date) }]), { restrictions: [], availability: [] });
});

// ---------------------------------------------------------------------------
// Requests from the screens
// ---------------------------------------------------------------------------

test("only well-formed edits are read from a request", () => {
  assert.deepEqual(readSpec(spec({ value: "9000" })), spec({ value: "9000" }));
  assert.equal(readSpec(null), null);
  assert.equal(readSpec({ ...spec(), mode: "double" }), null);
  assert.equal(readSpec({ ...spec(), cta: "maybe" }), null);
  assert.equal(readSpec({ ...spec(), days: [true] }), null);
  assert.equal(readSpec({ ...spec(), days: [1, 1, 1, 1, 1, 1, 1] }), null);
  assert.equal(readSpec({ ...spec(), value: "9".repeat(50) }).value.length, 20, "long values are cut");
  assert.equal(readSpec({ ...spec(), value: 9000 }).value, "", "values must be text");
});

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

test("Arabic counts follow the counting rules", () => {
  const ar = CALENDAR_DICTS.ar;
  assert.equal(ar.nights(1), "ليلة واحدة");
  assert.equal(ar.nights(2), "ليلتان");
  assert.equal(ar.nights(3), "3 ليالٍ");
  assert.equal(ar.nights(88), "88 ليلة");
  assert.equal(ar.syncFailedPhone(2), "لم يُرسل تعديلان");
  assert.equal(ar.dayRange("2026-10-24", "2026-10-26"), "24 – 26 أكتوبر");
  assert.equal(CALENDAR_DICTS.en.dayRange("2026-10-24", "2026-10-26"), "Oct 24 – 26");
  assert.equal(CALENDAR_DICTS.en.dayRange("2026-10-30", "2026-11-02"), "Oct 30 – Nov 2");
  assert.equal(CALENDAR_DICTS.en.summary("88 nights", 2, "2 nights"), "88 nights will change · 2 booked nights skipped");
  assert.equal(CALENDAR_DICTS.en.summary("7 nights", 0, "0 nights"), "7 nights will change · no booked nights skipped");
});

test("both languages have the same texts", () => {
  const keys = (o) => Object.keys(o).sort();
  assert.deepEqual(keys(CALENDAR_DICTS.en), keys(CALENDAR_DICTS.ar));
  assert.deepEqual(keys(CALENDAR_DICTS.en.errors), keys(CALENDAR_DICTS.ar.errors));
});
