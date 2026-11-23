// The Bookings and Guests pages' data (design App_Bookings, version 87):
// reading a broker's bookings, Airbnb requests and guest profiles, and every
// change the pages make. Server only. Every function takes the broker
// company's id and only touches that company's rows; ids from another
// company are treated as not found.

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { calendarAri, calendarToday, nightPrices } from "./calendar-data";
import { pushAvailability } from "./channex-ari";
import { channexConfigured } from "./channex";
import { platformById, initials } from "./channel-catalog";
import type { Revision } from "./channel-rules";
import {
  DIRECT,
  aptStatus,
  canCancel,
  canEdit,
  canMove,
  canReport,
  checkDirect,
  checkEdit,
  checkPayment,
  checkRefund,
  clashWith,
  directNightly,
  dueOf,
  editChanges,
  editRanges,
  emailKindOf,
  firstFreeApt,
  matchGuest,
  paidOf,
  payStateOf,
  phoneKey,
  reportError,
  round2,
  stageOf,
  type DeclineReason,
  type DirectError,
  type DirectInput,
  type EditError,
  type EditInput,
  type Report,
  type ReportError,
  type Slot,
  type DocType,
  type Method,
  type PayState,
  type Source,
  type Stage,
} from "./booking-rules";
import * as bx from "./booking-channex";

export type BookingEventView = { kind: string; params: Record<string, string | number>; by: string; at: string };
export type PaymentView = { kind: string; amount: number; method: string; date: string };

export type BookingView = {
  id: string;
  code: string;
  platform: string; // catalog id, "direct" or ""
  platformName: string;
  color: string;
  ini: string;
  propertyId: string | null;
  propertyName: string;
  unitTypeId: string | null;
  unitName: string;
  link: "whole" | "room" | null;
  count: number;
  maxGuests: number;
  apt: number;
  split: { at: string; apt: number } | null;
  rate: number | null;
  cardReportedAt: string | null;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  status: "conf" | "pend" | "canc";
  stage: Stage;
  changed: { from: string; to: string; at: string } | null;
  cancel: { at: string; by: string; fee: number } | null;
  collect: string;
  nightly: { d: string; p: number }[];
  cleaning: number;
  tax: number;
  total: number;
  commission: number;
  currency: string;
  paid: number;
  payState: PayState;
  payments: PaymentView[];
  arrivalTime: string;
  guestRequest: string;
  teamNote: string;
  source: string;
  guestId: string | null;
  guestName: string;
  bookedAt: string;
  onPartner: boolean;
  events: BookingEventView[];
};

export type RequestView = {
  id: string;
  kind: "req" | "inq" | "alt";
  // A change request: the booking it changes.
  bookingId: string | null;
  guest: string;
  country: string;
  propertyName: string;
  unitName: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  total: number;
  payout: number;
  currency: string;
  message: string;
  expiresAt: string;
};

export type GuestView = {
  id: string;
  name: string;
  deleted: boolean;
  phone: string;
  email: string;
  emailKind: string;
  country: string;
  vip: boolean;
  blocked: boolean;
  blockReason: string;
  docType: string;
  docNumber: string;
  note: string;
  dupOf: string | null;
};

export type UnitOption = { id: string; propertyId: string; name: string; count: number; maxGuests: number; currency: string; link: "whole" | "room" | null };

export type BookingsData = {
  today: string;
  bookings: BookingView[];
  requests: RequestView[];
  guests: GuestView[];
  properties: { id: string; name: string }[];
  units: UnitOption[];
  platforms: { id: string; name: string }[];
};

const bookingInclude = {
  payments: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
  guestProfile: true,
} satisfies Prisma.ChannelBookingInclude;

type BookingRow = Prisma.ChannelBookingGetPayload<{ include: typeof bookingInclude }>;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const n = (d: Prisma.Decimal | null | undefined) => (d === null || d === undefined ? 0 : Number(d));

function platformInfo(id: string, directName: string) {
  if (id === DIRECT) return { name: directName, color: "#639922", ini: directName.charAt(0) };
  const p = platformById(id);
  return p ? { name: p.name, color: p.color, ini: initials(p.name) } : { name: "-", color: "#6B7280", ini: "?" };
}

function nightlyOf(raw: Prisma.JsonValue): { d: string; p: number }[] {
  return (Array.isArray(raw) ? raw : [])
    .map((x) => x as { d?: unknown; p?: unknown })
    .filter((x) => typeof x.d === "string" && typeof x.p === "number")
    .map((x) => ({ d: x.d as string, p: x.p as number }));
}

function paramsOf(raw: Prisma.JsonValue): Record<string, string | number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string" || typeof v === "number")) as Record<string, string | number>;
}

type UnitInfo = { name: string; count: number; maxGuests: number; propertyName: string; propertyId: string; link: "whole" | "room" | null };

