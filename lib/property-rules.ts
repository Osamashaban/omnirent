// ---------------------------------------------------------------------------
// The rules for the broker app's "Add property" wizard and the properties
// list, kept apart from the database and the screens so tests can check them
// directly.
//
// The wizard edits one PropertyForm. Every input is held as typed text, so a
// half-filled form can be saved as a draft; `checkStep` says what still needs
// fixing before the broker can move on, and `cleanForm` turns the text into
// the values that are stored. Step numbers run 1 to 8, as on screen.
//
// Field names follow Channex, where the property will be published: a unit
// type is a Channex room type ("Identical quantity" is count_of_rooms), a
// rate is a rate plan, and a derived rate follows its standard rate.
// ---------------------------------------------------------------------------

export const STEP_COUNT = 8;
export const MAX_UNITS = 50;
export const MAX_TAXES = 20;

// The option lists. The first value is the default.
export const CANCELLATION_POLICIES = ["flexible", "moderate", "strict", "non_refundable"] as const;
export const INTERNET_TYPES = ["wifi", "wired", "none"] as const;
export const INTERNET_COVERAGE = ["all_rooms", "some_rooms", "public_areas"] as const;
export const PARKING_TYPES = ["on_site", "nearby", "none"] as const;
export const PARKING_RESERVATION = ["not_needed", "needed"] as const;
export const PETS_POLICIES = ["not_allowed", "allowed", "by_arrangement"] as const;
export const SMOKING_POLICIES = ["no_smoking", "designated_areas", "allowed"] as const;
export const MEALS = ["none", "breakfast"] as const;
export const ADJUSTMENTS = ["decrease_percent", "decrease_amount"] as const;
export const TAX_KINDS = ["tax", "fee", "city_tax"] as const;
export const TAX_LOGIC = ["per_booking", "percent", "per_night", "per_guest", "per_guest_per_night"] as const;
// The facilities the design offers. "+ More" is not designed yet.
export const FACILITIES = ["wifi", "pool", "beach", "ac", "parking", "kitchen", "security", "elevator"] as const;
// Rates can be in Egyptian pounds or US dollars, plus the country's own currency.
export const BASE_CURRENCIES = ["EGP", "USD"] as const;
export const RENT_MODES = ["WHOLE", "ROOMS", "BOTH"] as const;

export type RentModeValue = (typeof RENT_MODES)[number];
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export type RateForm = {
  id: string; // empty until saved
  name: string;
  price: string;
  guests: string;
  childFee: string;
  infantFee: string;
  meals: string;
  minStay: string;
  maxStay: string;
  cancellationPolicy: string; // empty = same as the property
  closedToArrival: number[]; // 1 = Monday ... 7 = Sunday
  // The optional non-refundable rate that follows this one.
  derived: boolean;
  derivedId: string;
  derivedName: string;
  adjustment: string;
  adjustValue: string;
};

export type UnitForm = {
  id: string;
  name: string;
  count: string; // whole-unit mode only; rooms are always 1
  adults: string;
  children: string;
  infants: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  bathroom: "private" | "shared"; // rooms only
  rate: RateForm;
};

export type TaxForm = {
  id: string;
  name: string;
  kind: string;
  logic: string;
  amount: string;
  inclusive: boolean;
  startsOn: string; // yyyy-mm-dd or empty
  endsOn: string;
  skipNights: string;
  maxNights: string;
};

export type PropertyForm = {
  // 1. Basics
  typeId: string;
  nickname: string;
  titleEn: string;
  titleAr: string;
  email: string;
  phone: string;
  currency: string;
  // 2. Location
  countryId: string;
  cityId: string;
  compound: string;
  address: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  // 3. Units. In "Both" mode `whole` is the whole apartment and `units` are
  // its rooms; otherwise `whole` is not used.
  rentMode: RentModeValue;
  units: UnitForm[];
  whole: UnitForm;
  // 5. House policies
  cancellationPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  maxGuests: string;
  adultsOnly: boolean;
  internetType: string;
  internetCoverage: string;
  internetCost: string; // empty = free
  parkingType: string;
  parkingReservation: string;
  parkingPrivate: boolean;
  petsPolicy: string;
  petFee: string;
  petDeposit: string;
  smokingPolicy: string;
  // 6. Taxes & fees
  taxes: TaxForm[];
  // 7. Listing content
  descriptionEn: string;
  descriptionAr: string;
  importantInfo: string;
  website: string;
  facilities: string[];
};

export function blankRate(standardName: string, derivedName: string): RateForm {
  return {
    id: "",
    name: standardName,
    price: "",
    guests: "",
    childFee: "0",
    infantFee: "0",
    meals: "none",
    minStay: "1",
    maxStay: "0",
    cancellationPolicy: "",
    closedToArrival: [],
    derived: false,
    derivedId: "",
    derivedName,
    adjustment: "decrease_percent",
    adjustValue: "10",
  };
}

export function blankUnit(name: string, rate: RateForm): UnitForm {
  return {
    id: "",
    name,
    count: "1",
    adults: "2",
    children: "0",
    infants: "0",
    bedrooms: "1",
    beds: "1",
    bathrooms: "1",
    bathroom: "private",
    rate,
  };
}

