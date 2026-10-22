// ---------------------------------------------------------------------------
// The rules behind the broker Calendar (design App_Calendar, version 64):
// what each night shows, how a quick edit, bulk edit, block or reset changes
// the stored nights, the bulk edit guard rails, and the values sent to
// Channex. Pure functions, shared by the screens and the server actions, so
// what the broker sees before saving is exactly what the server stores.
//
// Dates are plain "YYYY-MM-DD" strings (a night is named by its check-in
// date), so nothing shifts with time zones.
// ---------------------------------------------------------------------------

// How far ahead the calendar can be edited: Channex keeps 500 days.
export const DAYS_AHEAD = 500;
// Bulk edit: prices can't go below 60% of the unit type's base price, and more
// than 100 nights needs a confirm tick.
export const FLOOR_SHARE = 0.6;
export const CONFIRM_OVER = 100;
// How long a save can be undone (the toast shows Undo for 10 seconds; the
// server allows a little longer for slow connections).
export const UNDO_SECONDS = 10;
export const UNDO_GRACE_SECONDS = 60;
// Desktop grid: 14 nights, moved a week at a time. Phone day list: 7 nights.
export const GRID_SPAN = 14;
export const PHONE_SPAN = 7;

export const BLOCK_REASONS = ["owner", "maint", "other"] as const;
export type BlockReason = (typeof BLOCK_REASONS)[number];

// Weekday chips run Saturday first (the week starts on Saturday in Egypt).
// Values are JavaScript weekdays: 0 = Sunday ... 6 = Saturday.
export const SAT_FIRST = [6, 0, 1, 2, 3, 4, 5] as const;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);
}

// 0 = Sunday ... 6 = Saturday.
export function weekday(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

// Today in a time zone, as "YYYY-MM-DD".
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function lastEditable(today: string): string {
  return addDays(today, DAYS_AHEAD - 1);
}

// The month grid (Saturday first): leading blanks, then each date of the month.
export function monthCells(year: number, month: number): (string | null)[] {
  const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (weekday(first) + 1) % 7;
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, k) => {
    const day = k - lead + 1;
    return day < 1 || day > days ? null : addDays(first, day - 1);
  });
}

// ---------------------------------------------------------------------------
// Unit types and nights
// ---------------------------------------------------------------------------

// What the calendar needs about one unit type (Channex room type) and its
// standard rate. `link` groups the whole apartment with its rooms ("Both"
// mode): booking one closes the others.
export type CalType = {
  id: string;
  propertyId: string;
  name: string;
  count: number;
  price: number;
  minStay: number;
  maxStay: number; // 0 = no limit
  // Rate weekdays closed to arrival, 1 = Monday ... 7 = Sunday.
  closedToArrival: number[];
  link: "whole" | "room" | null;
};

// A stored night: only what the broker changed. Missing or null = default.
export type Override = {
  price?: number | null;
  unitsOpen?: number | null;
  minStay?: number | null;
  maxStay?: number | null;
  cta?: boolean | null;
  ctd?: boolean | null;
  stop?: boolean | null;
  block?: BlockReason | null;
};

// What one night of one unit type is, after defaults.
export type Night = {
  price: number;
  unitsOpen: number;
  minStay: number;
  maxStay: number;
  cta: boolean;
  ctd: boolean;
  stop: boolean;
  block: BlockReason | null;
  booked: number;
  linked: boolean;
  left: number; // units channels can still sell
};

// Bookings arrive with the Bookings module; until then every night has none.
export type Bookings = (typeId: string, date: string) => number;
export const NO_BOOKINGS: Bookings = () => 0;

export function overrideKey(typeId: string, date: string) {
  return `${typeId}|${date}`;
}

// ISO weekday (1 = Monday ... 7 = Sunday) of a JavaScript weekday.
function isoWeekday(jsDay: number) {
  return jsDay === 0 ? 7 : jsDay;
}

export function nightOf(type: CalType, date: string, o: Override | undefined, booked = 0, linked = false): Night {
  const price = o?.price ?? type.price;
  const unitsOpen = o?.unitsOpen != null ? Math.min(o.unitsOpen, type.count) : type.count;
  const minStay = o?.minStay ?? type.minStay;
  const maxStay = o?.maxStay ?? type.maxStay;
  const cta = o?.cta ?? type.closedToArrival.includes(isoWeekday(weekday(date)));
  const ctd = o?.ctd ?? false;
  const stop = o?.stop ?? false;
  const block = o?.block ?? null;
  const left = block || stop || linked ? 0 : Math.max(0, unitsOpen - booked);
  return { price, unitsOpen, minStay, maxStay, cta, ctd, stop, block, booked, linked, left };
}