function toView(b: BookingRow, today: string, units: Map<string, UnitInfo>, props: Map<string, string>, directName: string, deletedName: string): BookingView {
  const pl = platformInfo(b.platform, directName);
  const unit = b.unitTypeId ? units.get(b.unitTypeId) : undefined;
  const cancelled = b.status === "cancelled";
  const payments = b.payments.map((p) => ({ kind: p.kind, amount: n(p.amount), method: p.method, date: iso(p.paidOn) }));
  const paid = paidOf(payments);
  const total = n(b.total);
  const g = b.guestProfile;
  const arrival = iso(b.arrival);
  const departure = iso(b.departure);
  return {
    id: b.id,
    code: b.code,
    platform: b.platform,
    platformName: pl.name,
    color: pl.color,
    ini: pl.ini,
    propertyId: b.propertyId,
    propertyName: (b.propertyId && props.get(b.propertyId)) || unit?.propertyName || "-",
    unitTypeId: b.unitTypeId,
    unitName: unit?.name ?? "-",
    link: unit?.link ?? null,
    count: unit?.count ?? 1,
    maxGuests: unit?.maxGuests ?? 0,
    apt: b.apt,
    split: b.splitAt && b.splitApt ? { at: iso(b.splitAt), apt: b.splitApt } : null,
    rate: b.rate === null ? null : n(b.rate),
    cardReportedAt: b.cardReportedAt ? b.cardReportedAt.toISOString() : null,
    arrival,
    departure,
    adults: b.adults,
    children: b.children,
    status: cancelled ? "canc" : b.pending ? "pend" : "conf",
    stage: stageOf({ arrival, departure, cancelled }, today),
    changed: b.changedAt && b.prevArrival && b.prevDeparture ? { from: iso(b.prevArrival), to: iso(b.prevDeparture), at: iso(b.changedAt) } : null,
    cancel: cancelled ? { at: iso(b.cancelledAt ?? b.updatedAt), by: b.cancelledBy ?? "guest", fee: n(b.cancelFee) } : null,
    collect: b.collect,
    nightly: nightlyOf(b.nightly),
    cleaning: n(b.cleaning),
    tax: n(b.tax),
    total,
    commission: n(b.commission),
    currency: b.currency,
    paid,
    payState: payStateOf({ collect: b.collect, cancelled, total, paid }),
    payments,
    arrivalTime: b.arrivalTime,
    guestRequest: b.guestRequest,
    teamNote: b.teamNote,
    source: b.source,
    guestId: g && !g.mergedIntoId ? g.id : (g?.mergedIntoId ?? null),
    guestName: g?.deletedAt ? deletedName : g?.name || b.guest || "-",
    bookedAt: iso(b.bookedAt),
    onPartner: Boolean(b.channexBookingId),
    events: b.events.map((e) => ({ kind: e.kind, params: paramsOf(e.params), by: e.byName, at: iso(e.createdAt) })),
  };
}

async function unitMap(brokerId: string) {
  const props = await prisma.property.findMany({
    where: { brokerId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nickname: true,
      archivedAt: true,
      currency: true,
      rentMode: true,
      unitTypes: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, count: true, adults: true, children: true, kind: true } },
    },
  });
  const units = new Map<string, UnitInfo>();
  const options: UnitOption[] = [];
  for (const p of props)
    for (const u of p.unitTypes) {
      const link = p.rentMode === "BOTH" ? (u.kind === "WHOLE" ? "whole" : "room") : null;
      const info = { name: u.name, count: Math.max(1, u.count), maxGuests: Math.max(1, u.adults + u.children), propertyName: p.nickname, propertyId: p.id, link } as UnitInfo;
      units.set(u.id, info);
      if (!p.archivedAt) options.push({ id: u.id, propertyId: p.id, name: u.name, count: info.count, maxGuests: info.maxGuests, currency: p.currency, link });
    }
  return { props, units, options };
}

export async function loadBookings(brokerId: string, names: { direct: string; deleted: string }): Promise<BookingsData> {
  const today = calendarToday();
  const [{ props, units, options }, rows, reqs, guests] = await Promise.all([
    unitMap(brokerId),
    prisma.channelBooking.findMany({ where: { brokerId }, include: bookingInclude, orderBy: { arrival: "asc" } }),
    prisma.bookingRequest.findMany({ where: { brokerId, status: "open", expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "asc" } }),
    prisma.guest.findMany({ where: { brokerId, mergedIntoId: null }, orderBy: { createdAt: "asc" } }),
  ]);
  const propNames = new Map(props.map((p) => [p.id, p.nickname]));
  const bookings = rows.map((b) => toView(b, today, units, propNames, names.direct, names.deleted));
  const keys = new Map<string, string[]>();
  for (const g of guests) if (!g.deletedAt && g.phoneKey.length >= 8) keys.set(g.phoneKey, [...(keys.get(g.phoneKey) ?? []), g.id]);
  const used = new Set(bookings.map((b) => b.platform).filter((p) => p && p !== DIRECT));
  return {
    today,
    bookings,
    requests: reqs.map((r) => {
      const u = r.unitTypeId ? units.get(r.unitTypeId) : undefined;
      return {
        id: r.id,
        kind: r.kind === "inq" ? "inq" : r.kind === "alt" ? "alt" : "req",
        bookingId: r.bookingId,
        guest: r.guestName || "-",
        country: r.country,
        propertyName: (r.propertyId && propNames.get(r.propertyId)) || u?.propertyName || "-",
        unitName: u?.name ?? "",
        arrival: iso(r.arrival),
        departure: iso(r.departure),
        adults: r.adults,
        children: r.children,
        total: n(r.total),
        payout: n(r.payout),
        currency: r.currency,
        message: r.message,
        expiresAt: r.expiresAt.toISOString(),
      };
    }),
    guests: guests.map((g) => ({
      id: g.id,
      name: g.deletedAt ? names.deleted : g.name,
      deleted: Boolean(g.deletedAt),
      phone: g.phone,
      email: g.email,
      emailKind: g.emailKind,
      country: g.country,
      vip: g.vip,
      blocked: g.blocked,
      blockReason: g.blockReason,
      docType: g.docType,
      docNumber: g.docNumber,
      note: g.note,
      dupOf: g.deletedAt ? null : ((keys.get(g.phoneKey) ?? []).find((id) => id !== g.id) ?? null),
    })),
    properties: props.filter((p) => !p.archivedAt).map((p) => ({ id: p.id, name: p.nickname })),
    units: options,
    platforms: [...used].map((id) => ({ id, name: platformById(id)?.name ?? id })).concat([{ id: DIRECT, name: names.direct }]),
  };
}

// ---------------------------------------------------------------------------
// Helpers

