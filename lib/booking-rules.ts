// Rules of the Bookings and Guests pages (design App_Bookings, version 87,
// "Reservations and guests · ready for development"). Pure functions only, so
// the screens, the server and the tests share them.
//
// Dates are ISO days ("2026-10-22"). "Today" is the broker's day (Cairo).

export const DIRECT = "direct";

export const TABS = ["req", "arr", "dep", "stay", "up", "past", "canc", "all"] as const;
export type BookingTab = (typeof TABS)[number];

export type Stage = "arr" | "dep" | "stay" | "up" | "past" | "canc";

export const SOURCES = ["whatsapp", "phone", "walkin", "repeat", "other"] as const;
export type Source = (typeof SOURCES)[number];

export const METHODS = ["cash", "instapay", "bank", "card"] as const;
export type Method = (typeof METHODS)[number];

export const DECLINE_REASONS = ["dates", "fit", "noanswer", "other"] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const DOC_TYPES = ["nid", "pass"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export type PayState = "ota" | "unpaid" | "part" | "paid" | "none";
export const PAY_FILTERS = ["all", "unpaid", "part", "paid", "ota"] as const;

// Platforms whose guest total includes Egypt's 14% VAT (Booking.com, Expedia).
export const VAT_PLATFORMS = ["bdc", "exp"];
export const VAT_RATE = 0.14;

const DAY = 86_400_000;

export function isIso(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

export function plusDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsOf(arrival: string, departure: string): number {
  return Math.max(0, dayDiff(arrival, departure));
}

export function overlaps(a: { arrival: string; departure: string }, b: { arrival: string; departure: string }): boolean {
  return a.arrival < b.departure && b.arrival < a.departure;
}

// Where a booking stands today (the design's stage): arriving, departing,
// staying, upcoming, checked out or cancelled.
export function stageOf(b: { arrival: string; departure: string; cancelled: boolean }, today: string): Stage {
  if (b.cancelled) return "canc";
  if (b.arrival === today) return "arr";
  if (b.departure === today) return "dep";
  if (b.arrival < today && b.departure > today) return "stay";
  if (b.departure < today) return "past";
  return "up";
}

// Upcoming includes today's arrivals.
export function inTab(stage: Stage, tab: BookingTab): boolean {
  if (tab === "all") return true;
  if (tab === "req") return false;
  if (tab === "up") return stage === "up" || stage === "arr";
  return stage === tab;
}

// Past and cancelled bookings are listed newest first, the others soonest first.
export function sortForTab<T extends { arrival: string }>(rows: T[], tab: BookingTab): T[] {
  const desc = tab === "past" || tab === "canc";
  return [...rows].sort((a, b) => (desc ? b.arrival.localeCompare(a.arrival) : a.arrival.localeCompare(b.arrival)));
}

export type Money = { nights: number; cleaning: number; tax: number; total: number; commission: number };

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// The amounts a booking breaks down into. For Booking.com and Expedia the
// guest total is nights + cleaning + 14% VAT; for Airbnb it is what the guest
// paid without Airbnb's service fees. Payout = total − commission − VAT.
export function payout(m: Money): number {
  return round2(m.total - m.commission - m.tax);
}

// Commission as a share of nights + cleaning, for "commission (15%)".
export function commissionPct(m: Money): number {
  const base = m.nights + m.cleaning;
  return base > 0 ? Math.round((m.commission / base) * 100) : 0;
}

// Booking.com / Expedia VAT on nights + cleaning, when the platform didn't say.
export function vatFor(platform: string, nights: number, cleaning: number): number {
  return VAT_PLATFORMS.includes(platform) ? Math.round((nights + cleaning) * VAT_RATE) : 0;
}

export function paidOf(payments: { kind: string; amount: number }[]): number {
  return round2(payments.filter((p) => p.kind === "payment").reduce((a, p) => a + p.amount, 0));
}

export function refundedOf(payments: { kind: string; amount: number }[]): number {
  return round2(payments.filter((p) => p.kind === "refund").reduce((a, p) => a + p.amount, 0));
}

export function payStateOf(b: { collect: string; cancelled: boolean; total: number; paid: number }): PayState {
  if (b.cancelled) return "none";
  if (b.collect === "ota") return "ota";
  if (b.paid <= 0) return "unpaid";
  return b.paid < b.total ? "part" : "paid";
}

export function dueOf(b: { total: number; paid: number }): number {
  return Math.max(0, round2(b.total - b.paid));
}

// ---------------------------------------------------------------------------
// Apartments and double bookings

export type Slot = {
  id: string;
  unitTypeId: string | null;
  apt: number;
  arrival: string;
  departure: string;
  cancelled: boolean;
  // Design v88: a whole apartment and its own rooms ("Both" mode) can't be
  // sold on the same night. `link` says which one this unit type is.
  propertyId?: string | null;
  link?: "whole" | "room" | null;
  // A stay split across two identical apartments: from splitAt the guest is
  // in apartment splitApt.
  splitAt?: string | null;
  splitApt?: number | null;
};

// The apartment a booking is in on each part of its stay (two parts when the
// stay is split).
export function segmentsOf<T extends Slot>(b: T): T[] {
  if (!b.splitAt || !b.splitApt || b.splitAt <= b.arrival || b.splitAt >= b.departure) return [b];
  return [
    { ...b, departure: b.splitAt, splitAt: null, splitApt: null },
    { ...b, arrival: b.splitAt, apt: b.splitApt, splitAt: null, splitApt: null },
  ];
}

// Two bookings that can't both happen: same apartment on the same night, or
// the whole apartment and one of its rooms on the same night.
export function clashes(a: Slot, b: Slot): boolean {
  if (a.id === b.id || a.cancelled || b.cancelled || !a.unitTypeId || !b.unitTypeId) return false;
  for (const x of segmentsOf(a))
    for (const y of segmentsOf(b)) {
      if (!overlaps(x, y)) continue;
      if (x.unitTypeId === y.unitTypeId && x.apt === y.apt) return true;
      if (x.unitTypeId !== y.unitTypeId && x.propertyId && x.propertyId === y.propertyId && x.link && y.link && x.link !== y.link) return true;
    }
  return false;
}

// Bookings that clash with another (two platforms sold the same night before
// the update reached them). Checked-out stays don't count.
export function doubleBooked(list: Slot[], today: string): Set<string> {
  const out = new Set<string>();
  const live = list.filter((b) => !b.cancelled && b.unitTypeId && b.departure > today);
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length; j++) {
      if (clashes(live[i], live[j])) {
        out.add(live[i].id);
        out.add(live[j].id);
      }
    }
  return out;
}

// The other booking this one clashes with.
export function clashWith<T extends Slot>(b: T, list: T[]): T | undefined {
  return list.find((x) => clashes(b, x));
}

// Which of the unit type's identical apartments (1..count) is busy on any of
// these nights, and by which booking.
export function aptStatus<T extends Slot>(
  list: T[],
  unitTypeId: string,
  count: number,
  range: { arrival: string; departure: string },
  excludeId?: string,
): { apt: number; busy: T | undefined }[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const apt = i + 1;
    const busy = list.find((x) => x.id !== excludeId && !x.cancelled && segmentsOf(x).some((sg) => sg.unitTypeId === unitTypeId && sg.apt === apt && overlaps(sg, range)));
    return { apt, busy };
  });
}