export function isEmptyOverride(o: Override): boolean {
  return Object.values(o).every((v) => v === null || v === undefined);
}

// ---------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------

export const PRICE_MODES = ["keep", "set", "pctUp", "pctDown", "amtUp", "amtDown"] as const;
export type PriceMode = (typeof PRICE_MODES)[number];
// "on" sets the flag (Not allowed / Closed), "off" clears it (Allowed / Open).
export type Tri = "keep" | "on" | "off";

export type EditSpec = {
  mode: PriceMode;
  value: string; // price, percentage or amount, as typed
  units: string;
  min: string;
  max: string;
  cta: Tri;
  ctd: Tri;
  stop: Tri;
  days: boolean[]; // by JavaScript weekday, 0 = Sunday
};

export function blankSpec(mode: PriceMode = "set"): EditSpec {
  return { mode, value: "", units: "", min: "", max: "", cta: "keep", ctd: "keep", stop: "keep", days: [true, true, true, true, true, true, true] };
}

export function newPrice(old: number, mode: PriceMode, value: number): number {
  switch (mode) {
    case "set":
      return value;
    case "pctUp":
      return Math.round(old * (1 + value / 100));
    case "pctDown":
      return Math.round(old * (1 - value / 100));
    case "amtUp":
      return old + value;
    case "amtDown":
      return old - value;
    default:
      return old;
  }
}

// The lowest price bulk edit allows: 60% of the base price, to the nearest 100.
export function priceFloor(type: CalType): number {
  return Math.round((type.price * FLOOR_SHARE) / 100) * 100;
}

const num = (s: string) => Number(s.trim().replace(/,/g, ""));
const filled = (s: string) => s.trim() !== "";

export type EditError =
  | "aboveZero"
  | "decreaseUnder100"
  | "minStay"
  | "maxStay"
  | "maxBelowMin"
  | "units"
  | "weekday"
  | "nothing"
  | "noTypes"
  | "range"
  | "priceValue";

// The side panel's (and phone sheet's) checks, in the design's order.
export function checkQuickEdit(spec: EditSpec): EditError | null {
  const P = spec.value, Mi = spec.min, Ma = spec.max, U = spec.units;
  if (filled(P) && !(num(P) > 0)) return "aboveZero";
  if (filled(P) && spec.mode === "pctDown" && num(P) >= 100) return "decreaseUnder100";
  if (filled(Mi) && !(num(Mi) >= 1 && Number.isInteger(num(Mi)))) return "minStay";
  if (filled(Ma) && !(num(Ma) >= 0 && Number.isInteger(num(Ma)))) return "maxStay";
  if (filled(Mi) && filled(Ma) && num(Ma) > 0 && num(Ma) < num(Mi)) return "maxBelowMin";
  if (filled(U) && !(num(U) >= 0 && Number.isInteger(num(U)))) return "units";
  if (!spec.days.some(Boolean)) return "weekday";
  if (!filled(P) && !filled(Mi) && !filled(Ma) && !filled(U) && spec.cta === "keep" && spec.ctd === "keep" && spec.stop === "keep")
    return "nothing";
  return null;
}

// Applies one edit to one night. Quick edit: an empty price keeps it. Bulk
// edit: mode "keep" keeps it.
export function applyEdit(type: CalType, date: string, o: Override | undefined, spec: EditSpec): Override {
  const next: Override = { ...(o ?? {}) };
  const current = nightOf(type, date, o);
  if (spec.mode !== "keep" && filled(spec.value)) next.price = newPrice(current.price, spec.mode, num(spec.value));
  if (filled(spec.min)) next.minStay = num(spec.min);
  if (filled(spec.max)) next.maxStay = num(spec.max);
  // Units open only means something for types with several identical units.
  if (filled(spec.units) && type.count > 1) next.unitsOpen = Math.min(type.count, num(spec.units));
  if (spec.cta !== "keep") next.cta = spec.cta === "on";
  if (spec.ctd !== "keep") next.ctd = spec.ctd === "on";
  if (spec.stop !== "keep") next.stop = spec.stop === "on";
  return next;
}

