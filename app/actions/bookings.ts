"use server";

// Changes made from the broker Bookings and Guests pages: direct bookings,
// payments, moving and cancelling, answering Airbnb requests, Booking.com
// reports, notes, and guest profiles. Every action looks up the signed-in
// broker again and only touches that broker company's own data; ids from
// another company are ignored. Each answer carries the pages' fresh data.

import { revalidatePath } from "next/cache";
import { getCurrentBroker, type CurrentBroker } from "@/lib/broker-auth";
import { isFlag, isRowId } from "@/lib/action-args";
import { getLang } from "@/lib/lang";
import { BOOKING_DICTS } from "@/lib/booking-i18n";
import { DECLINE_REASONS, DOC_TYPES, METHODS, REPORTS, SOURCES, isIso, type DeclineReason, type DirectError, type DocType, type EditError, type Method, type Source } from "@/lib/booking-rules";
import {
  answerRequest as answer,
  cancelDirect,
  confirmBooking,
  createDirect,
  deleteGuestData,
  editDirect,
  loadBookings,
  mergeGuests,
  moveBooking,
  pullRequests,
  recordPayment,
  reportToBdc,
  saveBookingNote,
  saveGuestDoc,
  saveGuestNote,
  setGuestTag,
  type ActionError,
  type BookingsData,
} from "@/lib/booking-data";
import { pullFeed } from "@/lib/channel-data";
import { nightPrices } from "@/lib/calendar-data";
import { prisma } from "@/lib/db";

type Fail = { ok: false; error: "signedOut" | "failed" | ActionError | "reason" | "number" | "upcoming"; due?: number; guest?: string };
const signedOut: Fail = { ok: false, error: "signedOut" };
const failed: Fail = { ok: false, error: "failed" };
type Done = { ok: true; data: BookingsData };

async function fresh(current: CurrentBroker): Promise<BookingsData> {
  revalidatePath("/broker/bookings");
  revalidatePath("/broker/guests");
  const t = BOOKING_DICTS[await getLang()];
  return loadBookings(current.broker.id, { direct: t.direct, deleted: t.deletedGuest });
}

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
const text = (v: unknown, max: number): string | null => (v === undefined || v === null ? "" : typeof v === "string" ? v.trim().slice(0, max) : null);
const money = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10_000_000 ? v : null);
const count = (v: unknown, max: number): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null);

// Read new bookings and requests again. The page calls this when it opens.
export async function refreshBookings(force?: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  await Promise.allSettled([pullFeed(current.broker.id), pullRequests(current.broker.id, force === true)]);
  return { ok: true, data: await fresh(current) };
}

// ---------------------------------------------------------------------------
// Direct bookings

export async function addDirectBooking(input: Record<string, unknown>): Promise<{ ok: true; id: string; code: string; data: BookingsData } | { ok: false; errors: DirectError[] } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const f = input ?? {};
  const adults = count(f.adults, 50);
  const children = count(f.children, 50);
  const deposit = f.deposit === undefined || f.deposit === null ? 0 : money(f.deposit);
  const rate = f.rate === undefined || f.rate === null ? null : money(f.rate);
  const guestName = text(f.guestName, 120);
  const guestPhone = text(f.guestPhone, 30);
  const note = text(f.note, 500);
  if (
    !isRowId(f.unitTypeId) ||
    typeof f.arrival !== "string" ||
    typeof f.departure !== "string" ||
    (f.arrival && !isIso(f.arrival)) ||
    (f.departure && !isIso(f.departure)) ||
    adults === null ||
    children === null ||
    deposit === null ||
    (f.rate !== undefined && f.rate !== null && rate === null) ||
    !oneOf(["old", "new"] as const, f.guestMode) ||
    (f.guestId !== undefined && f.guestId !== "" && !isRowId(f.guestId)) ||
    guestName === null ||
    guestPhone === null ||
    note === null ||
    !oneOf(SOURCES, f.source) ||
    !oneOf(["pend", "conf"] as const, f.status) ||
    !oneOf(METHODS, f.depositMethod)
  ) {
    return failed;
  }
  const r = await createDirect(current.broker.id, current.user.name, {
    unitTypeId: f.unitTypeId,
    arrival: f.arrival,
    departure: f.departure,
    adults,
    children,
    guestMode: f.guestMode,
    guestId: typeof f.guestId === "string" ? f.guestId : "",
    guestName,
    guestPhone,
    rate,
    deposit,
    source: f.source as Source,
    status: f.status,
    depositMethod: f.depositMethod as Method,
    note,
  });
  if (!r.ok) return r;
  return { ...r, data: await fresh(current) };
}

// The calendar price of each night, shown as the default price of a direct
// booking ("Price per night" placeholder and the total).
export async function quoteNights(unitTypeId: unknown, arrival: unknown, departure: unknown): Promise<{ ok: true; nights: { d: string; p: number }[] } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  if (!isRowId(unitTypeId) || !isIso(arrival) || !isIso(departure) || departure <= arrival) return failed;
  if (Date.parse(departure) - Date.parse(arrival) > 366 * 86_400_000) return failed;
  const unit = await prisma.unitType.findFirst({ where: { id: unitTypeId, property: { brokerId: current.broker.id } }, select: { id: true } });
  if (!unit) return failed;
  return { ok: true, nights: await nightPrices(unit.id, arrival, departure) };
}

export async function addPayment(id: unknown, amount: unknown, method: unknown, date: unknown): Promise<(Done & { confirmed: boolean }) | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const a = money(amount);
  if (!isRowId(id) || a === null || !oneOf(METHODS, method) || typeof date !== "string" || !isIso(date)) return failed;
  const r = await recordPayment(current.broker.id, current.user.name, id, a, method, date);
  if (!r.ok) return { ok: false, error: r.error, due: r.due };
  return { ok: true, confirmed: r.confirmed, data: await fresh(current) };
}