async function ownBooking(brokerId: string, id: string) {
  return prisma.channelBooking.findFirst({ where: { id, brokerId }, include: bookingInclude });
}

async function ownGuest(brokerId: string, id: string) {
  return prisma.guest.findFirst({ where: { id, brokerId, mergedIntoId: null } });
}

function event(bookingId: string, kind: string, params: Record<string, string | number> = {}, byName = "") {
  return prisma.bookingEvent.create({ data: { bookingId, kind, params, byName } });
}

// Send the property's availability again for these nights, so every platform
// shows what Omnirent knows (direct bookings count as booked nights).
async function pushNights(propertyId: string | null, from: string, to: string): Promise<void> {
  if (!propertyId || !channexConfigured() || to <= from) return;
  try {
    const ari = await calendarAri(propertyId, from, to);
    await pushAvailability(ari.availability);
  } catch {
    // The calendar's next send or the platforms' own sync catches up.
  }
}

const viewOf = (row: { arrival: Date; departure: Date; status: string }, today: string) => ({
  arrival: iso(row.arrival),
  departure: iso(row.departure),
  cancelled: row.status === "cancelled",
  stage: stageOf({ arrival: iso(row.arrival), departure: iso(row.departure), cancelled: row.status === "cancelled" }, today),
});

// Every live booking of the property's unit types, as slots for the clash
// rules (identical apartments, linked whole apartment and rooms, split stays).
async function propertySlots(brokerId: string, propertyId: string, excludeId: string) {
  const prop = await prisma.property.findFirst({ where: { id: propertyId, brokerId }, select: { rentMode: true, unitTypes: { select: { id: true, kind: true } } } });
  const linkOf = new Map<string, "whole" | "room" | null>((prop?.unitTypes ?? []).map((u) => [u.id, prop!.rentMode === "BOTH" ? (u.kind === "WHOLE" ? "whole" : "room") : null]));
  const rows = await prisma.channelBooking.findMany({
    where: { brokerId, unitTypeId: { in: [...linkOf.keys()] }, status: { not: "cancelled" }, id: { not: excludeId } },
    include: { guestProfile: { select: { name: true } } },
  });
  const slots: (Slot & { guest: string })[] = rows.map((x) => ({
    id: x.id,
    unitTypeId: x.unitTypeId,
    apt: x.apt,
    arrival: iso(x.arrival),
    departure: iso(x.departure),
    cancelled: false,
    propertyId,
    link: x.unitTypeId ? (linkOf.get(x.unitTypeId) ?? null) : null,
    splitAt: x.splitAt ? iso(x.splitAt) : null,
    splitApt: x.splitApt,
    guest: x.guestProfile?.name || x.guest,
  }));
  return { linkOf, slots };
}

// ---------------------------------------------------------------------------
// Direct bookings

export type DirectFields = DirectInput & { source: Source; status: "pend" | "conf"; depositMethod: Method; note: string };

export async function createDirect(
  brokerId: string,
  byName: string,
  f: DirectFields,
): Promise<{ ok: true; id: string; code: string } | { ok: false; errors: DirectError[] }> {
  const today = calendarToday();
  const unit = await prisma.unitType.findFirst({
    where: { id: f.unitTypeId, property: { brokerId, archivedAt: null } },
    include: { property: { select: { id: true, channexId: true, currency: true } }, rates: { where: { parentId: null }, select: { channexId: true }, take: 1 } },
  });
  const unitCtx = unit ? { id: unit.id, count: Math.max(1, unit.count), maxGuests: Math.max(1, unit.adults + unit.children) } : null;
  const existing = unit
    ? await prisma.channelBooking.findMany({
        where: { brokerId, unitTypeId: unit.id, status: { not: "cancelled" }, departure: { gt: new Date(f.arrival || today) } },
        include: { guestProfile: { select: { name: true } } },
      })
    : [];
  const slots = existing.map((b) => ({ id: b.id, unitTypeId: b.unitTypeId, apt: b.apt, arrival: iso(b.arrival), departure: iso(b.departure), cancelled: false, guest: b.guestProfile?.name || b.guest }));
  const prices = unit && f.departure > f.arrival ? await nightPrices(unit.id, f.arrival, f.departure) : [];
  const nightly = directNightly(prices, f.rate);
  const total = round2(nightly.reduce((s, x) => s + x.p, 0));
  const guest = f.guestMode === "old" && f.guestId ? await ownGuest(brokerId, f.guestId) : null;
  const errors = checkDirect({ ...f, guestId: guest ? guest.id : "" }, { today, unit: unitCtx, bookings: slots, total });
  if (errors.length || !unit) return { ok: false, errors };

  const apt = firstFreeApt(slots, unit.id, unitCtx!.count, f) ?? 1;
  const deposit = round2(Math.max(0, f.deposit));
  const pending = f.status === "pend" && deposit <= 0;

  const made = await prisma.$transaction(async (tx) => {
    const seq = (await tx.channelBooking.count({ where: { brokerId, platform: DIRECT } })) + 1001;
    const code = `OM-${seq}`;
    const g =
      guest ??
      (await tx.guest.create({
        data: { brokerId, name: f.guestName.trim().slice(0, 120), phone: f.guestPhone.trim().slice(0, 40), phoneKey: phoneKey(f.guestPhone), country: "EG" },
      }));
    const b = await tx.channelBooking.create({
      data: {
        brokerId,
        platform: DIRECT,
        propertyId: unit.property.id,
        unitTypeId: unit.id,
        code,
        guest: g.name,
        guestId: g.id,
        arrival: new Date(f.arrival),
        departure: new Date(f.departure),
        status: "new",
        adults: f.adults,
        children: Math.max(0, f.children),
        apt,
        pending,
        source: f.source,
        currency: unit.property.currency,
        nightly,
        total,
        collect: "property",
        teamNote: f.note.slice(0, 2000),
      },
    });
    await tx.bookingEvent.create({ data: { bookingId: b.id, kind: "created", params: { s: f.source }, byName } });
    if (deposit > 0) {
      await tx.bookingPayment.create({ data: { bookingId: b.id, amount: deposit, method: f.depositMethod, paidOn: new Date(today), byName } });
      await tx.bookingEvent.create({ data: { bookingId: b.id, kind: "payment", params: { a: deposit, m: f.depositMethod }, byName } });
      if (f.status === "pend") await tx.bookingEvent.create({ data: { bookingId: b.id, kind: "autoConfirmed", byName } });
    }
    return { b, g, code };
  });

  // Record it with the connection partner too, and close the nights everywhere.
  if (unit.property.channexId && unit.channexId) {
    const id = await bx.createCrsBooking({
      propertyId: unit.property.channexId,
      roomTypeId: unit.channexId,
      ratePlanId: unit.rates[0]?.channexId ?? null,
      code: made.code,
      arrival: f.arrival,
      departure: f.departure,
      arrivalTime: "",
      currency: unit.property.currency,
      nightly,
      adults: f.adults,
      children: Math.max(0, f.children),
      name: made.g.name,
      phone: made.g.phone,
      note: "",
    });
    if (id) await prisma.channelBooking.update({ where: { id: made.b.id }, data: { channexBookingId: id } }).catch(() => undefined);
  }
  await pushNights(unit.property.id, f.arrival, f.departure);
  return { ok: true, id: made.b.id, code: made.code };
}

