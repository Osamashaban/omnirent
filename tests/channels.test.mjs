// Channel connections: platform states, the links grid cells, suggested
// matches, rate plans, the price adjustment, the ready message, reading the
// connection partner's answers, the texts in both languages and the webhook's
// secret check.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PLATFORMS, RECOMMENDED, initials, isPlatformId, isPropertyLevel, platformById } from "../lib/channel-catalog.ts";
import {
  bookedNights,
  cellFor,
  checkMarkup,
  checkRatePlans,
  classifyFailure,
  defaultRatePlans,
  derivedOption,
  kpis,
  linkColumns,
  linkKey,
  markedUp,
  parseAirbnbListings,
  parseMappingDetails,
  parseRevision,
  platformFromOta,
  platformState,
  readFields,
  readyMessage,
  settingsFor,
  suggestions,
  testPassed,
} from "../lib/channel-rules.ts";
import { CHANNEL_DICTS } from "../lib/channel-i18n.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(root + p, "utf8");

const abb = platformById("abb");
const bdc = platformById("bdc");

function state(over = {}) {
  return {
    accounts: [],
    conns: [],
    props: [{ id: "p1", name: "Hacienda Bay Chalets", published: true, currency: "EGP" }],
    units: [
      { id: "u1", propertyId: "p1", name: "2-bedroom chalet", count: 4, guests: 6, rates: [{ id: "r1", name: "Standard", derived: false }, { id: "r2", name: "Non-refundable", derived: true }] },
      { id: "u2", propertyId: "p1", name: "3-bedroom chalet", count: 2, guests: 8, rates: [{ id: "r3", name: "Standard", derived: false }] },
    ],
    listings: [],
    links: [],
    future: {},
    unlisted: [],
    ...over,
  };
}
const account = (platform, st) => ({ platform, state: st, waitReason: null, account: "", priceMode: "same", pricePct: 0 });
const conn = (platform, propertyId, st) => ({ id: `c-${platform}-${propertyId}`, platform, propertyId, state: st, waitReason: null, externalId: "", rejectReason: null, currency: null, exchangeRate: null });
const listing = (id, platform, name, over = {}) => ({ id, platform, propertyId: null, externalId: id, name, city: "", guests: null, rates: [], gone: false, dismissed: [], ...over });
const link = (id, unitTypeId, platform, listingId, over = {}) => ({ id, unitTypeId, platform, listingId, syncOn: false, status: "off", error: null, ratePlans: null, ...over });

// --- Catalogue ---------------------------------------------------------------

test("catalogue: 77 platforms with unique ids, the eight recommended first", () => {
  assert.equal(PLATFORMS.length, 77);
  assert.equal(new Set(PLATFORMS.map((p) => p.id)).size, 77);
  assert.deepEqual(RECOMMENDED.map((p) => p.id), ["abb", "bdc", "hw", "exp", "ago", "goo", "vrbo", "trip"]);
  assert.equal(abb.how, "account");
  assert.ok(isPlatformId("bdc"));
  assert.ok(!isPlatformId("nope"));
  assert.ok(!isPlatformId(42));
});

test("catalogue: Booking.com is connected property by property, Airbnb once per company", () => {
  assert.ok(isPropertyLevel(bdc));
  assert.ok(!isPropertyLevel(abb));
  assert.equal(initials("Agoda"), "Ag");
  assert.equal(initials("Booking.com"), "B");
  assert.equal(initials("9flats"), "9");
});

// --- Platform state ----------------------------------------------------------

test("state: company-level platforms follow their account", () => {
  assert.equal(platformState(state(), abb), "off");
  assert.equal(platformState(state({ accounts: [account("abb", "on")] }), abb), "on");
  assert.equal(platformState(state({ accounts: [account("abb", "attn")] }), abb), "attn");
});