export function blankTax(name: string): TaxForm {
  return {
    id: "",
    name,
    kind: "fee",
    logic: "per_booking",
    amount: "",
    inclusive: false,
    startsOn: "",
    endsOn: "",
    skipNights: "",
    maxNights: "",
  };
}

// Default names come from the viewer's language ("Unit 1", "Standard rate").
export type DefaultNames = { unit: string; whole: string; standardRate: string; nonRefundable: string };

export function blankForm(names: DefaultNames, country: { id: string; currency: string } | null): PropertyForm {
  const rate = () => blankRate(names.standardRate, names.nonRefundable);
  return {
    typeId: "",
    nickname: "",
    titleEn: "",
    titleAr: "",
    email: "",
    phone: "",
    currency: country?.currency === "USD" ? "USD" : "EGP",
    countryId: country?.id ?? "",
    cityId: "",
    compound: "",
    address: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    rentMode: "WHOLE",
    units: [blankUnit(`${names.unit} 1`, rate())],
    whole: blankUnit(names.whole, rate()),
    cancellationPolicy: "flexible",
    checkInTime: "15:00",
    checkOutTime: "12:00",
    maxGuests: "",
    adultsOnly: false,
    internetType: "wifi",
    internetCoverage: "all_rooms",
    internetCost: "",
    parkingType: "on_site",
    parkingReservation: "not_needed",
    parkingPrivate: true,
    petsPolicy: "not_allowed",
    petFee: "0",
    petDeposit: "0",
    smokingPolicy: "no_smoking",
    taxes: [],
    descriptionEn: "",
    descriptionAr: "",
    importantInfo: "",
    website: "",
    facilities: ["wifi"],
  };
}

// ---------------------------------------------------------------------------
// Checking a step
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "required"
  | "titleEn"
  | "email"
  | "phone"
  | "tooLong"
  | "pickOption"
  | "min0"
  | "min1"
  | "wholeNumber"
  | "nameTaken"
  | "price"
  | "guestsOverCapacity"
  | "maxStay"
  | "percent"
  | "amountUnderPrice"
  | "time"
  | "latitude"
  | "longitude"
  | "amount"
  | "percent100"
  | "dates"
  | "website"
  | "tooManyUnits";

// Keyed by field path: "nickname", "units.0.name", "units.1.rate.price",
// "whole.adults", "taxes.0.amount".
export type FormErrors = Record<string, ErrorCode>;

// What the check needs to know beyond the form itself.
export type StepContext = {
  // Property types the broker may pick (active, apartment group).
  typeIds: readonly string[];
  // Visible countries with their visible cities.
  countries: readonly { id: string; currency: string; cityIds: readonly string[] }[];
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONEY_MAX = 9_999_999_999;

// A number typed by the broker: digits, an optional decimal point and
// thousands commas ("7,800"). Arabic-Indic digits count too. Anything else is
// not a number.
export function parseNumber(text: string): number | null {
  const western = text
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[٫]/g, ".")
    .replace(/[,٬]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(western)) return null;
  const n = Number(western);
  return Number.isFinite(n) ? n : null;
}

const isWhole = (n: number | null): n is number => n !== null && Number.isInteger(n);

function checkWholeNumber(e: FormErrors, key: string, text: string, min: 0 | 1) {
  const n = parseNumber(text);
  if (text.trim() === "") e[key] = "required";
  else if (!isWhole(n)) e[key] = "wholeNumber";
  else if (n < min) e[key] = min === 1 ? "min1" : "min0";
  else if (n > 1000) e[key] = "wholeNumber";
}

function checkMoney(e: FormErrors, key: string, text: string, { required }: { required: boolean }) {
  if (text.trim() === "") {
    if (required) e[key] = "required";
    return;
  }
  const n = parseNumber(text);
  if (n === null || n < 0 || n > MONEY_MAX) e[key] = "amount";
}

const oneOf = (list: readonly string[], value: string) => list.includes(value);

export const currenciesFor = (countryCurrency: string | undefined): string[] =>
  countryCurrency && !(BASE_CURRENCIES as readonly string[]).includes(countryCurrency)
    ? [...BASE_CURRENCIES, countryCurrency]
    : [...BASE_CURRENCIES];

// A unit's capacity for pricing: the adults it sleeps.
export function capacityOf(unit: UnitForm): number {
  const n = parseNumber(unit.adults);
  return isWhole(n) && n > 0 ? n : 0;
}

// The units that get a price, in screen order: the whole apartment first in
// "Both" mode, then each unit type or room.
export function pricedUnits(form: PropertyForm): { key: string; unit: UnitForm }[] {
  const list = form.units.map((unit, i) => ({ key: `units.${i}`, unit }));
  return form.rentMode === "BOTH" ? [{ key: "whole", unit: form.whole }, ...list] : list;
}