// Edit a direct booking (design v88): dates, apartment, guests, price per
// night, split stay. The new nights close and the old ones reopen on every
// platform; the partner gets the booking as modified.
export async function editDirect(
  brokerId: string,
  byName: string,
  id: string,
  f: EditInput,
): Promise<{ ok: true } | { ok: false; errors: EditError[] } | { ok: false; error: ActionError }> {
  const today = calendarToday();
  const b = await ownBooking(brokerId, id);
  if (!b || !b.unitTypeId || !b.propertyId) return { ok: false, error: "notFound" };
  if (!canEdit({ platform: b.platform, ...viewOf(b, today) })) return { ok: false, error: "notAllowed" };
  const unit = await prisma.unitType.findFirst({
    where: { id: f.unitTypeId, propertyId: b.propertyId, property: { brokerId } },
    include: { property: { select: { id: true, channexId: true, currency: true, rentMode: true } }, rates: { where: { parentId: null }, select: { channexId: true }, take: 1 } },
  });
  if (!unit) return { ok: false, error: "notAllowed" };
  const count = Math.max(1, unit.count);
  if (!Number.isInteger(f.apt) || f.apt < 1 || f.apt > count) return { ok: false, error: "notAllowed" };
  const { slots } = await propertySlots(brokerId, b.propertyId, b.id);
  const orig: EditInput = {
    unitTypeId: b.unitTypeId,
    apt: b.apt,
    arrival: iso(b.arrival),
    departure: iso(b.departure),
    adults: b.adults,
    children: b.children,
    rate: b.rate === null ? null : n(b.rate),
    split: b.splitAt && b.splitApt ? { at: iso(b.splitAt), apt: b.splitApt } : null,
  };
  const link = unit.property.rentMode === "BOTH" ? (unit.kind === "WHOLE" ? "whole" : "room") : null;
  const split = count > 1 ? f.split : null;
  const input = { ...f, split };
  const errors = checkEdit(input, { id: b.id, today, orig, unit: { id: unit.id, count, maxGuests: Math.max(1, unit.adults + unit.children), propertyId: b.propertyId, link }, bookings: slots });
  if (errors.length) return { ok: false, errors };

  const changes = editChanges(input, orig);
  const repriced = changes.includes("dates") || changes.includes("rate") || input.unitTypeId !== orig.unitTypeId;
  const nightly = repriced ? directNightly(await nightPrices(unit.id, input.arrival, input.departure), input.rate) : nightlyOf(b.nightly);
  const total = repriced ? round2(nightly.reduce((a, x) => a + x.p, 0)) : n(b.total);
  const unitName = count > 1 ? `${unit.name} · ${input.apt}` : unit.name;
  await prisma.$transaction([
    prisma.channelBooking.update({
      where: { id: b.id },
      data: {
        unitTypeId: unit.id,
        apt: input.apt,
        arrival: new Date(input.arrival),
        departure: new Date(input.departure),
        adults: input.adults,
        children: Math.max(0, input.children),
        rate: input.rate,
        splitAt: split ? new Date(split.at) : null,
        splitApt: split ? split.apt : null,
        nightly,
        total,
      },
    }),
    ...changes.map((c) =>
      c === "dates"
        ? event(b.id, "editDates", { a: orig.arrival, b: orig.departure, c: input.arrival, d: input.departure }, byName)
        : c === "apt"
          ? event(b.id, "editApt", { u: unitName }, byName)
          : c === "guests"
            ? event(b.id, "editGuests", { a: input.adults, c: Math.max(0, input.children) }, byName)
            : c === "rate"
              ? event(b.id, "editRate", { p: input.rate ?? 0 }, byName)
              : split
                ? event(b.id, "split", { d: split.at, a: split.apt }, byName)
                : event(b.id, "unsplit", {}, byName),
    ),
  ]);

  if (b.channexBookingId && unit.channexId && unit.property.channexId) {
    await bx.modifyCrsBooking(b.channexBookingId, {
      propertyId: unit.property.channexId,
      roomTypeId: unit.channexId,
      ratePlanId: unit.rates[0]?.channexId ?? null,
      code: b.code,
      arrival: input.arrival,
      departure: input.departure,
      arrivalTime: b.arrivalTime,
      currency: b.currency,
      nightly,
      adults: input.adults,
      children: Math.max(0, input.children),
      name: b.guestProfile?.name || b.guest,
      phone: b.guestProfile?.phone ?? "",
      note: "",
    });
  }
  for (const r of editRanges(input, orig)) await pushNights(b.propertyId, r.from, r.to);
  return { ok: true };
}

