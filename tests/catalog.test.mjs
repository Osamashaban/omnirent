// Settings › Countries & cities and Settings › Property types: the rules behind
// the forms, the Channex catalogue, and the starting rows in the migration.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkCity, checkCountry, cityDeleteCheck, cleanCountry, hideNeedsConfirm } from "../lib/geo-rules.ts";
import {
  checkPropertyType,
  cleanPropertyType,
  rentModeFor,
  statusAfterSave,
} from "../lib/property-type-rules.ts";
import {
  CHANNELS,
  CHANNEX_TYPES,
  HOTEL_TYPES,
  VACATION_RENTAL_TYPES,
  billingFor,
  channelName,
  editedChannelNames,
  isChannexType,
  suggestedChannelName,
} from "../lib/channex-catalog.ts";
import { MODULES } from "../lib/modules.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(
  join(repoRoot, "prisma", "migrations", "20261021120000_countries_cities_property_types", "migration.sql"),
  "utf8",
);

const egypt = { id: "c1", nameAr: "مصر", nameEn: "Egypt", iso2: "EG" };
const good = { nameAr: "تونس", nameEn: "Tunisia", iso2: "tn", dialCode: "+216", currency: "USD", timezone: "Africa/Cairo", visible: false };

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

test("a complete new country passes", () => {
  assert.deepEqual(checkCountry(good, [egypt], null), {});
});

test("country names are required", () => {
  const e = checkCountry({ ...good, nameAr: "  ", nameEn: "" }, [], null);
  assert.equal(e.nameAr, "enterArabicName");
  assert.equal(e.nameEn, "enterEnglishName");
});

test("country names are unique ignoring case and spaces, in both languages", () => {
  assert.equal(checkCountry({ ...good, nameEn: "  egypt " }, [egypt], null).nameEn, "countryExists");
  assert.equal(checkCountry({ ...good, nameAr: "مصر" }, [egypt], null).nameAr, "countryExists");
});

test("editing a country doesn't clash with itself", () => {
  assert.deepEqual(checkCountry({ ...good, nameAr: "مصر", nameEn: "Egypt", iso2: "EG" }, [egypt], "c1"), {});
});

test("country code must be 2 letters and unique; it is stored upper case", () => {
  for (const iso2 of ["", "E", "EGY", "E1", "مص"]) assert.equal(checkCountry({ ...good, iso2 }, [], null).iso2, "enterIso");
  assert.equal(checkCountry({ ...good, iso2: "eg" }, [egypt], null).iso2, "isoTaken");
  assert.equal(cleanCountry({ ...good, iso2: " tn " }).iso2, "TN");
});

test("dialing code is + and 1 to 4 digits", () => {
  for (const dialCode of ["+", "20", "+12345", "+2a", "+ 20"]) {
    assert.equal(checkCountry({ ...good, dialCode }, [], null).dialCode, "enterDialCode", dialCode);
  }
  for (const dialCode of ["+1", "+20", "+966", "+1242"]) assert.equal(checkCountry({ ...good, dialCode }, [], null).dialCode, undefined);
});

test("currency and time zone must be one of the offered choices", () => {
  assert.equal(checkCountry({ ...good, currency: "XYZ" }, [], null).currency, "chooseCurrency");
  assert.equal(checkCountry({ ...good, timezone: "Mars/Base" }, [], null).timezone, "chooseTimezone");
});

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

const cairo = { id: "x1", nameAr: "القاهرة", nameEn: "Cairo" };

test("city names are required", () => {
  const { errors } = checkCity({ nameAr: "", nameEn: " ", visible: true }, [], null);
  assert.equal(errors.nameAr, "enterArabicName");
  assert.equal(errors.nameEn, "enterEnglishName");
});

test("a city can't be added twice in the same country, by either name", () => {
  const byEn = checkCity({ nameAr: "كايرو", nameEn: "cairo", visible: true }, [cairo], null);
  assert.equal(byEn.errors.nameEn, "cityExists");
  assert.equal(byEn.duplicate?.nameEn, "Cairo");
  assert.equal(checkCity({ nameAr: "القاهرة", nameEn: "Al Qahira", visible: true }, [cairo], null).errors.nameEn, "cityExists");
});

test("editing a city doesn't clash with itself", () => {
  assert.deepEqual(checkCity({ nameAr: "القاهرة", nameEn: "Cairo", visible: false }, [cairo], "x1").errors, {});
});

test("hiding something used by properties asks first; deleting a used city is blocked", () => {
  assert.equal(hideNeedsConfirm(true, 3), true);
  assert.equal(hideNeedsConfirm(true, 0), false);
  assert.equal(hideNeedsConfirm(false, 3), false); // showing never asks
  assert.equal(cityDeleteCheck(0), "confirm");
  assert.equal(cityDeleteCheck(2), "blocked");
});

// ---------------------------------------------------------------------------
// Channex catalogue
// ---------------------------------------------------------------------------

test("Channex has exactly 19 property types: 8 billed per unit, 11 per property", () => {
  assert.equal(CHANNEX_TYPES.length, 19);
  assert.equal(new Set(CHANNEX_TYPES).size, 19);
  assert.ok(VACATION_RENTAL_TYPES.every((c) => billingFor(c) === "unit"));
  assert.ok(HOTEL_TYPES.every((c) => billingFor(c) === "property"));
  assert.equal(isChannexType("duplex"), false);
});

test("52 channels with unique ids, 6 of them main", () => {
  assert.equal(CHANNELS.length, 52);
  assert.equal(new Set(CHANNELS.map((c) => c.id)).size, 52);
  assert.deepEqual(
    CHANNELS.filter((c) => c.main).map((c) => c.id),
    ["booking", "airbnb", "agoda", "expedia", "hostelworld", "google"],
  );
});

