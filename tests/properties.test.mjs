// Broker app › Properties: the rules behind the 8-step "Add property" wizard,
// the stored values, and the figures shown in the list and property page.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  blankForm,
  blankTax,
  blankUnit,
  blankRate,
  checkStep,
  checkTax,
  cleanForm,
  copyNickname,
  currenciesFor,
  derivedPrice,
  firstIncompleteStep,
  formFromStored,
  formatMoney,
  fromPrice,
  listStatus,
  matchesSearch,
  parseNumber,
  unitTotal,
} from "../lib/property-rules.ts";

const NAMES = { unit: "Unit", whole: "Whole apartment", standardRate: "Standard rate", nonRefundable: "Non-refundable" };
const CTX = {
  typeIds: ["type-chalet", "type-villa"],
  countries: [{ id: "eg", currency: "EGP", cityIds: ["north-coast", "cairo"] }],
};

// A form that passes every step: the design's Hacienda Bay sample.
function fullForm() {
  const f = blankForm(NAMES, { id: "eg", currency: "EGP" });
  Object.assign(f, {
    typeId: "type-chalet",
    nickname: "Hacienda Bay Chalets",
    titleEn: "Hacienda Bay chalets with sea view",
    titleAr: "شاليهات هاسيندا باي بإطلالة بحرية",
    email: "hacienda.bay@getomnirent.com",
    phone: "+20 100 555 2841",
    cityId: "north-coast",
    compound: "Hacienda Bay",
    address: "Hacienda Bay, km 177 Alexandria–Matrouh Rd",
    postalCode: "51511",
    latitude: "30.9012",
    longitude: "28.6431",
    maxGuests: "34",
    descriptionEn: "Six sea-view chalets in Hacienda Bay.",
  });
  const unit = (name, count, adults, price) => {
    const u = blankUnit(name, blankRate("Standard rate", "Non-refundable"));
    Object.assign(u, { count, adults, children: "1", infants: "1", bedrooms: "2", beds: "3", bathrooms: "2" });
    Object.assign(u.rate, { price, guests: adults, minStay: "2", derived: true });
    return u;
  };
  f.units = [unit("2-bedroom chalet", "4", "4", "7800"), unit("3-bedroom chalet", "2", "6", "10,500")];
  return f;
}

test("the design's sample passes every step and the review", () => {
  const f = fullForm();
  for (let step = 1; step <= 8; step++) assert.deepEqual(checkStep(step, f, CTX), {}, `step ${step}`);
  assert.equal(firstIncompleteStep(f, CTX), null);
});

test("step 1 asks for type, nickname, English title, a real email and phone", () => {
  const f = blankForm(NAMES, { id: "eg", currency: "EGP" });
  assert.deepEqual(checkStep(1, f, CTX), {
    typeId: "required",
    nickname: "required",
    titleEn: "titleEn",
    email: "email",
    phone: "phone",
  });
  Object.assign(f, { typeId: "type-villa", nickname: "Villa", titleEn: "Villa", email: "a@b.co", phone: "+20 100 55" });
  assert.deepEqual(checkStep(1, f, CTX), { phone: "phone" }, "7 digits is too short");
  f.phone = "+20 100 555 2841";
  assert.deepEqual(checkStep(1, f, CTX), {});
  f.phone = "+20 abc 555 2841";
  assert.equal(checkStep(1, f, CTX).phone, "phone", "letters are not a phone number");
});

test("step 1 refuses a type the broker can't pick, and long names", () => {
  const f = fullForm();
  f.typeId = "a-hotel-type";
  assert.equal(checkStep(1, f, CTX).typeId, "required");
  f.typeId = "type-chalet";
  f.nickname = "x".repeat(81);
  f.titleEn = "y".repeat(256);
  assert.deepEqual(checkStep(1, f, CTX), { nickname: "tooLong", titleEn: "tooLong" });
});

test("currency is EGP or USD, or the country's own currency", () => {
  assert.deepEqual(currenciesFor("EGP"), ["EGP", "USD"]);
  assert.deepEqual(currenciesFor("SAR"), ["EGP", "USD", "SAR"]);
  const f = fullForm();
  f.currency = "EUR";
  assert.equal(checkStep(1, f, CTX).currency, "pickOption");
  f.currency = "USD";
  assert.equal(checkStep(1, f, CTX).currency, undefined);
});

test("step 2 needs a country, one of its cities and an address", () => {
  const f = fullForm();
  f.cityId = "alexandria";
  assert.deepEqual(checkStep(2, f, CTX), { cityId: "required" }, "a city that isn't in the country's list");
  f.countryId = "";
  f.cityId = "";
  f.address = "  ";
  assert.deepEqual(checkStep(2, f, CTX), { countryId: "required", cityId: "required", address: "required" });
});