export function firstFreeApt(list: Slot[], unitTypeId: string, count: number, range: { arrival: string; departure: string }, excludeId?: string): number | null {
  return aptStatus(list, unitTypeId, count, range, excludeId).find((a) => !a.busy)?.apt ?? null;
}

// Moving is only between identical apartments of the same type, and only for
// stays that haven't started yet (upcoming, or arriving today).
export function canMove(b: { cancelled: boolean; stage: Stage }, count: number): boolean {
  return count > 1 && !b.cancelled && (b.stage === "up" || b.stage === "arr");
}

// ---------------------------------------------------------------------------
// Phones and guests

export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^00/, "");
}

export function validMobile(phone: string): boolean {
  const d = phoneKey(phone);
  return d.length >= 10 && d.length <= 15;
}

export function waLink(phone: string): string {
  return `https://wa.me/${phoneKey(phone)}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// A Booking.com relay address forwards to the guest; it isn't their own.
export function emailKindOf(email: string, platform: string): "" | "alias" | "hidden" {
  if (!email) return platform && platform !== DIRECT ? "hidden" : "";
  if (/@guest\.booking\.com$/i.test(email) || /@(m\.)?expediapartnercentral\.com$/i.test(email)) return "alias";
  return "";
}

export type GuestTag = "repeat" | "vip" | "blocked";

export function guestTags(g: { stays: number; vip: boolean; blocked: boolean }): GuestTag[] {
  const t: GuestTag[] = [];
  if (g.vip) t.push("vip");
  if (g.stays >= 2) t.push("repeat");
  if (g.blocked) t.push("blocked");
  return t;
}

// Profiles that share a mobile number with another profile of the broker.
export function duplicatePairs(guests: { id: string; phoneKey: string }[]): Map<string, string> {
  const by = new Map<string, string[]>();
  for (const g of guests) if (g.phoneKey.length >= 8) by.set(g.phoneKey, [...(by.get(g.phoneKey) ?? []), g.id]);
  const out = new Map<string, string>();
  for (const ids of by.values()) if (ids.length > 1) for (const id of ids) out.set(id, ids.find((x) => x !== id)!);
  return out;
}

// Which profile a booking's guest belongs to: same mobile first, then email.
export function matchGuest<T extends { id: string; phoneKey: string; email: string }>(guests: T[], phone: string, email: string): T | undefined {
  const key = phoneKey(phone);
  if (key.length >= 8) {
    const byPhone = guests.find((g) => g.phoneKey === key);
    if (byPhone) return byPhone;
  }
  const e = email.trim().toLowerCase();
  return e ? guests.find((g) => g.email.toLowerCase() === e) : undefined;
}

// ---------------------------------------------------------------------------
// Direct bookings, payments, cancelling and reports

export type DirectInput = {
  unitTypeId: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  guestMode: "old" | "new";
  guestId: string;
  guestName: string;
  guestPhone: string;
  rate: number | null; // empty = the calendar price
  deposit: number;
};

export type DirectError =
  | { field: "u"; code: "noUnit" }
  | { field: "dates"; code: "badDates" | "past" }
  | { field: "dates"; code: "taken"; guest: string; from: string; to: string }
  | { field: "adults"; code: "noGuests" }
  | { field: "adults"; code: "tooMany"; max: number }
  | { field: "gid"; code: "noGuest" }
  | { field: "gname"; code: "noName" }
  | { field: "gphone"; code: "badPhone" }
  | { field: "rate"; code: "badRate" }
  | { field: "dep"; code: "badDeposit" };

export function checkDirect(
  f: DirectInput,
  ctx: {
    today: string;
    unit: { id: string; count: number; maxGuests: number } | null;
    bookings: (Slot & { guest: string })[];
    total: number;
  },
): DirectError[] {
  const e: DirectError[] = [];
  if (!ctx.unit) e.push({ field: "u", code: "noUnit" });
  if (!isIso(f.arrival) || !isIso(f.departure) || f.departure <= f.arrival) e.push({ field: "dates", code: "badDates" });
  else if (f.arrival < ctx.today) e.push({ field: "dates", code: "past" });
  else if (ctx.unit) {
    const status = aptStatus(ctx.bookings, ctx.unit.id, ctx.unit.count, f);
    if (status.every((a) => a.busy)) {
      const c = status[0].busy!;
      e.push({ field: "dates", code: "taken", guest: c.guest, from: c.arrival, to: c.departure });
    }
  }
  if (!(f.adults >= 1)) e.push({ field: "adults", code: "noGuests" });
  else if (ctx.unit && f.adults + Math.max(0, f.children) > ctx.unit.maxGuests) e.push({ field: "adults", code: "tooMany", max: ctx.unit.maxGuests });
  if (f.guestMode === "new") {
    if (!f.guestName.trim()) e.push({ field: "gname", code: "noName" });
    if (!validMobile(f.guestPhone)) e.push({ field: "gphone", code: "badPhone" });
  } else if (!f.guestId) e.push({ field: "gid", code: "noGuest" });
  if (f.rate !== null && !(f.rate > 0)) e.push({ field: "rate", code: "badRate" });
  if (f.deposit < 0 || (ctx.total > 0 && f.deposit > ctx.total)) e.push({ field: "dep", code: "badDeposit" });
  return e;
}

// Nightly prices of a direct booking: the price the broker typed, or each
// night's calendar price. Cleaning isn't added to direct bookings.
export function directNightly(nights: { d: string; p: number }[], rate: number | null): { d: string; p: number }[] {
  return nights.map((n) => ({ d: n.d, p: rate !== null && rate > 0 ? rate : n.p }));
}

export type PaymentError = { code: "zero" } | { code: "over"; due: number } | { code: "date" };

export function checkPayment(amount: number, due: number, date: string): PaymentError | null {
  if (!(amount > 0)) return { code: "zero" };
  if (amount > due + 0.001) return { code: "over", due };
  if (!isIso(date)) return { code: "date" };
  return null;
}

export function checkRefund(refund: number, paid: number): boolean {
  return refund >= 0 && refund <= paid + 0.001;
}

// Direct bookings are cancelled here; platform bookings on the platform.
export function canCancel(b: { platform: string; cancelled: boolean; stage: Stage }): boolean {
  return b.platform === DIRECT && !b.cancelled && b.stage !== "past";
}

// Booking.com no-show: from the check-in day (up to 48 hours later on the
// platform's side). Invalid card: at any time before the stay ends.
export function canReportNoShow(b: { arrival: string }, today: string): boolean {
  return today >= b.arrival && dayDiff(b.arrival, today) <= 2;
}

export function canReport(b: { platform: string; cancelled: boolean; stage: Stage }): boolean {
  return b.platform === "bdc" && !b.cancelled && b.stage !== "past";
}

// Airbnb decline reasons as the connection partner names them.
export function declineReasonCode(r: DeclineReason): string {
  return r === "dates" ? "dates_not_available" : r === "fit" ? "not_a_good_fit" : "not_comfortable";
}

export function hoursLeft(expiresAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 3_600_000));
}

// ---------------------------------------------------------------------------
// Export (CSV opens in Excel; the BOM keeps Arabic readable there)

export function csvCell(v: string | number): string {
  const s = String(v);
  // Cells that start with = + - @ would run as formulas in Excel.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// What the connection partner sends in a booking revision, beyond the dates

export type RevisionDetails = {
  adults: number;
  children: number;
  nightly: { d: string; p: number }[];
  cleaning: number;
  tax: number;
  total: number;
  commission: number;
  currency: string;
  collect: "ota" | "property";
  arrivalTime: string;
  notes: string;
  name: string;
  phone: string;
  email: string;
  country: string;
};

const numOf = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const strOf = (v: unknown, max = 500): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseRevisionDetails(a: Record<string, unknown>): RevisionDetails {
  const rooms = (Array.isArray(a.rooms) ? a.rooms : []) as Record<string, unknown>[];
  const room = rooms[0] ?? {};
  const occ = (room.occupancy ?? {}) as Record<string, unknown>;
  const nights = new Map<string, number>();
  for (const r of rooms) {
    const days = r.days && typeof r.days === "object" ? (r.days as Record<string, unknown>) : {};
    for (const [d, p] of Object.entries(days)) if (isIso(d)) nights.set(d, round2((nights.get(d) ?? 0) + numOf(p)));
  }
  let cleaning = 0;
  let tax = 0;
  for (const r of rooms)
    for (const t of (Array.isArray(r.taxes) ? r.taxes : []) as Record<string, unknown>[]) {
      const amount = numOf(t.total_price);
      const name = strOf(t.name).toLowerCase();
      if (/clean/.test(name)) cleaning += amount;
      else if (t.type === "tax" || /vat|tax/.test(name)) tax += amount;
      else if (t.type === "fee") cleaning += amount;
    }
  const customer = (a.customer ?? {}) as Record<string, unknown>;
  const nightly = [...nights.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([d, p]) => ({ d, p }));
  const nightsSum = nightly.reduce((s, n) => s + n.p, 0);
  const total = numOf(a.amount) || round2(nightsSum + cleaning + tax);
  return {
    adults: Math.max(1, Math.round(numOf(occ.adults)) || 1),
    children: Math.max(0, Math.round(numOf(occ.children))),
    nightly,
    cleaning: round2(cleaning),
    tax: round2(tax),
    total: round2(total),
    commission: round2(numOf(a.ota_commission)),
    currency: strOf(a.currency, 3).toUpperCase() || "EGP",
    collect: a.payment_collect === "ota" ? "ota" : "property",
    arrivalTime: /^\d{1,2}:\d{2}$/.test(strOf(a.arrival_hour)) ? strOf(a.arrival_hour) : "",
    notes: strOf(a.notes, 2000),
    name: [strOf(customer.name, 80), strOf(customer.surname, 80)].filter(Boolean).join(" "),
    phone: strOf(customer.phone, 40),
    email: strOf(customer.mail, 200),
    country: /^[A-Za-z]{2}$/.test(strOf(customer.country)) ? strOf(customer.country).toUpperCase() : "",
  };
}

// An Airbnb request to book or inquiry from the live feed.
export type LiveRequest = {
  id: string;
  kind: "req" | "inq";
  propertyId: string;
  roomTypeId: string | null;
  guest: string;
  country: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  total: number;
  payout: number;
  currency: string;
  message: string;
  expiresAt: Date;
  resolved: boolean;
};

export function parseLiveRequest(raw: unknown, now = new Date()): LiveRequest | null {
  const r = raw as { id?: unknown; attributes?: Record<string, unknown> } | null;
  const a = r?.attributes;
  if (!a || typeof r?.id !== "string") return null;
  const event = a.event;
  if (event !== "reservation_request" && event !== "inquiry") return null;
  const p = (a.payload ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => keys.map((k) => p[k]).find((v) => v !== undefined && v !== null);
  const arrival = strOf(pick("checkin_date", "arrival_date", "start_date"), 10);
  const departure = strOf(pick("checkout_date", "departure_date", "end_date"), 10);
  if (!isIso(arrival) || !isIso(departure) || departure <= arrival) return null;
  const guestObj = (pick("guest", "customer") ?? {}) as Record<string, unknown>;
  const inserted = Date.parse(strOf(a.inserted_at, 40));
  const expires = Date.parse(strOf(pick("expires_at", "expiration_date"), 40));
  return {
    id: r.id,
    kind: event === "inquiry" ? "inq" : "req",
    propertyId: strOf(a.property_id ?? p.property_id, 60),
    roomTypeId: strOf(pick("room_type_id"), 60) || null,
    guest: strOf(pick("guest_name")) || [strOf(guestObj.first_name ?? guestObj.name, 80), strOf(guestObj.last_name ?? guestObj.surname, 80)].filter(Boolean).join(" "),
    country: strOf(guestObj.country, 2).toUpperCase(),
    arrival,
    departure,
    adults: Math.max(1, Math.round(numOf(pick("number_of_adults", "adults"))) || 1),
    children: Math.max(0, Math.round(numOf(pick("number_of_children", "children")))),
    total: round2(numOf(pick("total_price", "amount", "expected_payout_amount"))),
    payout: round2(numOf(pick("expected_payout_amount", "payout", "total_price"))),
    currency: strOf(pick("currency"), 3).toUpperCase() || "EGP",
    message: strOf(pick("message", "last_message"), 2000),
    expiresAt: Number.isFinite(expires) ? new Date(expires) : new Date((Number.isFinite(inserted) ? inserted : now.getTime()) + 24 * 3_600_000),
    resolved: p.resolved === true,
  };
}