test("state: property-level platforms are on when any property is, then waiting, then rejected", () => {
  assert.equal(platformState(state({ conns: [conn("bdc", "p1", "rej")] }), bdc), "rej");
  assert.equal(platformState(state({ conns: [conn("bdc", "p1", "rej"), conn("bdc", "p2", "wait")] }), bdc), "wait");
  assert.equal(platformState(state({ conns: [conn("bdc", "p1", "wait"), conn("bdc", "p2", "on")] }), bdc), "on");
});

test("links grid columns: only platforms that aren't off, rejected or unavailable", () => {
  const s = state({ accounts: [account("abb", "on")], conns: [conn("bdc", "p1", "rej"), conn("hw", "p1", "wait")] });
  assert.deepEqual(linkColumns(s).map((p) => p.id), ["abb", "hw"]);
});

test("kpis: connected, waiting, needs attention (incl. issues) and live unit types", () => {
  const s = state({
    accounts: [account("abb", "on"), account("vrbo", "attn")],
    conns: [conn("bdc", "p1", "wait"), conn("hw", "p1", "rej")],
    links: [link("k1", "u1", "abb", "l1", { syncOn: true })],
  });
  assert.deepEqual(kpis(s, 2), { on: 2, wait: 1, attn: 4, live: 1, units: 2 });
});

// --- Cells -------------------------------------------------------------------

test("cell: a property-level platform without this property shows Connect this property", () => {
  const s = state({ conns: [conn("bdc", "p9", "on")] });
  assert.deepEqual(cellFor(s, {}, s.units[0], bdc), { kind: "prop", propertyId: "p1", rejected: false });
  const r = state({ conns: [conn("bdc", "p9", "on"), conn("bdc", "p1", "rej")] });
  assert.equal(cellFor(r, {}, r.units[0], bdc).rejected, true);
  const w = state({ conns: [conn("bdc", "p1", "wait")] });
  assert.deepEqual(cellFor(w, {}, w.units[0], bdc), { kind: "wait", property: true });
});

test("cell: linked shows live, off, failed, unlisted or paused, and warns on a guest mismatch", () => {
  const l1 = listing("l1", "abb", "Hacienda 2BR", { guests: 4 });
  const base = { accounts: [account("abb", "on")], listings: [l1] };
  let s = state({ ...base, links: [link("k1", "u1", "abb", "l1", { syncOn: true, status: "live" })] });
  let c = cellFor(s, {}, s.units[0], abb);
  assert.equal(c.kind, "linked");
  assert.equal(c.sub, "live");
  assert.deepEqual(c.guests, [6, 4]);
  s = state({ ...base, links: [link("k1", "u1", "abb", "l1")] });
  assert.equal(cellFor(s, {}, s.units[0], abb).sub, "off");
  s = state({ ...base, links: [link("k1", "u1", "abb", "l1", { status: "failed" })] });
  assert.equal(cellFor(s, {}, s.units[0], abb).sub, "failed");
  s = state({ ...base, links: [link("k1", "u1", "abb", "l1", { syncOn: true })], unlisted: [linkKey("u1", "abb")] });
  assert.equal(cellFor(s, {}, s.units[0], abb).sub, "unlisted");
  s = state({ ...base, accounts: [account("abb", "attn")], links: [link("k1", "u1", "abb", "l1", { syncOn: true })] });
  assert.equal(cellFor(s, {}, s.units[0], abb).sub, "paused");
});

test("cell: a suggestion, otherwise Link a listing", () => {
  const s = state({ accounts: [account("abb", "on")], listings: [listing("l1", "abb", "x")] });
  assert.equal(cellFor(s, { [linkKey("u1", "abb")]: "l1" }, s.units[0], abb).kind, "sugg");
  assert.equal(cellFor(s, {}, s.units[0], abb).kind, "none");
  // A suggestion pointing at a listing that's gone from the data is ignored.
  assert.equal(cellFor(s, { [linkKey("u1", "abb")]: "zz" }, s.units[0], abb).kind, "none");
});

// --- Suggestions -------------------------------------------------------------