export type ActionError = "notFound" | "notAllowed" | PaymentErrorCode | "refund" | "noFree" | "platform" | "clash" | ReportError;
type PaymentErrorCode = "zero" | "over" | "date";

export async function recordPayment(brokerId: string, byName: string, id: string, amount: number, method: Method, date: string): Promise<{ ok: true; confirmed: boolean } | { ok: false; error: ActionError; due?: number }> {
  const b = await ownBooking(brokerId, id);
  if (!b) return { ok: false, error: "notFound" };
  if (b.collect !== "property" || b.status === "cancelled") return { ok: false, error: "notAllowed" };
  const paid = paidOf(b.payments.map((p) => ({ kind: p.kind, amount: n(p.amount) })));
  const due = dueOf({ total: n(b.total), paid });
  const err = checkPayment(amount, due, date);
  if (err) return { ok: false, error: err.code, due };
  const amt = round2(amount);
  const confirmed = b.pending;
  await prisma.$transaction([
    prisma.bookingPayment.create({ data: { bookingId: b.id, amount: amt, method, paidOn: new Date(date), byName } }),
    prisma.bookingEvent.create({ data: { bookingId: b.id, kind: "payment", params: { a: amt, m: method }, byName } }),
    ...(confirmed
      ? [prisma.channelBooking.update({ where: { id: b.id }, data: { pending: false } }), prisma.bookingEvent.create({ data: { bookingId: b.id, kind: "autoConfirmed", byName } })]
      : []),
  ]);
  return { ok: true, confirmed };
}

export async function confirmBooking(brokerId: string, byName: string, id: string): Promise<{ ok: boolean; error?: ActionError }> {
  const b = await ownBooking(brokerId, id);
  if (!b) return { ok: false, error: "notFound" };
  if (!b.pending || b.status === "cancelled") return { ok: false, error: "notAllowed" };
  await prisma.$transaction([prisma.channelBooking.update({ where: { id }, data: { pending: false } }), event(id, "confirmed", {}, byName)]);
  return { ok: true };
}

export async function moveBooking(brokerId: string, byName: string, id: string, apt: number): Promise<{ ok: boolean; error?: ActionError }> {
  const today = calendarToday();
  const b = await ownBooking(brokerId, id);
  if (!b || !b.unitTypeId) return { ok: false, error: "notFound" };
  const unit = await prisma.unitType.findUnique({ where: { id: b.unitTypeId }, select: { count: true } });
  const count = Math.max(1, unit?.count ?? 1);
  if (!canMove(viewOf(b, today), count) || !Number.isInteger(apt) || apt < 1 || apt > count || apt === b.apt) return { ok: false, error: "notAllowed" };
  const others = await prisma.channelBooking.findMany({ where: { brokerId, unitTypeId: b.unitTypeId, status: { not: "cancelled" }, id: { not: b.id } } });
  const status = aptStatus(
    others.map((x) => ({ id: x.id, unitTypeId: x.unitTypeId, apt: x.apt, arrival: iso(x.arrival), departure: iso(x.departure), cancelled: false })),
    b.unitTypeId,
    count,
    { arrival: iso(b.arrival), departure: iso(b.departure) },
  );
  if (status.find((s) => s.apt === apt)?.busy) return { ok: false, error: "noFree" };
  await prisma.$transaction([prisma.channelBooking.update({ where: { id }, data: { apt } }), event(id, "moved", { a: b.apt, b: apt }, byName)]);
  return { ok: true };
}

export async function cancelDirect(brokerId: string, byName: string, id: string, refund: number, method: Method, wa = false): Promise<{ ok: boolean; error?: ActionError }> {
  const today = calendarToday();
  const b = await ownBooking(brokerId, id);
  if (!b) return { ok: false, error: "notFound" };
  if (!canCancel({ platform: b.platform, ...viewOf(b, today) })) return { ok: false, error: "notAllowed" };
  const paid = paidOf(b.payments.map((p) => ({ kind: p.kind, amount: n(p.amount) })));
  if (!checkRefund(refund, paid)) return { ok: false, error: "refund" };
  const r = round2(refund);
  await prisma.$transaction([
    prisma.channelBooking.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date(), cancelledBy: "broker", pending: false } }),
    ...(r > 0
      ? [
          prisma.bookingPayment.create({ data: { bookingId: id, kind: "refund", amount: r, method, paidOn: new Date(today), byName } }),
          event(id, "refund", { a: r, m: method }, byName),
        ]
      : []),
    event(id, "cancelledBy", {}, byName),
    ...(wa ? [event(id, "waCancel", {}, byName)] : []),
  ]);
  if (b.channexBookingId && b.unitTypeId) {
    const unit = await prisma.unitType.findUnique({ where: { id: b.unitTypeId }, include: { property: { select: { channexId: true } } } });
    if (unit?.channexId && unit.property.channexId)
      await bx.cancelCrsBooking(b.channexBookingId, {
        propertyId: unit.property.channexId,
        roomTypeId: unit.channexId,
        ratePlanId: null,
        code: b.code,
        arrival: iso(b.arrival),
        departure: iso(b.departure),
        arrivalTime: "",
        currency: b.currency,
        nightly: nightlyOf(b.nightly),
        adults: b.adults,
        children: b.children,
        name: b.guest,
        phone: "",
        note: "",
      });
  }
  await pushNights(b.propertyId, iso(b.arrival), iso(b.departure));
  return { ok: true };
}