test("step 2 checks coordinates are on the map and come as a pair", () => {
  const f = fullForm();
  f.latitude = "91";
  f.longitude = "abc";
  assert.deepEqual(checkStep(2, f, CTX), { latitude: "latitude", longitude: "longitude" });
  f.latitude = "30.1";
  f.longitude = "";
  assert.deepEqual(checkStep(2, f, CTX), { longitude: "required" });
  f.latitude = "";
  assert.deepEqual(checkStep(2, f, CTX), {}, "both empty is fine until the map is added");
});

test("step 3 checks each unit type, and names must differ", () => {
  const f = fullForm();
  f.units[1].name = " 2-BEDROOM chalet ";
  f.units[0].count = "0";
  f.units[0].adults = "";
  f.units[1].beds = "1.5";
  assert.deepEqual(checkStep(3, f, CTX), {
    "units.0.count": "min1",
    "units.0.adults": "required",
    "units.1.name": "nameTaken",
    "units.1.beds": "wholeNumber",
  });
});

test("step 3 in rooms mode checks the bathroom, not the count", () => {
  const f = fullForm();
  f.rentMode = "ROOMS";
  f.units[0].count = "0";
  f.units[0].bathroom = "outside";
  assert.deepEqual(checkStep(3, f, CTX), { "units.0.bathroom": "pickOption" });
});

test("step 3 in both mode also checks the whole apartment", () => {
  const f = fullForm();
  f.rentMode = "BOTH";
  f.whole.adults = "0";
  assert.deepEqual(checkStep(3, f, CTX), { "whole.adults": "min1" });
});

test("step 4: a price above zero, guests within the unit's adults, stays that make sense", () => {
  const f = fullForm();
  Object.assign(f.units[0].rate, { price: "0", guests: "5", minStay: "3", maxStay: "2" });
  assert.deepEqual(checkStep(4, f, CTX), {
    "units.0.rate.price": "price",
    "units.0.rate.guests": "guestsOverCapacity",
    "units.0.rate.maxStay": "maxStay",
  });
  Object.assign(f.units[0].rate, { price: "7800", guests: "4", maxStay: "0" });
  assert.deepEqual(checkStep(4, f, CTX), {}, "0 means no maximum stay");
});

test("step 4: the non-refundable discount is 1 to 99 percent, or an amount below the price", () => {
  const f = fullForm();
  f.units[0].rate.adjustValue = "100";
  assert.equal(checkStep(4, f, CTX)["units.0.rate.adjustValue"], "percent");
  f.units[0].rate.adjustValue = "0";
  assert.equal(checkStep(4, f, CTX)["units.0.rate.adjustValue"], "percent");
  f.units[0].rate.adjustment = "decrease_amount";
  f.units[0].rate.adjustValue = "7800";
  assert.equal(checkStep(4, f, CTX)["units.0.rate.adjustValue"], "amountUnderPrice");
  f.units[0].rate.adjustValue = "500";
  assert.deepEqual(checkStep(4, f, CTX), {});
  f.units[0].rate.derived = false;
  f.units[0].rate.adjustValue = "nonsense";
  assert.deepEqual(checkStep(4, f, CTX), {}, "an unused discount isn't checked");
});

test("step 4 in both mode prices the whole apartment too", () => {
  const f = fullForm();
  f.rentMode = "BOTH";
  f.whole.adults = "5";
  assert.equal(checkStep(4, f, CTX)["whole.rate.price"], "price");
});

test("step 5: times, max guests and every option come from the lists", () => {
  const f = fullForm();
  Object.assign(f, { checkInTime: "25:00", checkOutTime: "", maxGuests: "0", petsPolicy: "maybe", petFee: "-5" });
  assert.deepEqual(checkStep(5, f, CTX), {
    checkInTime: "time",
    checkOutTime: "required",
    maxGuests: "min1",
    petsPolicy: "pickOption",
    petFee: "amount",
  });
});

test("step 6: a tax needs a name and an amount, percent at most 100, dates in order", () => {
  assert.deepEqual(checkTax(blankTax("")), { name: "required", amount: "required" });
  const t = { ...blankTax("VAT"), kind: "tax", logic: "percent", amount: "140" };
  assert.deepEqual(checkTax(t), { amount: "percent100" });
  Object.assign(t, { amount: "14", startsOn: "2026-12-31", endsOn: "2026-01-01" });
  assert.deepEqual(checkTax(t), { endsOn: "dates" });
  const f = fullForm();
  f.taxes = [{ ...blankTax("Cleaning fee"), amount: "abc" }];
  assert.deepEqual(checkStep(6, f, CTX), { "taxes.0.amount": "price" });
  f.taxes = [];
  assert.deepEqual(checkStep(6, f, CTX), {}, "taxes can be skipped");
});

