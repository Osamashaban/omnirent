// Publishing to Channex: what Omnirent sends for a property, and how Channex's
// refusals are turned into words for the broker.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  contentPayload,
  derivedRatePayload,
  describeFailure,
  policyPayload,
  propertyPayload,
  readSyncError,
  roomTypePayload,
  sellWindow,
  stageStates,
  standardRatePayload,
  weekFlags,
} from "../lib/channex-payload.ts";

// The design's Hacienda Bay sample: two chalet types, each with a standard
// rate and a non-refundable rate 10% less.
function hacienda() {
  const rate = (id, price, extra = {}) => ({
    id,
    channexId: null,
    name: "Standard rate",
    price,
    guests: 4,
    childFee: 0,
    infantFee: 0,
    meals: "none",
    minStay: 2,
    maxStay: 0,
    closedToArrival: [],
    parentId: null,
    adjustment: null,
    adjustValue: null,
    ...extra,
  });
  return {
    channexId: null,
    nickname: "Hacienda Bay Chalets",
    titleEn: "Hacienda Bay chalets with sea view",
    email: "hacienda.bay@getomnirent.com",
    phone: "+20 100 555 2841",
    currency: "EGP",
    countryIso2: "EG",
    cityName: "North Coast",
    address: "Hacienda Bay, km 175",
    postalCode: "",
    latitude: null,
    longitude: null,
    timezone: "Africa/Cairo",
    channexType: "chalet",
    website: "",
    descriptionEn: "Sea-view chalets.",
    importantInfo: "",
    checkInTime: "15:00",
    checkOutTime: "12:00",
    maxGuests: null,
    adultsOnly: false,
    internetType: "wifi",
    internetCoverage: "all_rooms",
    internetCost: null,
    parkingType: "on_site",
    parkingReservation: "not_needed",
    parkingPrivate: true,
    petsPolicy: "by_arrangement",
    petFee: 0,
    petDeposit: 500,
    smokingPolicy: "designated_areas",
    units: [
      {
        id: "u2",
        channexId: null,
        name: "2-bedroom chalet",
        count: 4,
        adults: 4,
        children: 1,
        infants: 1,
        rates: [rate("r2", 7800), rate("r2n", 0, { name: "Non-refundable", parentId: "r2", adjustment: "decrease_percent", adjustValue: 10 })],
      },
      {
        id: "u3",
        channexId: null,
        name: "3-bedroom chalet",
        count: 2,
        adults: 6,
        children: 0,
        infants: 0,
        rates: [rate("r3", 10500, { guests: 9, closedToArrival: [5, 7] })],
      },
    ],
  };
}

test("property: guest-facing title, contact, address and the Channex type", () => {
  const body = propertyPayload(hacienda(), "group-1");
  assert.equal(body.title, "Hacienda Bay chalets with sea view");
  assert.equal(body.currency, "EGP");
  assert.equal(body.country, "EG");
  assert.equal(body.city, "North Coast");
  assert.equal(body.timezone, "Africa/Cairo");
  assert.equal(body.property_type, "chalet");
  assert.equal(body.min_stay_type, "arrival");
  assert.equal(body.group_id, "group-1");
  // Empty fields are left out, not sent as "".
  assert.equal("zip_code" in body && body.zip_code !== undefined, false);
  assert.equal(body.website, undefined);
});

test("property: falls back to the nickname without an English title, and never moves group on update", () => {
  const p = { ...hacienda(), titleEn: "  ", channexId: "chx-prop" };
  const body = propertyPayload(p, "group-1");
  assert.equal(body.title, "Hacienda Bay Chalets");
  assert.equal("group_id" in body, false);
});

test("property: coordinates are sent as text when set", () => {
  const body = propertyPayload({ ...hacienda(), latitude: 30.95, longitude: 28.83 }, null);
  assert.equal(body.latitude, "30.95");
  assert.equal(body.longitude, "28.83");
});

test("content: English description, policy link, and null for empty text", () => {
  const body = contentPayload(hacienda(), "pol-1");
  assert.equal(body.hotel_policy_id, "pol-1");
  assert.equal(body.content.description, "Sea-view chalets.");
  assert.equal(body.content.important_information, null);
});

test("unit type -> room type with its identical quantity and sleeping places", () => {
  const u = hacienda().units[0];
  assert.deepEqual(roomTypePayload(u, "chx-prop"), {
    property_id: "chx-prop",
    title: "2-bedroom chalet",
    count_of_rooms: 4,
    occ_adults: 4,
    occ_children: 1,
    occ_infants: 1,
    default_occupancy: 4,
    room_kind: "room",
  });
});

test("standard rate -> per-unit rate plan with price, min stay and closed weekdays", () => {
  const u = hacienda().units[1];
  const body = standardRatePayload(u.rates[0], u, { propertyId: "P", roomTypeId: "R" }, "EGP");
  assert.equal(body.sell_mode, "per_room");
  assert.equal(body.rate_mode, "manual");
  assert.equal(body.currency, "EGP");
  assert.equal(body.min_stay_arrival, 2);
  assert.equal(body.max_stay, 0);
  // Friday (5) and Sunday (7) closed to arrival, Monday first.
  assert.deepEqual(body.closed_to_arrival, [false, false, false, false, true, false, true]);
  // The price covers up to the unit's size, even if the rate says more.
  assert.deepEqual(body.options, [{ occupancy: 6, is_primary: true, rate: "10500.00" }]);
});