export async function reportToBdc(
  brokerId: string,
  byName: string,
  id: string,
  what: Report,
): Promise<{ ok: boolean; error?: ActionError }> {
  const today = calendarToday();
  const b = await ownBooking(brokerId, id);
  if (!b) return { ok: false, error: "notFound" };
  const v = viewOf(b, today);
  if (!canReport({ platform: b.platform, ...v })) return { ok: false, error: "notAllowed" };
  const err = reportError(what, { arrival: v.arrival, stage: v.stage, cardReportedAt: b.cardReportedAt ? b.cardReportedAt.toISOString() : null }, today);
  if (err) return { ok: false, error: err };
  if (!b.channexBookingId) return { ok: false, error: "platform" };
  try {
    if (what === "noshow" || what === "noshoww") await bx.reportNoShow(b.channexBookingId, what === "noshoww");
    else if (what === "card") await bx.reportInvalidCard(b.channexBookingId);
    else if (what === "cardc") await bx.cancelDueInvalidCard(b.channexBookingId);
    else return { ok: false, error: "notAllowed" };
  } catch {
    return { ok: false, error: "platform" };
  }
  if (what === "card") {
    await prisma.$transaction([prisma.channelBooking.update({ where: { id }, data: { cardReportedAt: new Date() } }), event(id, "card", {}, byName)]);
  } else if (what === "cardc") {
    await prisma.$transaction([
      prisma.channelBooking.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date(), cancelledBy: "card", pending: false } }),
      event(id, "cardCancelled", {}, byName),
    ]);
    await pushNights(b.propertyId, v.arrival, v.departure);
  } else await event(id, what === "noshoww" ? "noShowWaived" : "noShow", {}, byName);
  return { ok: true };
}

export async function saveBookingNote(brokerId: string, id: string, note: string): Promise<boolean> {
  const r = await prisma.channelBooking.updateMany({ where: { id, brokerId }, data: { teamNote: note.slice(0, 2000) } });
  return r.count === 1;
}

// ---------------------------------------------------------------------------
// Airbnb requests

export type RequestAnswer = { kind: "accept" } | { kind: "preapprove" } | { kind: "offer"; total: number } | { kind: "decline"; reason: DeclineReason } | { kind: "declineChange" };

export async function answerRequest(brokerId: string, byName: string, id: string, answer: RequestAnswer): Promise<{ ok: boolean; error?: ActionError; guest?: string }> {
  const r = await prisma.bookingRequest.findFirst({ where: { id, brokerId, status: "open" } });
  if (!r || r.expiresAt <= new Date()) return { ok: false, error: "notFound" };
  const kind = r.kind === "inq" ? "inq" : r.kind === "alt" ? "alt" : "req";
  const fits =
    kind === "alt"
      ? answer.kind === "accept" || answer.kind === "declineChange"
      : kind === "req"
        ? answer.kind === "accept" || answer.kind === "decline"
        : answer.kind === "preapprove" || answer.kind === "offer" || answer.kind === "decline";
  if (!fits) return { ok: false, error: "notAllowed" };

  // A change request is accepted only when the new dates are free, linked
  // whole apartment and rooms included.
  const booking = kind === "alt" && r.bookingId ? await ownBooking(brokerId, r.bookingId) : null;
  if (kind === "alt" && (!booking || booking.status === "cancelled")) return { ok: false, error: "notFound" };
  if (kind === "alt" && answer.kind === "accept" && booking?.propertyId && booking.unitTypeId) {
    const { linkOf, slots } = await propertySlots(brokerId, booking.propertyId, booking.id);
    const c = clashWith(
      { id: booking.id, unitTypeId: booking.unitTypeId, apt: booking.apt, arrival: iso(r.arrival), departure: iso(r.departure), cancelled: false, propertyId: booking.propertyId, link: linkOf.get(booking.unitTypeId) ?? null },
      slots,
    );
    if (c) return { ok: false, error: "clash", guest: c.guest };
  }
  try {
    const a = answer.kind === "declineChange" ? ({ kind: "decline", reason: "dates" } as const) : answer;
    await bx.answerRequest(r.channexId, kind, a);
  } catch {
    return { ok: false, error: "platform" };
  }
  const status =
    answer.kind === "accept" ? "accepted" : answer.kind === "preapprove" ? "preapproved" : answer.kind === "offer" ? "offered" : "declined";
  await prisma.bookingRequest.update({ where: { id }, data: { status, answeredBy: byName } });

  // The platform sends the changed booking soon after; show it right away.
  if (booking && answer.kind === "accept") {
    await prisma.$transaction([
      prisma.channelBooking.update({
        where: { id: booking.id },
        data: { arrival: r.arrival, departure: r.departure, adults: r.adults, children: r.children, prevArrival: booking.arrival, prevDeparture: booking.departure, changedAt: new Date() },
      }),
      event(booking.id, "altAccepted", {}, byName),
    ]);
    for (const x of editRanges({ arrival: iso(r.arrival), departure: iso(r.departure) }, { arrival: iso(booking.arrival), departure: iso(booking.departure) }))
      await pushNights(booking.propertyId, x.from, x.to);
  }
  return { ok: true };
}

// Read open requests and inquiries from the live feed (on page open, at most
// every few minutes per company; the webhook also triggers it).
const lastRequests = new Map<string, number>();