export function checkStep(step: number, form: PropertyForm, ctx: StepContext): FormErrors {
  const e: FormErrors = {};
  if (step === 1) {
    if (!ctx.typeIds.includes(form.typeId)) e.typeId = "required";
    if (!form.nickname.trim()) e.nickname = "required";
    else if (form.nickname.trim().length > 80) e.nickname = "tooLong";
    if (!form.titleEn.trim()) e.titleEn = "titleEn";
    else if (form.titleEn.trim().length > 255) e.titleEn = "tooLong";
    if (form.titleAr.trim().length > 255) e.titleAr = "tooLong";
    if (!EMAIL.test(form.email.trim()) || form.email.trim().length > 254) e.email = "email";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15 || !/^\+?[\d\s()-]+$/.test(form.phone.trim())) e.phone = "phone";
    const country = ctx.countries.find((c) => c.id === form.countryId);
    if (!currenciesFor(country?.currency).includes(form.currency)) e.currency = "pickOption";
  }
  if (step === 2) {
    const country = ctx.countries.find((c) => c.id === form.countryId);
    if (!country) e.countryId = "required";
    if (!country || !country.cityIds.includes(form.cityId)) e.cityId = "required";
    if (form.compound.trim().length > 120) e.compound = "tooLong";
    if (!form.address.trim()) e.address = "required";
    else if (form.address.trim().length > 255) e.address = "tooLong";
    if (form.postalCode.trim().length > 20) e.postalCode = "tooLong";
    const hasLat = form.latitude.trim() !== "";
    const hasLng = form.longitude.trim() !== "";
    const lat = parseNumber(form.latitude);
    const lng = parseNumber(form.longitude);
    if (hasLat && (lat === null || lat < -90 || lat > 90)) e.latitude = "latitude";
    if (hasLng && (lng === null || lng < -180 || lng > 180)) e.longitude = "longitude";
    // Coordinates go together: one without the other is no location.
    if (hasLat && !hasLng && !e.latitude) e.longitude = "required";
    if (hasLng && !hasLat && !e.longitude) e.latitude = "required";
  }
  if (step === 3) {
    if (!oneOf(RENT_MODES, form.rentMode)) e.rentMode = "pickOption";
    if (form.units.length === 0) e.units = "required";
    if (form.units.length > MAX_UNITS) e.units = "tooManyUnits";
    const rooms = form.rentMode !== "WHOLE";
    const seen = new Set<string>();
    form.units.forEach((u, i) => {
      const k = `units.${i}`;
      const name = u.name.trim().toLowerCase();
      if (!name) e[`${k}.name`] = "required";
      else if (name.length > 80) e[`${k}.name`] = "tooLong";
      else if (seen.has(name)) e[`${k}.name`] = "nameTaken";
      seen.add(name);
      if (!rooms) checkWholeNumber(e, `${k}.count`, u.count, 1);
      checkWholeNumber(e, `${k}.adults`, u.adults, 1);
      checkWholeNumber(e, `${k}.children`, u.children, 0);
      checkWholeNumber(e, `${k}.infants`, u.infants, 0);
      checkWholeNumber(e, `${k}.beds`, u.beds, 1);
      if (rooms) {
        if (!oneOf(["private", "shared"], u.bathroom)) e[`${k}.bathroom`] = "pickOption";
      } else {
        checkWholeNumber(e, `${k}.bedrooms`, u.bedrooms, 0);
        checkWholeNumber(e, `${k}.bathrooms`, u.bathrooms, 0);
      }
    });
    if (form.rentMode === "BOTH") {
      checkWholeNumber(e, "whole.adults", form.whole.adults, 1);
      checkWholeNumber(e, "whole.bedrooms", form.whole.bedrooms, 0);
      checkWholeNumber(e, "whole.beds", form.whole.beds, 1);
      checkWholeNumber(e, "whole.bathrooms", form.whole.bathrooms, 0);
    }
  }
  if (step === 4) {
    for (const { key, unit } of pricedUnits(form)) {
      const r = unit.rate;
      const k = `${key}.rate`;
      if (!r.name.trim()) e[`${k}.name`] = "required";
      else if (r.name.trim().length > 80) e[`${k}.name`] = "tooLong";
      const price = parseNumber(r.price);
      if (price === null || price <= 0 || price > MONEY_MAX) e[`${k}.price`] = "price";
      const cap = capacityOf(unit);
      const guests = parseNumber(r.guests);
      if (r.guests.trim() === "") e[`${k}.guests`] = "required";
      else if (!isWhole(guests) || guests < 1) e[`${k}.guests`] = "min1";
      else if (cap > 0 && guests > cap) e[`${k}.guests`] = "guestsOverCapacity";
      checkMoney(e, `${k}.childFee`, r.childFee, { required: false });
      checkMoney(e, `${k}.infantFee`, r.infantFee, { required: false });
      if (!oneOf(MEALS, r.meals)) e[`${k}.meals`] = "pickOption";
      checkWholeNumber(e, `${k}.minStay`, r.minStay, 1);
      const min = parseNumber(r.minStay);
      const max = parseNumber(r.maxStay.trim() === "" ? "0" : r.maxStay);
      if (!isWhole(max) || max < 0 || max > 1000) e[`${k}.maxStay`] = "wholeNumber";
      else if (max !== 0 && isWhole(min) && max < min) e[`${k}.maxStay`] = "maxStay";
      if (r.cancellationPolicy !== "" && !oneOf(CANCELLATION_POLICIES, r.cancellationPolicy)) e[`${k}.cancellationPolicy`] = "pickOption";
      if (r.closedToArrival.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) e[`${k}.closedToArrival`] = "pickOption";
      if (r.derived) {
        if (!r.derivedName.trim()) e[`${k}.derivedName`] = "required";
        else if (r.derivedName.trim().length > 80) e[`${k}.derivedName`] = "tooLong";
        if (!oneOf(ADJUSTMENTS, r.adjustment)) e[`${k}.adjustment`] = "pickOption";
        const v = parseNumber(r.adjustValue);
        if (r.adjustment === "decrease_amount") {
          if (v === null || v <= 0) e[`${k}.adjustValue`] = "price";
          else if (price !== null && v >= price) e[`${k}.adjustValue`] = "amountUnderPrice";
        } else if (v === null || !isWhole(v) || v < 1 || v > 99) e[`${k}.adjustValue`] = "percent";
      }
    }
  }
  if (step === 5) {
    if (!oneOf(CANCELLATION_POLICIES, form.cancellationPolicy)) e.cancellationPolicy = "pickOption";
    if (!TIME.test(form.checkInTime)) e.checkInTime = form.checkInTime ? "time" : "required";
    if (!TIME.test(form.checkOutTime)) e.checkOutTime = form.checkOutTime ? "time" : "required";
    checkWholeNumber(e, "maxGuests", form.maxGuests, 1);
    if (!oneOf(INTERNET_TYPES, form.internetType)) e.internetType = "pickOption";
    if (!oneOf(INTERNET_COVERAGE, form.internetCoverage)) e.internetCoverage = "pickOption";
    checkMoney(e, "internetCost", form.internetCost, { required: false });
    if (!oneOf(PARKING_TYPES, form.parkingType)) e.parkingType = "pickOption";
    if (!oneOf(PARKING_RESERVATION, form.parkingReservation)) e.parkingReservation = "pickOption";
    if (!oneOf(PETS_POLICIES, form.petsPolicy)) e.petsPolicy = "pickOption";
    checkMoney(e, "petFee", form.petFee, { required: true });
    checkMoney(e, "petDeposit", form.petDeposit, { required: true });
    if (!oneOf(SMOKING_POLICIES, form.smokingPolicy)) e.smokingPolicy = "pickOption";
  }
  if (step === 6) {
    if (form.taxes.length > MAX_TAXES) e.taxes = "tooManyUnits";
    form.taxes.forEach((t, i) => Object.assign(e, prefixErrors(`taxes.${i}`, checkTax(t))));
  }
  if (step === 7) {
    if (!form.descriptionEn.trim()) e.descriptionEn = "required";
    else if (form.descriptionEn.trim().length > 5000) e.descriptionEn = "tooLong";
    if (form.descriptionAr.trim().length > 5000) e.descriptionAr = "tooLong";
    if (form.importantInfo.trim().length > 1000) e.importantInfo = "tooLong";
    const site = form.website.trim();
    if (site && (!/^https:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(site) || site.length > 255)) e.website = "website";
    if (form.facilities.some((f) => !(FACILITIES as readonly string[]).includes(f))) e.facilities = "pickOption";
  }
  if (step === 8) {
    for (let s = 1; s < STEP_COUNT; s++) Object.assign(e, checkStep(s, form, ctx));
  }
  return e;
}