test("every Channex type has a suggestion for every channel", () => {
  for (const chx of CHANNEX_TYPES) {
    for (const ch of CHANNELS) assert.ok(suggestedChannelName(chx, ch.id), `${chx} on ${ch.id}`);
  }
  assert.equal(suggestedChannelName("apartment", "booking"), "Apartment (3)");
  assert.equal(suggestedChannelName("hotel", "google"), "Hotel");
  assert.equal(suggestedChannelName("villa", "google"), "Vacation rental");
  assert.equal(suggestedChannelName("villa", "o0"), "villa"); // other channels: same as Channex
  assert.equal(suggestedChannelName("", "booking"), "");
});

test("only edited channel names are stored, trimmed and capped", () => {
  const stored = editedChannelNames("apartment", {
    booking: "Apartment (3)", // same as suggested: dropped
    airbnb: "  loft ",
    agoda: "",
    o0: "x".repeat(200),
  });
  assert.deepEqual(Object.keys(stored).sort(), ["airbnb", "o0"]);
  assert.equal(stored.airbnb, "loft");
  assert.equal(stored.o0.length, 80);
  assert.equal(channelName("apartment", stored, "airbnb"), "loft");
  assert.equal(channelName("apartment", stored, "booking"), "Apartment (3)");
});

// ---------------------------------------------------------------------------
// Property types
// ---------------------------------------------------------------------------

const studio = { id: "p1", nameAr: "ستوديو", nameEn: "Studio" };
const input = { nameAr: "دوبلكس", nameEn: "Duplex", group: "APARTMENTS", channexType: "apartment", rentMode: "WHOLE", visible: true, channelNames: {} };

test("a complete property type passes", () => {
  assert.deepEqual(checkPropertyType(input, [studio], null).errors, {});
});

test("names and a Channex type are required", () => {
  const { errors } = checkPropertyType({ ...input, nameAr: "", nameEn: " ", channexType: "" }, [], null);
  assert.deepEqual(errors, { nameAr: "enterArabicName", nameEn: "enterEnglishName", channexType: "chooseChannexType" });
  assert.equal(checkPropertyType({ ...input, channexType: "duplex" }, [], null).errors.channexType, "chooseChannexType");
});

test("type names are unique ignoring case, and the clash is named", () => {
  const r = checkPropertyType({ ...input, nameAr: "ستوديو", nameEn: "STUDIO" }, [studio], null);
  assert.equal(r.errors.nameAr, "typeExists");
  assert.equal(r.errors.nameEn, "typeExists");
  assert.equal(r.duplicateEn?.nameEn, "Studio");
  assert.deepEqual(checkPropertyType({ ...input, nameAr: "ستوديو", nameEn: "Studio" }, [studio], "p1").errors, {});
});

test("a hotel-type Channex value can't be rented as a whole unit", () => {
  assert.equal(rentModeFor("hostel", "WHOLE"), "ROOMS");
  assert.equal(rentModeFor("hostel", "BOTH"), "BOTH");
  assert.equal(rentModeFor("apartment", "WHOLE"), "WHOLE");
  assert.equal(cleanPropertyType({ ...input, channexType: "hotel" }).rentMode, "ROOMS");
});

test("unknown group or mode falls back to safe defaults", () => {
  const clean = cleanPropertyType({ ...input, group: "VILLAS", rentMode: "SOMETIMES" });
  assert.equal(clean.group, "APARTMENTS");
  assert.equal(clean.rentMode, "WHOLE");
});

test("saving keeps an archived type archived; otherwise the switch decides", () => {
  assert.equal(statusAfterSave("ARCHIVED", true), "ARCHIVED");
  assert.equal(statusAfterSave("HIDDEN", true), "ACTIVE");
  assert.equal(statusAfterSave(null, false), "HIDDEN");
});

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

test("the migration adds both modules, and the code knows them", () => {
  for (const key of ["property_types", "countries_cities"]) {
    assert.ok(MODULES.some((m) => m.key === key), key);
    assert.match(migration, new RegExp(`'${key}'`));
  }
});

test("starting rows match the design: 34 types (16 active), 4 countries (Egypt visible), 20 cities", () => {
  const typeRows = migration.match(/^\s+\('ptype_[^\n]+$/gm) ?? [];
  assert.equal(typeRows.length, 34);
  assert.equal(typeRows.filter((r) => r.includes("'ACTIVE'")).length, 16);
  for (const row of typeRows) {
    const chx = row.match(/'(?:APARTMENTS|HOTELS)', '([a-z_]+)'/)[1];
    assert.ok(isChannexType(chx), row);
    const json = row.match(/'(\{[^']*\})'/)[1];
    for (const [id, name] of Object.entries(JSON.parse(json))) {
      assert.ok(CHANNELS.some((c) => c.id === id), id);
      assert.notEqual(name, suggestedChannelName(chx, id), "stored names must differ from the suggestion");
    }
  }
  const countryRows = migration.match(/^\s+\('country_[^\n]+$/gm) ?? [];
  assert.equal(countryRows.length, 4);
  assert.equal(countryRows.filter((r) => r.includes(", true, CURRENT_TIMESTAMP")).length, 1);
  assert.equal((migration.match(/^\s+\('city_[^\n]+$/gm) ?? []).length, 20);
});

test("the migration only adds: no drops, deletes or changes to existing tables", () => {
  assert.doesNotMatch(migration, /\b(DROP|TRUNCATE)\b|DELETE FROM/i);
  assert.doesNotMatch(migration, /ALTER TABLE "(User|Role|Module|RoleModule|Session|PasswordResetToken)"/);
});