export async function pullRequests(brokerId: string, force = false): Promise<void> {
  if (!bx.partnerOn()) return;
  if (!force && Date.now() - (lastRequests.get(brokerId) ?? 0) < 5 * 60_000) return;
  lastRequests.set(brokerId, Date.now());
  const props = await prisma.property.findMany({
    where: { brokerId, channexId: { not: null } },
    select: { id: true, channexId: true, unitTypes: { select: { id: true, channexId: true } } },
  });
  const airbnb = await prisma.channelAccount.findFirst({ where: { brokerId, platform: "abb", state: "CONNECTED" } });
  if (!airbnb) return;
  for (const p of props.slice(0, 20)) {
    let list: Awaited<ReturnType<typeof bx.liveRequests>>;
    try {
      list = await bx.liveRequests(p.channexId!);
    } catch {
      continue;
    }
    for (const r of list) {
      // A change request belongs to one of the company's bookings.
      const target = r.kind === "alt" && r.bookingId ? await prisma.channelBooking.findFirst({ where: { brokerId, channexBookingId: r.bookingId }, include: { guestProfile: { select: { name: true } } } }) : null;
      if (r.kind === "alt" && !target) continue;
      const unitTypeId = target ? target.unitTypeId : r.roomTypeId ? (p.unitTypes.find((u) => u.channexId === r.roomTypeId)?.id ?? null) : null;
      const data = {
        brokerId,
        kind: r.kind,
        bookingId: target?.id ?? null,
        propertyId: p.id,
        unitTypeId,
        guestName: (target ? target.guestProfile?.name || target.guest : r.guest).slice(0, 120),
        country: r.country,
        arrival: new Date(r.arrival),
        departure: new Date(r.departure),
        adults: r.adults,
        children: r.children,
        total: r.total,
        payout: r.payout,
        currency: r.currency,
        message: r.message,
        expiresAt: r.expiresAt,
      };
      const known = await prisma.bookingRequest.findUnique({ where: { channexId: r.id } });
      if (!known) {
        if (!r.resolved) await prisma.bookingRequest.create({ data: { channexId: r.id, ...data } });
      } else if (r.resolved && known.status === "open") await prisma.bookingRequest.update({ where: { id: known.id }, data: { status: "expired" } });
    }
  }
}

export async function pullRequestsFor(channexPropertyId: string | null): Promise<void> {
  if (!channexPropertyId) return;
  const p = await prisma.property.findFirst({ where: { channexId: channexPropertyId }, select: { brokerId: true } });
  if (p) await pullRequests(p.brokerId, true);
}

// ---------------------------------------------------------------------------
// Bookings arriving from the platforms (called for every revision, before it
// is acknowledged, because guest details are masked afterwards)

export async function afterRevision(bookingId: string, rev: Revision, before: { arrival: Date; departure: Date; status: string } | null): Promise<void> {
  const b = await prisma.channelBooking.findUnique({ where: { id: bookingId } });
  if (!b) return;
  const d = rev.details;
  const today = calendarToday();

  // Guest profile: same mobile, then email; otherwise a new one.
  let guestId = b.guestId;
  if (!guestId && (d.name || rev.guest)) {
    const candidates = await prisma.guest.findMany({
      where: { brokerId: b.brokerId, mergedIntoId: null, deletedAt: null, OR: [...(phoneKey(d.phone).length >= 8 ? [{ phoneKey: phoneKey(d.phone) }] : []), ...(d.email ? [{ email: d.email }] : [])] },
    });
    const found = matchGuest(candidates, d.phone, d.email);
    if (found) {
      guestId = found.id;
      await prisma.guest.update({
        where: { id: found.id },
        data: { phone: found.phone || d.phone, phoneKey: found.phoneKey || phoneKey(d.phone), email: found.email || d.email, country: found.country || d.country },
      });
    } else {
      const g = await prisma.guest.create({
        data: {
          brokerId: b.brokerId,
          name: (d.name || rev.guest).slice(0, 120),
          phone: d.phone,
          phoneKey: phoneKey(d.phone),
          email: d.email,
          emailKind: emailKindOf(d.email, b.platform),
          country: d.country,
        },
      });
      guestId = g.id;
    }
  }

  // Apartment: keep it, or the first free identical apartment.
  let apt = b.apt;
  if (b.unitTypeId && !before) {
    const unit = await prisma.unitType.findUnique({ where: { id: b.unitTypeId }, select: { count: true } });
    const others = await prisma.channelBooking.findMany({ where: { unitTypeId: b.unitTypeId, status: { not: "cancelled" }, id: { not: b.id }, departure: { gt: b.arrival } } });
    apt =
      firstFreeApt(
        others.map((x) => ({ id: x.id, unitTypeId: x.unitTypeId, apt: x.apt, arrival: iso(x.arrival), departure: iso(x.departure), cancelled: false })),
        b.unitTypeId,
        Math.max(1, unit?.count ?? 1),
        { arrival: iso(b.arrival), departure: iso(b.departure) },
      ) ?? 1;
  }

  const datesMoved = before && before.status !== "cancelled" && rev.status !== "cancelled" && (iso(before.arrival) !== rev.arrival || iso(before.departure) !== rev.departure);
  const cancelledNow = rev.status === "cancelled" && before?.status !== "cancelled";
  const pl = platformById(b.platform)?.name ?? "";
  await prisma.channelBooking.update({
    where: { id: b.id },
    data: {
      guestId,
      apt,
      adults: d.adults,
      children: d.children,
      nightly: d.nightly,
      cleaning: d.cleaning,
      tax: d.tax,
      total: d.total,
      commission: d.commission,
      currency: d.currency,
      collect: d.collect,
      ...(d.arrivalTime ? { arrivalTime: d.arrivalTime } : {}),
      ...(d.notes ? { guestRequest: d.notes } : {}),
      ...(before ? {} : { bookedAt: new Date() }),
      ...(datesMoved ? { prevArrival: before!.arrival, prevDeparture: before!.departure, changedAt: new Date() } : {}),
      ...(cancelledNow ? { cancelledAt: new Date(), cancelledBy: "guest" } : {}),
    },
  });
  if (!before) await event(b.id, "received", { p: pl });
  if (datesMoved) await event(b.id, "changed", { p: pl, a: iso(before!.arrival), b: iso(before!.departure), c: rev.arrival, d: rev.departure });
  if (cancelledNow) await event(b.id, "cancelledGuest", { p: pl });
  void today;

  // Linked calendars (whole apartment and its rooms): the platform only
  // lowers the booked unit type, so close or reopen the linked ones here.
  if (b.propertyId && (await prisma.property.count({ where: { id: b.propertyId, rentMode: "BOTH" } }))) {
    await pushNights(b.propertyId, iso(b.arrival), iso(b.departure));
    if (before && (iso(before.arrival) !== iso(b.arrival) || iso(before.departure) !== iso(b.departure))) {
      await pushNights(b.propertyId, iso(before.arrival), iso(before.departure));
    }
  }
}