// The "Add tax or fee" drawer checks one tax on its own before adding it.
export function checkTax(t: TaxForm): FormErrors {
  const e: FormErrors = {};
  if (!t.name.trim()) e.name = "required";
  else if (t.name.trim().length > 80) e.name = "tooLong";
  if (!oneOf(TAX_KINDS, t.kind)) e.kind = "pickOption";
  if (!oneOf(TAX_LOGIC, t.logic)) e.logic = "pickOption";
  const amount = parseNumber(t.amount);
  if (t.amount.trim() === "") e.amount = "required";
  else if (amount === null || amount <= 0 || amount > MONEY_MAX) e.amount = "price";
  else if (t.logic === "percent" && amount > 100) e.amount = "percent100";
  if (t.startsOn && !DATE.test(t.startsOn)) e.startsOn = "dates";
  if (t.endsOn && !DATE.test(t.endsOn)) e.endsOn = "dates";
  if (DATE.test(t.startsOn) && DATE.test(t.endsOn) && t.endsOn < t.startsOn) e.endsOn = "dates";
  if (t.skipNights.trim()) {
    const n = parseNumber(t.skipNights);
    if (!isWhole(n) || n < 0 || n > 365) e.skipNights = "wholeNumber";
  }
  if (t.maxNights.trim()) {
    const n = parseNumber(t.maxNights);
    if (!isWhole(n) || n < 1 || n > 365) e.maxNights = "min1";
  }
  return e;
}

const prefixErrors = (prefix: string, errors: FormErrors): FormErrors =>
  Object.fromEntries(Object.entries(errors).map(([k, v]) => [`${prefix}.${k}`, v]));

// The first step that still has errors, or null when all are complete.
export function firstIncompleteStep(form: PropertyForm, ctx: StepContext): number | null {
  for (let s = 1; s < STEP_COUNT; s++) if (Object.keys(checkStep(s, form, ctx)).length) return s;
  return null;
}

// ---------------------------------------------------------------------------
// Turning the form into stored values
// ---------------------------------------------------------------------------