test("step 7: English description is required, the website must be https", () => {
  const f = fullForm();
  f.descriptionEn = "";
  f.website = "http://hacienda-bay.com";
  assert.deepEqual(checkStep(7, f, CTX), { descriptionEn: "required", website: "website" });
  f.descriptionEn = "Sea view.";
  f.website = "https://hacienda-bay.getomnirent.com";
  assert.deepEqual(checkStep(7, f, CTX), {});
  f.facilities = ["wifi", "helipad"];
  assert.equal(checkStep(7, f, CTX).facilities, "pickOption");
});

test("review points at the first step that still has a gap", () => {
  const f = fullForm();
  f.units[1].rate.price = "";
  assert.equal(firstIncompleteStep(f, CTX), 4);
  f.email = "nope";
  assert.equal(firstIncompleteStep(f, CTX), 1);
  assert.ok(Object.keys(checkStep(8, f, CTX)).includes("email"));
});

test("numbers accept thousands commas and Arabic digits, and nothing else", () => {
  assert.equal(parseNumber("7,800"), 7800);
  assert.equal(parseNumber("٧٨٠٠"), 7800);
  assert.equal(parseNumber(" 12.5 "), 12.5);
  assert.equal(parseNumber("12abc"), null);
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("1e5"), null);
});

test("cleaning stores numbers, drops unknown options and keeps drafts safe", () => {
  const f = fullForm();
  f.units[0].rate.price = "7,800.456";
  f.petsPolicy = "dragons";
  f.facilities = ["wifi", "wifi", "helipad"];
  f.latitude = "500";
  f.maxGuests = "";
  f.units[0].rate.closedToArrival = [7, 1, 1, 9];
  const { property, units, taxes } = cleanForm(f);
  assert.equal(units[0].rate.price, 7800.46);
  assert.equal(units[1].rate.price, 10500);
  assert.equal(property.petsPolicy, "not_allowed");
  assert.deepEqual(property.facilities, ["wifi"]);
  assert.equal(property.latitude, null);
  assert.equal(property.maxGuests, null);
  assert.deepEqual(units[0].rate.closedToArrival, [1, 7]);
  assert.deepEqual(taxes, []);
  assert.equal(units[0].kind, "UNIT");
  assert.equal(units[0].count, 4);
  assert.deepEqual(units[0].rate.derived, { id: "", name: "Non-refundable", adjustment: "decrease_percent", adjustValue: 10 });
});

test("cleaning in rooms mode makes rooms of one, and both mode adds the whole apartment first", () => {
  const f = fullForm();
  f.rentMode = "ROOMS";
  let { units } = cleanForm(f);
  assert.deepEqual(units.map((u) => [u.kind, u.count, u.bedrooms, u.bathroom]), [
    ["ROOM", 1, null, "private"],
    ["ROOM", 1, null, "private"],
  ]);
  f.rentMode = "BOTH";
  ({ units } = cleanForm(f));
  assert.deepEqual(units.map((u) => [u.kind, u.name, u.sortOrder]), [
    ["WHOLE", "Whole apartment", 0],
    ["ROOM", "2-bedroom chalet", 1],
    ["ROOM", "3-bedroom chalet", 2],
  ]);
});

test("a saved property reads back into the same form", () => {
  const f = fullForm();
  f.rentMode = "BOTH";
  f.taxes = [{ ...blankTax("VAT"), kind: "tax", logic: "percent", amount: "14", startsOn: "2026-11-01" }];
  const clean = cleanForm(f);
  // What the database hands back: rates as rows, derived ones pointing at their parent.
  const stored = {
    ...clean.property,
    rentMode: "BOTH",
    unitTypes: clean.units.map((u, i) => {
      const { rate, ...unit } = u;
      const std = { ...rate, id: `r${i}`, parentId: null, adjustment: null, adjustValue: null };
      const rates = [std];
      if (rate.derived) rates.push({ ...std, id: `d${i}`, name: rate.derived.name, parentId: `r${i}`, adjustment: rate.derived.adjustment, adjustValue: rate.derived.adjustValue });
      return { ...unit, id: `u${i}`, rates };
    }),
    taxes: clean.taxes.map((t, i) => ({
      ...t,
      id: `t${i}`,
      startsOn: t.startsOn ? new Date(`${t.startsOn}T00:00:00Z`) : null,
      endsOn: null,
    })),
  };
  const back = formFromStored(stored, NAMES);
  assert.equal(back.whole.name, "Whole apartment");
  assert.equal(back.whole.id, "u0");
  assert.deepEqual(back.units.map((u) => u.name), ["2-bedroom chalet", "3-bedroom chalet"]);
  assert.equal(back.units[1].rate.price, "10500");
  assert.equal(back.units[1].rate.id, "r2");
  assert.equal(back.units[1].rate.derivedId, "d2");
  assert.equal(back.taxes[0].startsOn, "2026-11-01");
  assert.deepEqual(checkStep(8, { ...back, rentMode: "BOTH", whole: { ...back.whole, rate: { ...back.whole.rate, price: "20000", guests: "2" } } }, CTX), {});
});