// A revision for a direct booking we recorded with the partner ourselves:
// link it, and don't let it overwrite the booking.
export async function ownDirectRevision(rev: Revision): Promise<boolean> {
  if (!/^OM-\d+$/.test(rev.code)) return false;
  const prop = await prisma.property.findFirst({ where: { channexId: rev.propertyId }, select: { brokerId: true } });
  if (!prop) return false;
  const b = await prisma.channelBooking.findFirst({ where: { brokerId: prop.brokerId, platform: DIRECT, code: rev.code } });
  if (!b) return false;
  if (!b.channexBookingId) await prisma.channelBooking.update({ where: { id: b.id }, data: { channexBookingId: rev.bookingId } }).catch(() => undefined);
  return true;
}

// ---------------------------------------------------------------------------
// Guests

export async function setGuestTag(brokerId: string, id: string, tag: "vip" | "blocked", on: boolean, reason = ""): Promise<{ ok: boolean; error?: "notFound" | "reason" }> {
  const g = await ownGuest(brokerId, id);
  if (!g || g.deletedAt) return { ok: false, error: "notFound" };
  if (tag === "blocked" && on && !reason.trim()) return { ok: false, error: "reason" };
  await prisma.guest.update({
    where: { id },
    data: tag === "vip" ? { vip: on } : { blocked: on, blockReason: on ? reason.trim().slice(0, 500) : "" },
  });
  return { ok: true };
}

export async function saveGuestNote(brokerId: string, id: string, note: string): Promise<boolean> {
  const r = await prisma.guest.updateMany({ where: { id, brokerId, mergedIntoId: null, deletedAt: null }, data: { note: note.slice(0, 2000) } });
  return r.count === 1;
}

export async function saveGuestDoc(brokerId: string, id: string, type: DocType, number: string): Promise<{ ok: boolean; error?: "notFound" | "number" }> {
  if (!number.trim()) return { ok: false, error: "number" };
  const r = await prisma.guest.updateMany({ where: { id, brokerId, mergedIntoId: null, deletedAt: null }, data: { docType: type, docNumber: number.trim().slice(0, 40) } });
  return r.count === 1 ? { ok: true } : { ok: false, error: "notFound" };
}

// Merge two profiles that share a mobile number: keep one name, move all
// stays to it, combine tags and notes.
export async function mergeGuests(brokerId: string, keepId: string, dropId: string): Promise<{ ok: boolean; error?: "notFound" | "notAllowed" }> {
  if (keepId === dropId) return { ok: false, error: "notAllowed" };
  const [keep, drop] = await Promise.all([ownGuest(brokerId, keepId), ownGuest(brokerId, dropId)]);
  if (!keep || !drop || keep.deletedAt || drop.deletedAt) return { ok: false, error: "notFound" };
  if (!keep.phoneKey || keep.phoneKey !== drop.phoneKey) return { ok: false, error: "notAllowed" };
  await prisma.$transaction([
    prisma.channelBooking.updateMany({ where: { guestId: drop.id, brokerId }, data: { guestId: keep.id } }),
    prisma.guest.update({
      where: { id: keep.id },
      data: {
        vip: keep.vip || drop.vip,
        blocked: keep.blocked || drop.blocked,
        blockReason: keep.blockReason || drop.blockReason,
        email: keep.email || drop.email,
        emailKind: keep.email ? keep.emailKind : drop.emailKind,
        phone: keep.phone || drop.phone,
        country: keep.country || drop.country,
        docType: keep.docNumber ? keep.docType : drop.docType,
        docNumber: keep.docNumber || drop.docNumber,
        note: [keep.note, drop.note].filter(Boolean).join("\n").slice(0, 2000),
      },
    }),
    prisma.guest.update({ where: { id: drop.id }, data: { mergedIntoId: keep.id } }),
  ]);
  return { ok: true };
}

// Delete a guest's personal data at their request. Not while they have a
// current or upcoming booking. Bookings and amounts stay, without a name.
export async function deleteGuestData(brokerId: string, id: string): Promise<{ ok: boolean; error?: "notFound" | "upcoming" }> {
  const g = await ownGuest(brokerId, id);
  if (!g || g.deletedAt) return { ok: false, error: "notFound" };
  const today = calendarToday();
  const upcoming = await prisma.channelBooking.count({ where: { guestId: id, status: { not: "cancelled" }, departure: { gte: new Date(today) } } });
  if (upcoming) return { ok: false, error: "upcoming" };
  await prisma.$transaction([
    prisma.guest.update({
      where: { id },
      data: { name: "", phone: "", phoneKey: "", email: "", emailKind: "", country: "", docType: "", docNumber: "", note: "", vip: false, blocked: false, blockReason: "", deletedAt: new Date() },
    }),
    prisma.channelBooking.updateMany({ where: { guestId: id }, data: { guest: "", guestRequest: "", arrivalTime: "" } }),
  ]);
  return { ok: true };
}