const text = (s: string, max: number) => s.trim().slice(0, max);
const int = (s: string, fallback: number, min = 0, max = 1000) => {
  const n = parseNumber(s);
  return isWhole(n) && n >= min && n <= max ? n : fallback;
};
const optInt = (s: string, min = 0, max = 1000) => {
  const n = parseNumber(s);
  return isWhole(n) && n >= min && n <= max ? n : null;
};
// Money is kept to two decimals.
const money = (s: string, fallback: number) => {
  const n = parseNumber(s);
  return n !== null && n >= 0 && n <= MONEY_MAX ? Math.round(n * 100) / 100 : fallback;
};
const optMoney = (s: string) => {
  const n = parseNumber(s);
  return n !== null && n >= 0 && n <= MONEY_MAX ? Math.round(n * 100) / 100 : null;
};
const coordinate = (s: string, limit: number) => {
  const n = parseNumber(s);
  return n !== null && n >= -limit && n <= limit ? Math.round(n * 1e6) / 1e6 : null;
};
const pick = <T extends string>(list: readonly T[], value: string, fallback: T): T =>
  (list as readonly string[]).includes(value) ? (value as T) : fallback;
const date = (s: string) => (DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : null);

export type CleanRate = {
  id: string;
  name: string;
  price: number;
  guests: number;
  childFee: number;
  infantFee: number;
  meals: string;
  minStay: number;
  maxStay: number;
  cancellationPolicy: string;
  closedToArrival: number[];
  derived: null | { id: string; name: string; adjustment: string; adjustValue: number };
};

export type CleanUnit = {
  id: string;
  kind: "UNIT" | "ROOM" | "WHOLE";
  name: string;
  count: number;
  adults: number;
  children: number;
  infants: number;
  bedrooms: number | null;
  beds: number;
  bathrooms: number | null;
  bathroom: string | null;
  sortOrder: number;
  rate: CleanRate;
};

export type CleanTax = {
  id: string;
  name: string;
  kind: string;
  logic: string;
  amount: number;
  inclusive: boolean;
  startsOn: string | null;
  endsOn: string | null;
  skipNights: number | null;
  maxNights: number | null;
  sortOrder: number;
};