// The nights an edit touches: each selected type, each date in the range on a
// picked weekday, skipping fully booked nights.
export function targetNights(
  types: CalType[],
  from: string,
  to: string,
  days: boolean[],
  bookings: Bookings = NO_BOOKINGS,
): { targets: { type: CalType; date: string }[]; skipped: number } {
  const targets: { type: CalType; date: string }[] = [];
  let skipped = 0;
  for (const type of types) {
    for (const date of dateRange(from, to)) {
      if (!days[weekday(date)]) continue;
      if (bookings(type.id, date) >= type.count) {
        skipped++;
        continue;
      }
      targets.push({ type, date });
    }
  }
  return { targets, skipped };
}

// ---------------------------------------------------------------------------
// Bulk edit
// ---------------------------------------------------------------------------

export type BulkSpec = EditSpec & { typeIds: string[]; from: string; to: string; confirm: boolean };

export type BulkPreview = {
  nights: number;
  skipped: number;
  below: number;
  examples: { typeId: string; date: string; from: number; to: number; below: boolean }[];
};

export function bulkPreview(
  types: CalType[],
  overrides: Map<string, Override>,
  spec: BulkSpec,
  bookings: Bookings = NO_BOOKINGS,
): BulkPreview {
  const chosen = types.filter((t) => spec.typeIds.includes(t.id));
  if (!isIsoDate(spec.from) || !isIsoDate(spec.to) || spec.to < spec.from) return { nights: 0, skipped: 0, below: 0, examples: [] };
  const { targets, skipped } = targetNights(chosen, spec.from, spec.to, spec.days, bookings);
  const pricing = spec.mode !== "keep" && filled(spec.value) && num(spec.value) > 0;
  let below = 0;
  const examples: BulkPreview["examples"] = [];
  const shown = new Set<string>();
  for (const { type, date } of targets) {
    if (!pricing) continue;
    const old = nightOf(type, date, overrides.get(overrideKey(type.id, date))).price;
    const next = newPrice(old, spec.mode, num(spec.value));
    const isBelow = next < priceFloor(type);
    if (isBelow) below++;
    if (!shown.has(type.id) && examples.length < 3) {
      shown.add(type.id);
      examples.push({ typeId: type.id, date, from: old, to: next, below: isBelow });
    }
  }
  return { nights: targets.length, skipped, below, examples };
}

// Bulk edit checks, in the design's order. `range` covers a missing or
// reversed range, no weekday, or dates outside today..500 days ahead.
export function checkBulk(spec: BulkSpec, preview: BulkPreview, today: string): EditError | "below" | "confirm" | null {
  if (!spec.typeIds.length) return "noTypes";
  if (
    !isIsoDate(spec.from) ||
    !isIsoDate(spec.to) ||
    spec.to < spec.from ||
    spec.from < today ||
    spec.to > lastEditable(today) ||
    !spec.days.some(Boolean)
  )
    return "range";
  if (spec.mode !== "keep" && !(num(spec.value) > 0)) return "priceValue";
  if (spec.mode === "pctDown" && num(spec.value) >= 100) return "decreaseUnder100";
  if (filled(spec.min) && !(num(spec.min) >= 1 && Number.isInteger(num(spec.min)))) return "minStay";
  if (spec.mode === "keep" && !filled(spec.min) && spec.cta === "keep" && spec.ctd === "keep" && spec.stop === "keep") return "nothing";
  if (preview.below > 0) return "below";
  if (preview.nights > CONFIRM_OVER && !spec.confirm) return "confirm";
  return null;
}

// ---------------------------------------------------------------------------
// Date presets for bulk edit. Holiday dates will come from an Ops-managed
// list later; until then the next Eid al-Adha dates are listed here.
// ---------------------------------------------------------------------------

const EID_AL_ADHA: [string, string][] = [
  ["2027-05-15", "2027-05-19"],
  ["2028-05-03", "2028-05-07"],
  ["2029-04-23", "2029-04-27"],
];

export type PresetKey = "wknd" | "n30" | "eid" | "summer" | "ny";
export type Preset = { key: PresetKey; from: string; to: string; year: number };