test("suggestions: names that share words, at most one per unit type and listing", () => {
  const s = state({
    accounts: [account("abb", "on")],
    listings: [listing("l1", "abb", "Hacienda Bay 2-bedroom chalet", { guests: 6 }), listing("l2", "abb", "Three bedroom chalet Hacienda"), listing("l3", "abb", "Downtown loft")],
  });
  const g = suggestions(s);
  assert.equal(g[linkKey("u1", "abb")], "l1");
  assert.equal(g[linkKey("u2", "abb")], "l2");
  assert.ok(!Object.values(g).includes("l3"));
});

test("suggestions: Not this is remembered and linked listings aren't offered again", () => {
  const s = state({
    accounts: [account("abb", "on")],
    listings: [listing("l1", "abb", "Hacienda Bay 2-bedroom chalet", { dismissed: ["u1"] })],
  });
  assert.notEqual(suggestions(s)[linkKey("u1", "abb")], "l1");
  const linked = state({
    accounts: [account("abb", "on")],
    listings: [listing("l1", "abb", "Hacienda Bay 2-bedroom chalet")],
    links: [link("k", "u2", "abb", "l1")],
  });
  assert.deepEqual(suggestions(linked), {});
});

test("suggestions: the only room of a property with one unit type is its match", () => {
  const s = state({
    units: [{ id: "u1", propertyId: "p1", name: "Apartment", count: 1, guests: 2, rates: [] }],
    conns: [conn("bdc", "p1", "on")],
    listings: [listing("l1", "bdc", "Deluxe Double Room", { propertyId: "p1" })],
  });
  assert.equal(suggestions(s)[linkKey("u1", "bdc")], "l1");
});

// --- Rate plans --------------------------------------------------------------

test("rate plans: non-refundable gets the derived rate, the rest the standard rate", () => {
  const unit = state().units[0];
  const rates = [{ id: "a", title: "Standard rate", occupancy: 6 }, { id: "b", title: "Non-refundable", occupancy: 6 }];
  assert.deepEqual(defaultRatePlans(rates, unit), { a: "r1", b: "r2" });
  assert.deepEqual(checkRatePlans({ a: "r1", b: "none" }, rates, unit), { a: "r1", b: "none" });
  assert.equal(checkRatePlans({ a: "none", b: "none" }, rates, unit), "none");
  // Another unit type's rate, or a missing plan, is refused.
  assert.equal(checkRatePlans({ a: "r3", b: "r1" }, rates, unit), null);
  assert.equal(checkRatePlans({ a: "r1" }, rates, unit), null);
  assert.equal(checkRatePlans(null, rates, unit), null);
});

// --- Price -------------------------------------------------------------------

test("price: same, or 1 to 50% up or down, whole numbers only", () => {
  assert.deepEqual(checkMarkup("same", 30), { mode: "same", pct: 0 });
  assert.deepEqual(checkMarkup("up", 15), { mode: "up", pct: 15 });
  assert.deepEqual(checkMarkup("down", "10"), { mode: "down", pct: 10 });
  for (const bad of [0, 51, 2.5, "x", -5]) assert.equal(checkMarkup("up", bad), null);
  assert.equal(checkMarkup("double", 10), null);
  assert.equal(markedUp(1000, "up", 15), 1150);
  assert.equal(markedUp(1000, "down", 10), 900);
  assert.equal(markedUp(1000, "same", 0), 1000);
  assert.deepEqual(derivedOption("up", 15), { rate: [["increase_by_percent", "15"]] });
  assert.deepEqual(derivedOption("down", 5), { rate: [["decrease_by_percent", "5"]] });
  assert.equal(derivedOption("same", 0), null);
});

// --- Ready message -----------------------------------------------------------

test("ready message: names the property, its ID and the partner, signed by the broker", () => {
  const m = readyMessage({ platform: "Hostelworld", property: "Nile Loft", pid: " 1234 ", signer: "Karim Fawzy", company: "Nile Stays" });
  assert.match(m, /^Hello Hostelworld support team/);
  assert.match(m, /"Nile Loft" \(property ID 1234\)/);
  assert.match(m, /Channex\.io/);
  assert.match(m, /Karim Fawzy, Nile Stays$/);
  const noId = readyMessage({ platform: "X", property: null, pid: "", signer: "K", company: "" });
  assert.match(noId, /Please connect my properties to/);
  assert.match(noId, /reply with my property ID/);
  assert.match(noId, /\nK$/);
});