function cleanRate(r: RateForm, capacity: number): CleanRate {
  const price = money(r.price, 0);
  const guests = int(r.guests, Math.max(capacity, 1), 1);
  const minStay = int(r.minStay, 1, 1);
  const maxStay = int(r.maxStay, 0, 0);
  const adjustment = pick(ADJUSTMENTS, r.adjustment, "decrease_percent");
  return {
    id: r.id,
    name: text(r.name, 80),
    price,
    guests,
    childFee: money(r.childFee, 0),
    infantFee: money(r.infantFee, 0),
    meals: pick(MEALS, r.meals, "none"),
    minStay,
    maxStay: maxStay !== 0 && maxStay < minStay ? 0 : maxStay,
    cancellationPolicy: r.cancellationPolicy === "" ? "" : pick(CANCELLATION_POLICIES, r.cancellationPolicy, "flexible"),
    closedToArrival: [...new Set(r.closedToArrival.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort(),
    derived: r.derived
      ? { id: r.derivedId, name: text(r.derivedName, 80), adjustment, adjustValue: money(r.adjustValue, 10) }
      : null,
  };
}

function cleanUnit(u: UnitForm, kind: CleanUnit["kind"], sortOrder: number): CleanUnit {
  const adults = int(u.adults, 1, 1);
  return {
    id: u.id,
    kind,
    name: text(u.name, 80),
    count: kind === "UNIT" ? int(u.count, 1, 1) : 1,
    adults,
    children: int(u.children, 0),
    infants: int(u.infants, 0),
    bedrooms: kind === "ROOM" ? null : optInt(u.bedrooms),
    beds: int(u.beds, 1, 1),
    bathrooms: kind === "ROOM" ? null : optInt(u.bathrooms),
    bathroom: kind === "ROOM" ? (u.bathroom === "shared" ? "shared" : "private") : null,
    sortOrder,
    rate: cleanRate(u.rate, adults),
  };
}

// Stored values for the property, its units (with their rates) and taxes.
// Lenient on purpose: a draft may be half filled, so text that isn't a valid
// value falls back to the default instead of failing. The step checks are
// what stop a broker moving on with a mistake.
export function cleanForm(form: PropertyForm) {
  const unitKind = form.rentMode === "WHOLE" ? "UNIT" : "ROOM";
  const units = form.units.slice(0, MAX_UNITS).map((u, i) => cleanUnit(u, unitKind, i + 1));
  if (form.rentMode === "BOTH") units.unshift(cleanUnit(form.whole, "WHOLE", 0));
  return {
    property: {
      propertyTypeId: form.typeId || null,
      nickname: text(form.nickname, 80),
      titleEn: text(form.titleEn, 255),
      titleAr: text(form.titleAr, 255),
      email: text(form.email, 254),
      phone: text(form.phone, 30),
      currency: /^[A-Z]{3}$/.test(form.currency) ? form.currency : "EGP",
      countryId: form.countryId || null,
      cityId: form.cityId || null,
      compound: text(form.compound, 120),
      address: text(form.address, 255),
      postalCode: text(form.postalCode, 20),
      latitude: coordinate(form.latitude, 90),
      longitude: coordinate(form.longitude, 180),
      rentMode: pick(RENT_MODES, form.rentMode, "WHOLE"),
      cancellationPolicy: pick(CANCELLATION_POLICIES, form.cancellationPolicy, "flexible"),
      checkInTime: TIME.test(form.checkInTime) ? form.checkInTime : "15:00",
      checkOutTime: TIME.test(form.checkOutTime) ? form.checkOutTime : "12:00",
      maxGuests: optInt(form.maxGuests, 1),
      adultsOnly: form.adultsOnly === true,
      internetType: pick(INTERNET_TYPES, form.internetType, "wifi"),
      internetCoverage: pick(INTERNET_COVERAGE, form.internetCoverage, "all_rooms"),
      internetCost: optMoney(form.internetCost),
      parkingType: pick(PARKING_TYPES, form.parkingType, "on_site"),
      parkingReservation: pick(PARKING_RESERVATION, form.parkingReservation, "not_needed"),
      parkingPrivate: form.parkingPrivate !== false,
      petsPolicy: pick(PETS_POLICIES, form.petsPolicy, "not_allowed"),
      petFee: money(form.petFee, 0),
      petDeposit: money(form.petDeposit, 0),
      smokingPolicy: pick(SMOKING_POLICIES, form.smokingPolicy, "no_smoking"),
      descriptionEn: text(form.descriptionEn, 5000),
      descriptionAr: text(form.descriptionAr, 5000),
      importantInfo: text(form.importantInfo, 1000),
      website: text(form.website, 255),
      facilities: [...new Set(form.facilities)].filter((f) => (FACILITIES as readonly string[]).includes(f)),
    },
    units,
    taxes: form.taxes.slice(0, MAX_TAXES).map(
      (t, i): CleanTax => ({
        id: t.id,
        name: text(t.name, 80),
        kind: pick(TAX_KINDS, t.kind, "fee"),
        logic: pick(TAX_LOGIC, t.logic, "per_booking"),
        amount: money(t.amount, 0),
        inclusive: t.inclusive === true,
        startsOn: date(t.startsOn),
        endsOn: date(t.endsOn),
        skipNights: optInt(t.skipNights, 0, 365),
        maxNights: optInt(t.maxNights, 1, 365),
        sortOrder: i,
      }),
    ),
  };
}

// ---------------------------------------------------------------------------
// Reading a stored property back into the form
// ---------------------------------------------------------------------------

type Num = { toString(): string } | number | null;
const str = (n: Num) => (n === null ? "" : String(n));

export type StoredRate = {
  id: string;
  name: string;
  price: Num;
  guests: number;
  childFee: Num;
  infantFee: Num;
  meals: string;
  minStay: number;
  maxStay: number;
  cancellationPolicy: string;
  closedToArrival: number[];
  parentId: string | null;
  adjustment: string | null;
  adjustValue: Num;
};

export type StoredUnit = {
  id: string;
  kind: "UNIT" | "ROOM" | "WHOLE";
  name: string;
  count: number;
  adults: number;
  children: number;
  infants: number;
  bedrooms: number | null;
  beds: number;
  bathrooms: number | null;
  bathroom: string | null;
  sortOrder: number;
  rates: StoredRate[];
};

export type StoredTax = {
  id: string;
  name: string;
  kind: string;
  logic: string;
  amount: Num;
  inclusive: boolean;
  startsOn: Date | null;
  endsOn: Date | null;
  skipNights: number | null;
  maxNights: number | null;
  sortOrder: number;
};

export type StoredProperty = {
  propertyTypeId: string | null;
  nickname: string;
  titleEn: string;
  titleAr: string;
  email: string;
  phone: string;
  currency: string;
  countryId: string | null;
  cityId: string | null;
  compound: string;
  address: string;
  postalCode: string;
  latitude: Num;
  longitude: Num;
  rentMode: RentModeValue;
  cancellationPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  maxGuests: number | null;
  adultsOnly: boolean;
  internetType: string;
  internetCoverage: string;
  internetCost: Num;
  parkingType: string;
  parkingReservation: string;
  parkingPrivate: boolean;
  petsPolicy: string;
  petFee: Num;
  petDeposit: Num;
  smokingPolicy: string;
  descriptionEn: string;
  descriptionAr: string;
  importantInfo: string;
  website: string;
  facilities: string[];
  unitTypes: StoredUnit[];
  taxes: StoredTax[];
};

function rateToForm(rates: StoredRate[], names: DefaultNames): RateForm {
  const standard = rates.find((r) => r.parentId === null);
  if (!standard) return blankRate(names.standardRate, names.nonRefundable);
  const derived = rates.find((r) => r.parentId === standard.id);
  return {
    id: standard.id,
    name: standard.name,
    // A rate not priced yet (saved before step 4) comes back empty.
    price: Number(standard.price) > 0 ? str(standard.price) : "",
    guests: String(standard.guests),
    childFee: str(standard.childFee),
    infantFee: str(standard.infantFee),
    meals: standard.meals,
    minStay: String(standard.minStay),
    maxStay: String(standard.maxStay),
    cancellationPolicy: standard.cancellationPolicy,
    closedToArrival: [...standard.closedToArrival],
    derived: Boolean(derived),
    derivedId: derived?.id ?? "",
    derivedName: derived?.name ?? names.nonRefundable,
    adjustment: derived?.adjustment ?? "decrease_percent",
    adjustValue: derived ? str(derived.adjustValue) : "10",
  };
}

function unitToForm(u: StoredUnit, names: DefaultNames): UnitForm {
  return {
    id: u.id,
    name: u.name,
    count: String(u.count),
    adults: String(u.adults),
    children: String(u.children),
    infants: String(u.infants),
    bedrooms: str(u.bedrooms),
    beds: String(u.beds),
    bathrooms: str(u.bathrooms),
    bathroom: u.bathroom === "shared" ? "shared" : "private",
    rate: rateToForm(u.rates, names),
  };
}

const isoDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export function formFromStored(p: StoredProperty, names: DefaultNames): PropertyForm {
  const sorted = [...p.unitTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const whole = sorted.find((u) => u.kind === "WHOLE");
  const units = sorted.filter((u) => u.kind !== "WHOLE").map((u) => unitToForm(u, names));
  const blank = blankForm(names, null);
  return {
    typeId: p.propertyTypeId ?? "",
    nickname: p.nickname,
    titleEn: p.titleEn,
    titleAr: p.titleAr,
    email: p.email,
    phone: p.phone,
    currency: p.currency,
    countryId: p.countryId ?? "",
    cityId: p.cityId ?? "",
    compound: p.compound,
    address: p.address,
    postalCode: p.postalCode,
    latitude: str(p.latitude),
    longitude: str(p.longitude),
    rentMode: p.rentMode,
    units: units.length ? units : blank.units,
    whole: whole ? unitToForm(whole, names) : blank.whole,
    cancellationPolicy: p.cancellationPolicy,
    checkInTime: p.checkInTime,
    checkOutTime: p.checkOutTime,
    maxGuests: str(p.maxGuests),
    adultsOnly: p.adultsOnly,
    internetType: p.internetType,
    internetCoverage: p.internetCoverage,
    internetCost: str(p.internetCost),
    parkingType: p.parkingType,
    parkingReservation: p.parkingReservation,
    parkingPrivate: p.parkingPrivate,
    petsPolicy: p.petsPolicy,
    petFee: str(p.petFee),
    petDeposit: str(p.petDeposit),
    smokingPolicy: p.smokingPolicy,
    taxes: [...p.taxes]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        logic: t.logic,
        amount: str(t.amount),
        inclusive: t.inclusive,
        startsOn: isoDay(t.startsOn),
        endsOn: isoDay(t.endsOn),
        skipNights: str(t.skipNights),
        maxNights: str(t.maxNights),
      })),
    descriptionEn: p.descriptionEn,
    descriptionAr: p.descriptionAr,
    importantInfo: p.importantInfo,
    website: p.website,
    facilities: [...p.facilities],
  };
}