test("non-refundable rate follows the standard rate, 10% less", () => {
  const u = hacienda().units[0];
  const body = derivedRatePayload(u.rates[1], u, { propertyId: "P", roomTypeId: "R", parentId: "STD" }, "EGP");
  assert.equal(body.parent_rate_plan_id, "STD");
  assert.equal(body.rate_mode, "derived");
  assert.equal(body.inherit_rate, true);
  assert.equal(body.inherit_min_stay_arrival, true);
  assert.equal(body.inherit_closed_to_arrival, true);
  assert.deepEqual(body.options[0].derived_option, { rate: [["decrease_by_percent", "10.00"]] });
  assert.equal(body.options[0].is_primary, true);
});

test("a fixed-amount discount is sent as decrease_by_amount", () => {
  const u = hacienda().units[0];
  const r = { ...u.rates[1], adjustment: "decrease_amount", adjustValue: 250 };
  const body = derivedRatePayload(r, u, { propertyId: "P", roomTypeId: "R", parentId: "STD" }, "EGP");
  assert.deepEqual(body.options[0].derived_option, { rate: [["decrease_by_amount", "250.00"]] });
});

test("house policy: Omnirent choices map to Channex's names", () => {
  const body = policyPayload(hacienda(), "P");
  assert.equal(body.pets_policy, "by_arrangements");
  assert.equal(body.smoking_policy, "permitted_areas_only");
  assert.equal(body.pets_refundable_deposit, "500.00");
  assert.equal(body.pets_non_refundable_fee, null);
  assert.equal(body.checkin_from_time, "15:00");
  assert.equal(body.checkout_to_time, "12:00");
  assert.equal(body.internet_access_type, "wifi");
  assert.equal(body.internet_access_coverage, "all_rooms");
  assert.equal(body.internet_access_cost, null);
  // No set maximum: 4 x 4 + 2 x 6 guests.
  assert.equal(body.max_count_of_guests, 28);
});

test("house policy: no internet or parking clears their details; pets not allowed clear fees", () => {
  const p = { ...hacienda(), internetType: "none", parkingType: "none", petsPolicy: "not_allowed", petFee: 100, maxGuests: 10 };
  const body = policyPayload(p, "P");
  assert.equal(body.internet_access_type, "none");
  assert.equal(body.internet_access_coverage, null);
  assert.equal(body.parking_reservation, "not_available");
  assert.equal(body.parking_is_private, null);
  assert.equal(body.pets_policy, "not_allowed");
  assert.equal(body.pets_non_refundable_fee, null);
  assert.equal(body.max_count_of_guests, 10);
});

test("weekFlags: Monday first", () => {
  assert.deepEqual(weekFlags([1]), [true, false, false, false, false, false, false]);
  assert.deepEqual(weekFlags([]), [false, false, false, false, false, false, false]);
});

test("sellWindow: 500 days starting today", () => {
  assert.deepEqual(sellWindow(new Date("2026-10-22T21:00:00Z")), { date_from: "2026-10-22", date_to: "2028-03-04" });
});

test("a refused phone number names the field and quotes what was typed", () => {
  const p = { ...hacienda(), phone: "+20 100 555" };
  const body = { errors: { code: "validation_error", title: "Validation Error", details: { phone: ["is too short"] } } };
  assert.deepEqual(describeFailure("property", 422, body, p), { field: "phone", value: "+20 100 555", message: "is too short" });
});

test("nested field names are understood per part", () => {
  const body = { errors: { details: { "options.0.rate": ["must be greater than 0"] } } };
  assert.equal(describeFailure("rates", 422, body, hacienda()).field, "price");
  const unit = { errors: { details: { title: ["has already been taken"] } } };
  assert.equal(describeFailure("units", 422, unit, hacienda()).field, "unitName");
});

test("an unknown refusal keeps Channex's words for support", () => {
  const body = { errors: { details: { group_id: ["is invalid"] } } };
  assert.deepEqual(describeFailure("property", 422, body, hacienda()), { kind: "refused", message: "group_id: is invalid" });
  assert.deepEqual(describeFailure("property", 400, { errors: { details: "User already invited" } }, hacienda()), { kind: "refused", message: "User already invited" });
});

test("no answer, too many requests or a Channex error count as unreachable", () => {
  for (const status of [0, 429, 500, 503]) assert.deepEqual(describeFailure("property", status, null, hacienda()), { kind: "unreachable" });
});

test("readSyncError keeps only known values", () => {
  assert.deepEqual(readSyncError({ field: "phone", value: "1", message: "x", other: 1 }), { field: "phone", kind: undefined, value: "1", message: "x" });
  assert.deepEqual(readSyncError({ field: "<script>", kind: "nope" }), { field: undefined, kind: undefined, value: undefined, message: undefined });
  assert.equal(readSyncError(null), null);
  assert.equal(readSyncError([1]), null);
});

test("sync lines: done before the current part, waiting after it", () => {
  assert.deepEqual(stageStates("SYNCING", "rates"), { property: "done", units: "done", rates: "sending", policy: "waiting", content: "waiting" });
  assert.deepEqual(stageStates("SYNC_FAILED", "property"), { property: "failed", units: "waiting", rates: "waiting", policy: "waiting", content: "waiting" });
  assert.deepEqual(stageStates("SYNCED", null), { property: "done", units: "done", rates: "done", policy: "done", content: "done" });
  assert.deepEqual(stageStates("DRAFT", null), { property: "notSynced", units: "notSynced", rates: "notSynced", policy: "notSynced", content: "notSynced" });
});