// --- Connection fields and Channex's answers ---------------------------------

test("fields: only known keys, trimmed, at most 200 characters", () => {
  assert.deepEqual(readFields({ pid: " 77 ", u: "", pw: "s", evil: "x" }), { pid: "77", pw: "s" });
  assert.equal(readFields({ pid: "x".repeat(201) }), null);
  assert.equal(readFields({ pid: 5 }), null);
  assert.equal(readFields([]), null);
});

test("settings: fields go to the adapter's params by name, the rest in order", () => {
  const params = [
    { name: "hotel_id", type: "string", position: 1 },
    { name: "username", type: "string", position: 2 },
    { name: "password", type: "password", position: 3 },
    { name: "send_full_sync", type: "boolean", position: 4, default: true },
    { name: "hidden_x", type: "hidden", position: 5 },
  ];
  assert.deepEqual(settingsFor(params, { pid: "H1", u: "me", pw: "pw" }), { hotel_id: "H1", username: "me", password: "pw", send_full_sync: true });
  assert.deepEqual(settingsFor([{ name: "foo", type: "string", position: 1 }], { pid: "9" }), { foo: "9" });
});

test("test answers: why a connection failed", () => {
  assert.equal(classifyFailure({ errors: ["Property is connected to another channel manager"] }), "cm");
  assert.equal(classifyFailure({ errors: ["Invalid password"] }), "auth");
  assert.equal(classifyFailure({ errors: ["Enter the verification code"] }), "otp");
  assert.equal(classifyFailure(null), "reach");
  assert.ok(testPassed({ data: { success: true } }));
  assert.ok(!testPassed({ data: { success: "true" } }));
  assert.ok(!testPassed(null));
});

test("mapping details and Airbnb listings are read defensively", () => {
  const m = parseMappingDetails({ data: { pricing_type: "OBP", rooms: [{ id: 5, title: "Double", rates: [{ id: 9, title: "NR", max_persons: 2 }] }, { title: "no id" }] } });
  assert.equal(m.pricingType, "OBP");
  assert.deepEqual(m.rooms, [{ id: "5", title: "Double", maxPersons: 2, rates: [{ id: "9", title: "NR", occupancy: 2 }] }]);
  assert.deepEqual(parseMappingDetails("junk"), { pricingType: null, rooms: [] });
  const a = parseAirbnbListings({ data: { listing_id_dictionary: { values: [{ id: 1, title: "Loft", person_capacity: 3, city: "Cairo" }, { id: 2, occupancies: [2, 4] }, {}] } } });
  assert.deepEqual(a, [
    { id: "1", title: "Loft", guests: 3, city: "Cairo" },
    { id: "2", title: "2", guests: 4, city: "" },
  ]);
});

test("booking revisions: status, dates, guest and rooms; incomplete ones are dropped", () => {
  const r = parseRevision({
    data: {
      id: "rev1",
      attributes: {
        booking_id: "b1",
        property_id: "p-chx",
        ota_name: "Booking.com",
        ota_reservation_code: 4455,
        status: "modified",
        arrival_date: "2026-11-01",
        departure_date: "2026-11-04",
        customer: { name: "Mona", surname: "Adel" },
        rooms: [{ room_type_id: "rt", rate_plan_id: "rp", checkin_date: "2026-11-01", checkout_date: "2026-11-03" }],
      },
    },
  });
  assert.equal(r.status, "modified");
  assert.equal(r.code, "4455");
  assert.equal(r.guest, "Mona Adel");
  assert.deepEqual(r.rooms, [{ roomTypeId: "rt", ratePlanId: "rp", arrival: "2026-11-01", departure: "2026-11-03" }]);
  assert.equal(parseRevision({ data: { id: "x", attributes: { property_id: "p" } } }), null);
  assert.equal(parseRevision(null), null);
  assert.equal(platformFromOta("Booking.com").id, "bdc");
  assert.equal(platformFromOta("HomeAway").id, "vrbo");
  assert.equal(platformFromOta(""), undefined);
});