// ---------------------------------------------------------------------------
// Figures shown in the list, the property page and the review step
// ---------------------------------------------------------------------------

type CountedUnit = { kind: string; count: number };

// How many units are sold: identical units add up in whole-unit mode; each
// room is one; in "Both" mode the whole apartment counts as one more.
export function unitTotal(units: readonly CountedUnit[]): number {
  return units.reduce((sum, u) => sum + (u.kind === "UNIT" ? Math.max(u.count, 1) : 1), 0);
}

type PricedRate = { parentId: string | null; price: Num };

// The lowest standard price, or null when no rate has a price yet.
export function fromPrice(rates: readonly PricedRate[]): number | null {
  const prices = rates.filter((r) => r.parentId === null).map((r) => Number(r.price)).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : null;
}

// What a derived rate costs, given its standard price.
export function derivedPrice(price: number, adjustment: string, value: number): number {
  const result = adjustment === "decrease_amount" ? price - value : price * (1 - value / 100);
  return Math.max(0, Math.round(result * 100) / 100);
}

// How a currency is written: the code in English, the symbol in Arabic.
export function currencyLabel(currency: string, lang: "ar" | "en"): string {
  if (lang === "en") return currency;
  return currency === "EGP" ? "ج.م" : currency === "USD" ? "$" : currency;
}

// "EGP 7,800" in English, "7,800 ج.م" in Arabic.
export function formatMoney(amount: number, currency: string, lang: "ar" | "en"): string {
  const n = amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return lang === "en" ? `${currency} ${n}` : `${n} ${currencyLabel(currency, lang)}`;
}

export type ListStatus = "draft" | "syncing" | "synced" | "failed" | "archived";

export function listStatus(p: { status: string; archivedAt: Date | null }): ListStatus {
  if (p.archivedAt) return "archived";
  if (p.status === "SYNCED") return "synced";
  if (p.status === "SYNCING") return "syncing";
  if (p.status === "SYNC_FAILED") return "failed";
  return "draft";
}