test("unit totals: identical units add up, rooms count one each, both mode adds the whole", () => {
  assert.equal(unitTotal([{ kind: "UNIT", count: 4 }, { kind: "UNIT", count: 2 }]), 6);
  assert.equal(unitTotal([{ kind: "ROOM", count: 1 }, { kind: "ROOM", count: 1 }, { kind: "ROOM", count: 1 }]), 3);
  assert.equal(unitTotal([{ kind: "WHOLE", count: 1 }, { kind: "ROOM", count: 1 }, { kind: "ROOM", count: 1 }]), 3);
  assert.equal(unitTotal([]), 0);
});

test("the 'from' price is the lowest standard price, ignoring derived and unpriced rates", () => {
  assert.equal(fromPrice([{ parentId: null, price: 10500 }, { parentId: null, price: "7800" }, { parentId: "x", price: 7020 }]), 7800);
  assert.equal(fromPrice([{ parentId: null, price: 0 }]), null);
});

test("derived prices follow the standard price", () => {
  assert.equal(derivedPrice(7800, "decrease_percent", 10), 7020);
  assert.equal(derivedPrice(10500, "decrease_percent", 10), 9450);
  assert.equal(derivedPrice(7800, "decrease_amount", 800), 7000);
  assert.equal(derivedPrice(500, "decrease_amount", 800), 0);
});

test("money reads as in the design in both languages", () => {
  assert.equal(formatMoney(7800, "EGP", "en"), "EGP 7,800");
  assert.equal(formatMoney(7800, "EGP", "ar"), "7,800 ج.م");
  assert.equal(formatMoney(120.5, "USD", "ar"), "120.5 $");
});

test("list status: archived wins, then the sync state", () => {
  assert.equal(listStatus({ status: "SYNCED", archivedAt: new Date() }), "archived");
  assert.equal(listStatus({ status: "SYNC_FAILED", archivedAt: null }), "failed");
  assert.equal(listStatus({ status: "DRAFT", archivedAt: null }), "draft");
});

test("search matches nickname, titles and compound, ignoring case", () => {
  const p = { nickname: "Marassi C-14", titleEn: "Sea-view chalet", titleAr: "شاليه بإطلالة", compound: "Marassi" };
  assert.ok(matchesSearch(p, "marassi"));
  assert.ok(matchesSearch(p, "SEA-VIEW"));
  assert.ok(matchesSearch(p, "شاليه"));
  assert.ok(!matchesSearch(p, "Sidi Heneish"));
  assert.ok(matchesSearch(p, "  "));
});

test("a copy gets the next free number", () => {
  assert.equal(copyNickname("Hacienda Bay Chalets", ["Hacienda Bay Chalets"]), "Hacienda Bay Chalets 2");
  assert.equal(copyNickname("Hacienda Bay Chalets 2", ["Hacienda Bay Chalets", "hacienda bay chalets 2"]), "Hacienda Bay Chalets 3");
});

test("a form sent to the server keeps only fields of the right kind", async () => {
  const { readForm } = await import("../lib/property-rules.ts");
  assert.equal(readForm(null, NAMES), null);
  assert.equal(readForm({ units: "x", taxes: [], facilities: [] }, NAMES), null);
  const f = fullForm();
  assert.deepEqual(readForm(JSON.parse(JSON.stringify(f)), NAMES), f, "a real form comes through unchanged");
  const evil = { ...JSON.parse(JSON.stringify(f)), nickname: { $ne: 1 }, typeId: "x'; drop table", rentMode: "CASTLE", adultsOnly: "yes" };
  evil.units[0].rate.closedToArrival = [1, "2", 3.5];
  const read = readForm(evil, NAMES);
  assert.equal(read.nickname, "");
  assert.equal(read.typeId, "");
  assert.equal(read.rentMode, "WHOLE");
  assert.equal(read.adultsOnly, false);
  assert.deepEqual(read.units[0].rate.closedToArrival, [1]);
});