test("booked nights: per unit type and night, departure day free, cancellations ignored", () => {
  const n = bookedNights([
    { unitTypeId: "u1", arrival: "2026-11-01", departure: "2026-11-03", status: "new", rooms: 1 },
    { unitTypeId: "u1", arrival: "2026-11-02", departure: "2026-11-03", status: "modified", rooms: 2 },
    { unitTypeId: "u1", arrival: "2026-11-01", departure: "2026-11-05", status: "cancelled", rooms: 1 },
    { unitTypeId: null, arrival: "2026-11-01", departure: "2026-11-05", status: "new", rooms: 1 },
  ]);
  assert.equal(n.get("u1|2026-11-01"), 1);
  assert.equal(n.get("u1|2026-11-02"), 3);
  assert.equal(n.get("u1|2026-11-03"), undefined);
  assert.equal(n.size, 2);
});

// --- Texts -------------------------------------------------------------------

test("texts: Arabic and English have the same keys", () => {
  const keys = (o) => Object.keys(o).sort();
  assert.deepEqual(keys(CHANNEL_DICTS.ar), keys(CHANNEL_DICTS.en));
  for (const k of Object.keys(CHANNEL_DICTS.en)) {
    const a = CHANNEL_DICTS.ar[k];
    const e = CHANNEL_DICTS.en[k];
    assert.equal(typeof a, typeof e, k);
    if (e && typeof e === "object") assert.deepEqual(keys(a), keys(e), k);
  }
});

test("texts: brokers never see our partner's name on screen", () => {
  const strings = [];
  const walk = (v) => {
    if (typeof v === "string") strings.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(CHANNEL_DICTS);
  assert.ok(strings.length > 100);
  for (const s of strings) assert.ok(!/channex/i.test(s), s);
  // Nor in the screens' own markup (comments aside).
  for (const f of ["PlatformsTab", "LinksTab", "Dialogs", "ChannelsApp", "PropertyChannels"]) {
    const src = read(`app/broker/channels/${f}.tsx`)
      .replace(/\/\/.*$/gm, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    const visible = src.match(/>[^<>{}]*channex[^<>{}]*</gi) ?? [];
    assert.deepEqual(visible, [], f);
  }
});

test("texts: no team-creates-it option for brokers", () => {
  assert.ok(!/our team (creates|will create)/i.test(JSON.stringify(CHANNEL_DICTS.en)));
});

// --- Webhook -----------------------------------------------------------------

test("webhook: refuses requests without the shared secret, compared in constant time", () => {
  const src = read("app/api/channex/webhook/route.ts");
  assert.match(src, /process\.env\.CHANNEX_WEBHOOK_SECRET/);
  assert.match(src, /timingSafeEqual/);
  assert.match(src, /if \(!secret \|\| !given\) return false/);
  assert.match(src, /if \(!allowed\(req\)\) return NextResponse\.json\(\{ ok: false \}, \{ status: 401 \}\)/);
  // The booking is fetched from the partner, not taken from the body.
  assert.match(src, /bookingRevision\(revisionId\)/);
});

test("server actions re-check the signed-in broker", () => {
  const src = read("app/actions/channels.ts");
  const actions = [...src.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
  assert.ok(actions.length >= 15);
  for (const name of actions) {
    const body = src.slice(src.indexOf(`export async function ${name}`)).split(/\nexport async function /)[0];
    assert.match(body, /getCurrentBroker\(\)|broker\(\)/, name);
  }
});

test("properties: a unit type with upcoming platform bookings can't be removed", () => {
  const src = read("app/actions/properties.ts");
  assert.match(src, /unitHasUpcomingBookings\(u\.id\)\)\) return \{ ok: false, error: "unitBooked" \}/);
  assert.ok(src.indexOf("unitHasUpcomingBookings(u.id)") < src.indexOf("tx.unitType.deleteMany"));
});