export function presets(today: string): Preset[] {
  const year = Number(today.slice(0, 4));
  const out: Preset[] = [];
  // Next weekend: the next Thursday and Friday nights after this week's.
  const toThu = (4 - weekday(today) + 7) % 7 || 7;
  const thu = addDays(today, toThu);
  out.push({ key: "wknd", from: thu, to: addDays(thu, 1), year: Number(thu.slice(0, 4)) });
  out.push({ key: "n30", from: today, to: addDays(today, 29), year });
  const eid = EID_AL_ADHA.find(([, end]) => end >= today);
  if (eid) out.push({ key: "eid", from: eid[0] < today ? today : eid[0], to: eid[1], year: Number(eid[0].slice(0, 4)) });
  const summerYear = today > `${year}-09-30` ? year + 1 : year;
  const summerFrom = `${summerYear}-06-01` < today ? today : `${summerYear}-06-01`;
  out.push({ key: "summer", from: summerFrom, to: `${summerYear}-09-30`, year: summerYear });
  const nyYear = today > `${year}-12-30` ? year + 1 : year;
  out.push({ key: "ny", from: `${nyYear}-12-30`, to: `${nyYear + 1}-01-01`, year: nyYear + 1 });
  const last = lastEditable(today);
  return out.filter((p) => p.to <= last);
}

// ---------------------------------------------------------------------------
// Channex values
// ---------------------------------------------------------------------------

// The Channex ids a calendar save needs: the property, each unit type's room
// type, and its standard rate plan.
export type ChannexIds = {
  propertyId: string;
  roomTypes: Record<string, string>; // unit type id -> Channex room type id
  ratePlans: Record<string, string>; // unit type id -> Channex standard rate plan id
};

export type RestrictionValue = {
  property_id: string;
  rate_plan_id: string;
  date_from: string;
  date_to: string;
  rate: string;
  min_stay_arrival: number;
  max_stay: number;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  stop_sell: boolean;
};

export type AvailabilityValue = {
  property_id: string;
  room_type_id: string;
  date_from: string;
  date_to: string;
  availability: number;
};

export type AriValues = { restrictions: RestrictionValue[]; availability: AvailabilityValue[] };

// Channex values for the given nights of one property. Availability is the
// units open minus bookings (0 when blocked, closed or closed by a linked
// booking); restrictions go to the standard rate only, since derived rates
// (non-refundable) follow it in Channex. Consecutive nights with the same
// values are sent as one date range, so one save is one small request.
export function buildAri(
  ids: ChannexIds,
  nights: { type: CalType; date: string; night: Night }[],
): AriValues {
  const sorted = [...nights].sort((a, b) => (a.type.id === b.type.id ? (a.date < b.date ? -1 : 1) : a.type.id < b.type.id ? -1 : 1));
  const restrictions: RestrictionValue[] = [];
  const availability: AvailabilityValue[] = [];
  for (const { type, date, night } of sorted) {
    const ratePlan = ids.ratePlans[type.id];
    const roomType = ids.roomTypes[type.id];
    if (ratePlan) {
      const value: RestrictionValue = {
        property_id: ids.propertyId,
        rate_plan_id: ratePlan,
        date_from: date,
        date_to: date,
        rate: night.price.toFixed(2),
        min_stay_arrival: night.minStay,
        max_stay: night.maxStay,
        closed_to_arrival: night.cta,
        closed_to_departure: night.ctd,
        stop_sell: night.stop,
      };
      const last = restrictions[restrictions.length - 1];
      if (last && sameExceptDates(last, value) && addDays(last.date_to, 1) === date) last.date_to = date;
      else restrictions.push(value);
    }
    if (roomType) {
      const value: AvailabilityValue = { property_id: ids.propertyId, room_type_id: roomType, date_from: date, date_to: date, availability: night.left };
      const last = availability[availability.length - 1];
      if (last && sameExceptDates(last, value) && addDays(last.date_to, 1) === date) last.date_to = date;
      else availability.push(value);
    }
  }
  return { restrictions, availability };
}

function sameExceptDates<T extends { date_from: string; date_to: string }>(a: T, b: T): boolean {
  const strip = (x: T) => JSON.stringify({ ...x, date_from: "", date_to: "" });
  return strip(a) === strip(b);
}

// ---------------------------------------------------------------------------
// Reading form values sent to the server
// ---------------------------------------------------------------------------

const TRI = new Set(["keep", "on", "off"]);

export function readSpec(raw: unknown): EditSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 20) : "");
  if (!PRICE_MODES.includes(r.mode as PriceMode)) return null;
  if (!TRI.has(r.cta as string) || !TRI.has(r.ctd as string) || !TRI.has(r.stop as string)) return null;
  if (!Array.isArray(r.days) || r.days.length !== 7 || !r.days.every((d) => typeof d === "boolean")) return null;
  return {
    mode: r.mode as PriceMode,
    value: str(r.value),
    units: str(r.units),
    min: str(r.min),
    max: str(r.max),
    cta: r.cta as Tri,
    ctd: r.ctd as Tri,
    stop: r.stop as Tri,
    days: r.days as boolean[],
  };
}