export async function confirmDirect(id: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  if (!isRowId(id)) return failed;
  const r = await confirmBooking(current.broker.id, current.user.name, id);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  return { ok: true, data: await fresh(current) };
}

export async function moveToApartment(id: unknown, apt: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const n = count(apt, 1000);
  if (!isRowId(id) || n === null || n < 1) return failed;
  const r = await moveBooking(current.broker.id, current.user.name, id, n);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  return { ok: true, data: await fresh(current) };
}

export async function cancelDirectBooking(id: unknown, refund: unknown, method: unknown, wa?: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const r0 = money(refund);
  if (!isRowId(id) || r0 === null || !oneOf(METHODS, method) || (wa !== undefined && !isFlag(wa))) return failed;
  const r = await cancelDirect(current.broker.id, current.user.name, id, r0, method, wa === true);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  return { ok: true, data: await fresh(current) };
}

export async function reportBooking(id: unknown, what: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  if (!isRowId(id) || !oneOf(REPORTS, what)) return failed;
  const r = await reportToBdc(current.broker.id, current.user.name, id, what);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  return { ok: true, data: await fresh(current) };
}

// Edit a direct booking (design v88). Field errors come back as `errors`.
export async function editBooking(id: unknown, input: Record<string, unknown>): Promise<Done | { ok: false; errors: EditError[] } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const f = input ?? {};
  const adults = count(f.adults, 50);
  const children = count(f.children, 50);
  const apt = count(f.apt, 1000);
  const rate = f.rate === undefined || f.rate === null ? null : money(f.rate);
  const sp = f.split as { at?: unknown; apt?: unknown } | null | undefined;
  const splitApt = sp ? count(sp.apt, 1000) : null;
  if (
    !isRowId(id) ||
    !isRowId(f.unitTypeId) ||
    typeof f.arrival !== "string" ||
    typeof f.departure !== "string" ||
    (f.arrival !== "" && !isIso(f.arrival)) ||
    (f.departure !== "" && !isIso(f.departure)) ||
    adults === null ||
    children === null ||
    apt === null ||
    (f.rate !== undefined && f.rate !== null && rate === null) ||
    (sp !== undefined && sp !== null && (typeof sp !== "object" || typeof sp.at !== "string" || (sp.at !== "" && !isIso(sp.at)) || splitApt === null))
  ) {
    return failed;
  }
  const r = await editDirect(current.broker.id, current.user.name, id, {
    unitTypeId: f.unitTypeId,
    apt,
    arrival: f.arrival,
    departure: f.departure,
    adults,
    children,
    rate,
    split: sp ? { at: sp.at as string, apt: splitApt! } : null,
  });
  if (!r.ok) return "errors" in r ? r : { ok: false, error: r.error };
  return { ok: true, data: await fresh(current) };
}

export async function saveTeamNote(id: unknown, note: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const t = text(note, 1000);
  if (!isRowId(id) || t === null) return failed;
  if (!(await saveBookingNote(current.broker.id, id, t))) return { ok: false, error: "notFound" };
  return { ok: true, data: await fresh(current) };
}

// ---------------------------------------------------------------------------
// Airbnb requests to book and inquiries

// kind: accept, preapprove, decline (with a reason), offer (with the price for
// the whole stay), declineChange (a change request).
export async function answerBookingRequest(id: unknown, kind: unknown, extra?: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  if (!isRowId(id) || !oneOf(["accept", "preapprove", "decline", "offer", "declineChange"] as const, kind)) return failed;
  if (kind === "decline" && !oneOf(DECLINE_REASONS, extra)) return failed;
  const total = kind === "offer" ? money(extra) : 0;
  if (kind === "offer" && !(total !== null && total >= 1)) return failed;
  const a =
    kind === "decline"
      ? { kind, reason: extra as DeclineReason }
      : kind === "offer"
        ? { kind, total: total! }
        : { kind };
  const r = await answer(current.broker.id, current.user.name, id, a);
  if (!r.ok) return { ok: false, error: r.error ?? "failed", guest: r.guest };
  return { ok: true, data: await fresh(current) };
}

// ---------------------------------------------------------------------------
// Guests

export async function tagGuest(id: unknown, tag: unknown, on: unknown, reason?: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const why = text(reason, 300);
  if (!isRowId(id) || !oneOf(["vip", "blocked"] as const, tag) || !isFlag(on) || why === null) return failed;
  const r = await setGuestTag(current.broker.id, id, tag, on, why);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  return { ok: true, data: await fresh(current) };
}

export async function saveGuestNotes(id: unknown, note: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const t = text(note, 1000);
  if (!isRowId(id) || t === null) return failed;
  if (!(await saveGuestNote(current.broker.id, id, t))) return { ok: false, error: "notFound" };
  return { ok: true, data: await fresh(current) };
}

export async function saveGuestDocument(id: unknown, type: unknown, number: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const t = text(number, 40);
  if (!isRowId(id) || !oneOf(DOC_TYPES, type) || t === null) return failed;
  const r = await saveGuestDoc(current.broker.id, id, type as DocType, t);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  return { ok: true, data: await fresh(current) };
}

export async function mergeGuestProfiles(keepId: unknown, dropId: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  if (!isRowId(keepId) || !isRowId(dropId) || keepId === dropId) return failed;
  const r = await mergeGuests(current.broker.id, keepId, dropId);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  return { ok: true, data: await fresh(current) };
}

export async function deleteGuestPersonalData(id: unknown): Promise<Done | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  if (!isRowId(id)) return failed;
  const r = await deleteGuestData(current.broker.id, id);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  return { ok: true, data: await fresh(current) };
}