// The search box matches the nickname, either title or the compound,
// ignoring case.
export function matchesSearch(p: { nickname: string; titleEn: string; titleAr: string; compound: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [p.nickname, p.titleEn, p.titleAr, p.compound].some((s) => s.toLowerCase().includes(q));
}

// The nickname offered for a copy: "Name 2", or the next free number.
export function copyNickname(nickname: string, taken: readonly string[]): string {
  const base = nickname.replace(/\s+\d+$/, "").trim() || nickname;
  const used = new Set(taken.map((t) => t.trim().toLowerCase()));
  for (let i = 2; i < 1000; i++) {
    const name = `${base} ${i}`.slice(0, 80);
    if (!used.has(name.toLowerCase())) return name;
  }
  return `${base} copy`.slice(0, 80);
}

// ---------------------------------------------------------------------------
// Reading a form sent to the server
// ---------------------------------------------------------------------------

// Server actions can be called with anything, not only what the wizard sends.
// This rebuilds a PropertyForm from the request, keeping only fields of the
// right kind and cutting text to a safe length; anything else is null.
export function readForm(value: unknown, names: DefaultNames): PropertyForm | null {
  if (!isObject(value)) return null;
  const s = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
  const b = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const id = (v: unknown) => (typeof v === "string" && /^[\w-]{1,40}$/.test(v) ? v : "");
  const days = (v: unknown) => (Array.isArray(v) ? v.slice(0, 7).filter((d): d is number => Number.isInteger(d)) : []);
  const rate = (v: unknown): RateForm => {
    const r = isObject(v) ? v : {};
    const base = blankRate(names.standardRate, names.nonRefundable);
    return {
      id: id(r.id),
      name: s(r.name, 200),
      price: s(r.price, 30),
      guests: s(r.guests, 10),
      childFee: s(r.childFee, 30),
      infantFee: s(r.infantFee, 30),
      meals: s(r.meals, 40) || base.meals,
      minStay: s(r.minStay, 10),
      maxStay: s(r.maxStay, 10),
      cancellationPolicy: s(r.cancellationPolicy, 40),
      closedToArrival: days(r.closedToArrival),
      derived: b(r.derived, false),
      derivedId: id(r.derivedId),
      derivedName: s(r.derivedName, 200),
      adjustment: s(r.adjustment, 40) || base.adjustment,
      adjustValue: s(r.adjustValue, 30),
    };
  };
  const unit = (v: unknown): UnitForm => {
    const u = isObject(v) ? v : {};
    return {
      id: id(u.id),
      name: s(u.name, 200),
      count: s(u.count, 10),
      adults: s(u.adults, 10),
      children: s(u.children, 10),
      infants: s(u.infants, 10),
      bedrooms: s(u.bedrooms, 10),
      beds: s(u.beds, 10),
      bathrooms: s(u.bathrooms, 10),
      bathroom: u.bathroom === "shared" ? "shared" : "private",
      rate: rate(u.rate),
    };
  };
  const tax = (v: unknown): TaxForm => {
    const t = isObject(v) ? v : {};
    return {
      id: id(t.id),
      name: s(t.name, 200),
      kind: s(t.kind, 40),
      logic: s(t.logic, 40),
      amount: s(t.amount, 30),
      inclusive: b(t.inclusive, false),
      startsOn: s(t.startsOn, 10),
      endsOn: s(t.endsOn, 10),
      skipNights: s(t.skipNights, 10),
      maxNights: s(t.maxNights, 10),
    };
  };
  const f = value;
  if (!Array.isArray(f.units) || !Array.isArray(f.taxes) || !Array.isArray(f.facilities)) return null;
  return {
    typeId: id(f.typeId),
    nickname: s(f.nickname, 200),
    titleEn: s(f.titleEn, 500),
    titleAr: s(f.titleAr, 500),
    email: s(f.email, 300),
    phone: s(f.phone, 40),
    currency: s(f.currency, 3),
    countryId: id(f.countryId),
    cityId: id(f.cityId),
    compound: s(f.compound, 200),
    address: s(f.address, 500),
    postalCode: s(f.postalCode, 40),
    latitude: s(f.latitude, 30),
    longitude: s(f.longitude, 30),
    rentMode: (RENT_MODES as readonly unknown[]).includes(f.rentMode) ? (f.rentMode as RentModeValue) : "WHOLE",
    units: f.units.slice(0, MAX_UNITS + 1).map(unit),
    whole: unit(f.whole),
    cancellationPolicy: s(f.cancellationPolicy, 40),
    checkInTime: s(f.checkInTime, 5),
    checkOutTime: s(f.checkOutTime, 5),
    maxGuests: s(f.maxGuests, 10),
    adultsOnly: b(f.adultsOnly, false),
    internetType: s(f.internetType, 40),
    internetCoverage: s(f.internetCoverage, 40),
    internetCost: s(f.internetCost, 30),
    parkingType: s(f.parkingType, 40),
    parkingReservation: s(f.parkingReservation, 40),
    parkingPrivate: b(f.parkingPrivate, true),
    petsPolicy: s(f.petsPolicy, 40),
    petFee: s(f.petFee, 30),
    petDeposit: s(f.petDeposit, 30),
    smokingPolicy: s(f.smokingPolicy, 40),
    taxes: f.taxes.slice(0, MAX_TAXES + 1).map(tax),
    descriptionEn: s(f.descriptionEn, 6000),
    descriptionAr: s(f.descriptionAr, 6000),
    importantInfo: s(f.importantInfo, 2000),
    website: s(f.website, 300),
    facilities: f.facilities.slice(0, 50).filter((x): x is string => typeof x === "string"),
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
