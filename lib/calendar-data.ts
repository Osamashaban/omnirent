// Reading and writing the broker Calendar. Server only. Every function takes
// the signed-in broker company's id and only ever touches that company's own
// properties.

import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { OPS_TIME_ZONE } from "./dates";
import { channexConfigured } from "./channex";
import type { Lang } from "./i18n";
import {
  BLOCK_REASONS,
  buildAri,
  dateRange,
  isEmptyOverride,
  nightOf,
  overrideKey,
  todayIn,
  type AriValues,
  type BlockReason,
  type CalType,
  type ChannexIds,
  type Override,
} from "./calendar-rules";

export type CalProperty = {
  id: string;
  name: string;
  cityId: string | null;
  cityName: string;
  currency: string;
  timezone: string;
};

// A unit type as the screens show it: the rules' CalType plus how the
// non-refundable rate follows the standard one.
export type CalTypeView = CalType & {
  derived: { adjustment: string; value: number } | null;
};

export type CalendarData = {
  today: string;
  properties: CalProperty[];
  types: CalTypeView[];
  overrides: Record<string, Override>;
  // Saves that didn't reach the channels yet.
  failed: number;
};

// "Today" for the calendar is Cairo's date, where brokers work today (an
// assumption to revisit when properties in other time zones arrive).
export function calendarToday(now = new Date()) {
  return todayIn(OPS_TIME_ZONE, now);
}

const typeInclude = {
  rates: { orderBy: { createdAt: "asc" } },
  property: { select: { id: true, rentMode: true } },
} satisfies Prisma.UnitTypeInclude;

type TypeRow = Prisma.UnitTypeGetPayload<{ include: typeof typeInclude }>;

// Unit types without a standard rate yet (a draft that stopped before the
// Pricing step) have no price to show, so the calendar leaves them out.
function toCalType(u: TypeRow): CalTypeView | null {
  const standard = u.rates.find((r) => !r.parentId);
  if (!standard) return null;
  const derived = u.rates.find((r) => r.parentId === standard.id && r.adjustment && r.adjustValue !== null);
  return {
    id: u.id,
    propertyId: u.propertyId,
    name: u.name,
    count: Math.max(1, u.count),
    price: Number(standard.price),
    minStay: Math.max(1, standard.minStay),
    maxStay: Math.max(0, standard.maxStay),
    closedToArrival: standard.closedToArrival,
    link: u.property.rentMode === "BOTH" ? (u.kind === "WHOLE" ? "whole" : "room") : null,
    derived: derived ? { adjustment: derived.adjustment!, value: Number(derived.adjustValue) } : null,
  };
}

export function rowToOverride(r: {
  price: Prisma.Decimal | null;
  unitsOpen: number | null;
  minStay: number | null;
  maxStay: number | null;
  closedToArrival: boolean | null;
  closedToDeparture: boolean | null;
  stopSell: boolean | null;
  blockReason: string | null;
}): Override {
  const o: Override = {};
  if (r.price !== null) o.price = Number(r.price);
  if (r.unitsOpen !== null) o.unitsOpen = r.unitsOpen;
  if (r.minStay !== null) o.minStay = r.minStay;
  if (r.maxStay !== null) o.maxStay = r.maxStay;
  if (r.closedToArrival !== null) o.cta = r.closedToArrival;
  if (r.closedToDeparture !== null) o.ctd = r.closedToDeparture;
  if (r.stopSell !== null) o.stop = r.stopSell;
  if (r.blockReason !== null && BLOCK_REASONS.includes(r.blockReason as BlockReason)) o.block = r.blockReason as BlockReason;
  return o;
}

export function overrideToRow(o: Override) {
  return {
    price: o.price ?? null,
    unitsOpen: o.unitsOpen ?? null,
    minStay: o.minStay ?? null,
    maxStay: o.maxStay ?? null,
    closedToArrival: o.cta ?? null,
    closedToDeparture: o.ctd ?? null,
    stopSell: o.stop ?? null,
    blockReason: o.block ?? null,
  };
}

// Everything the Calendar screens need: the broker's properties (archived
// ones left out), their unit types, and every changed night from today on.
// Changed nights are few, so they're all sent at once and the screens work
// out any range without asking again.
export async function loadCalendar(brokerId: string, lang: Lang): Promise<CalendarData> {
  const today = calendarToday();
  const [props, failed] = await Promise.all([
    prisma.property.findMany({
      where: { brokerId, archivedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        city: { select: { nameAr: true, nameEn: true } },
        unitTypes: { orderBy: { sortOrder: "asc" }, include: typeInclude },
      },
    }),
    prisma.calendarChange.count({ where: { brokerId, status: "FAILED" } }),
  ]);
  const types = props.flatMap((p) => p.unitTypes.map(toCalType).filter((t): t is CalTypeView => t !== null));
  const withTypes = new Set(types.map((t) => t.propertyId));
  const days = types.length
    ? await prisma.calendarDay.findMany({ where: { unitTypeId: { in: types.map((t) => t.id) }, date: { gte: new Date(today) } } })
    : [];
  const overrides: Record<string, Override> = {};
  for (const d of days) overrides[overrideKey(d.unitTypeId, d.date.toISOString().slice(0, 10))] = rowToOverride(d);
  return {
    today,
    properties: props
      .filter((p) => withTypes.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.nickname,
        cityId: p.cityId,
        cityName: p.city ? (lang === "ar" ? p.city.nameAr : p.city.nameEn) : "",
        currency: p.currency,
        timezone: p.timezone,
      })),
    types,
    overrides,
    failed,
  };
}

// The broker's unit types with the given ids (others are ignored).
export async function brokerTypes(brokerId: string, typeIds: string[]): Promise<CalType[]> {
  const rows = await prisma.unitType.findMany({
    where: { id: { in: typeIds }, property: { brokerId, archivedAt: null } },
    include: typeInclude,
  });
  return rows.map(toCalType).filter((t): t is CalTypeView => t !== null);
}

// ---------------------------------------------------------------------------
// Writing nights and recording the save
// ---------------------------------------------------------------------------

export type Target = { type: CalType; date: string };
export type BeforeRow = { unitTypeId: string; date: string; row: Override | null };

type Tx = Prisma.TransactionClient;

async function readOverrides(tx: Tx, targets: { unitTypeId: string; date: string }[]) {
  const byType = groupDates(targets);
  const rows = await Promise.all(
    [...byType].map(([unitTypeId, dates]) => tx.calendarDay.findMany({ where: { unitTypeId, date: { in: dates.map((d) => new Date(d)) } } })),
  );
  const map = new Map<string, Override>();
  for (const r of rows.flat()) map.set(overrideKey(r.unitTypeId, r.date.toISOString().slice(0, 10)), rowToOverride(r));
  return map;
}

function groupDates(targets: { unitTypeId: string; date: string }[]) {
  const byType = new Map<string, string[]>();
  for (const t of targets) byType.set(t.unitTypeId, [...(byType.get(t.unitTypeId) ?? []), t.date]);
  return byType;
}

// Replaces the stored nights for these keys: empty overrides are removed.
async function writeOverrides(tx: Tx, rows: { unitTypeId: string; date: string; override: Override | null }[], userId: string | null) {
  for (const [unitTypeId, dates] of groupDates(rows)) {
    await tx.calendarDay.deleteMany({ where: { unitTypeId, date: { in: dates.map((d) => new Date(d)) } } });
  }
  const keep = rows.filter((r) => r.override && !isEmptyOverride(r.override));
  if (keep.length) {
    await tx.calendarDay.createMany({
      data: keep.map((r) => ({ unitTypeId: r.unitTypeId, date: new Date(r.date), updatedById: userId, ...overrideToRow(r.override!) })),
    });
  }
}

// Applies `change` to every target night, records the save with what the
// nights were before, and returns the save's id. The Channex values are built
// from the nights as now stored.
export async function saveNights(
  broker: { brokerId: string; userId: string },
  targets: Target[],
  change: (target: Target, current: Override | undefined) => Override | null,
): Promise<{ changeId: string; values: Record<string, AriValues> }> {
  const keys = targets.map((t) => ({ unitTypeId: t.type.id, date: t.date }));
  return prisma.$transaction(
    async (tx) => {
      const current = await readOverrides(tx, keys);
      const next = targets.map((t) => ({
        unitTypeId: t.type.id,
        date: t.date,
        override: change(t, current.get(overrideKey(t.type.id, t.date))),
      }));
      await writeOverrides(tx, next, broker.userId);
      const before: BeforeRow[] = keys.map((k) => ({ ...k, row: current.get(overrideKey(k.unitTypeId, k.date)) ?? null }));
      const values = await ariFor(
        tx,
        targets.map((t, i) => ({ ...t, override: next[i].override })),
      );
      const record = await tx.calendarChange.create({
        data: {
          brokerId: broker.brokerId,
          createdById: broker.userId,
          values: values as Prisma.InputJsonValue,
          before: before as unknown as Prisma.InputJsonValue,
          nights: targets.length,
          status: Object.keys(values).length ? "SENDING" : "LIVE",
          sentAt: Object.keys(values).length ? null : new Date(),
        },
      });
      return { changeId: record.id, values };
    },
    { timeout: 20000 },
  );
}

// Puts the nights of a save back as they were, and records that as a new save
// (so it reaches the channels too).
export async function restoreNights(
  broker: { brokerId: string; userId: string },
  before: BeforeRow[],
  types: CalType[],
  undoneId: string,
): Promise<{ changeId: string; values: Record<string, AriValues> }> {
  const typeById = new Map(types.map((t) => [t.id, t]));
  const rows = before.filter((b) => typeById.has(b.unitTypeId));
  return prisma.$transaction(
    async (tx) => {
      const current = await readOverrides(tx, rows);
      await writeOverrides(
        tx,
        rows.map((b) => ({ unitTypeId: b.unitTypeId, date: b.date, override: b.row })),
        broker.userId,
      );
      const values = await ariFor(
        tx,
        rows.map((b) => ({ type: typeById.get(b.unitTypeId)!, date: b.date, override: b.row })),
      );
      await tx.calendarChange.update({ where: { id: undoneId }, data: { undoneAt: new Date() } });
      const record = await tx.calendarChange.create({
        data: {
          brokerId: broker.brokerId,
          createdById: broker.userId,
          values: values as Prisma.InputJsonValue,
          before: rows.map((b) => ({ unitTypeId: b.unitTypeId, date: b.date, row: current.get(overrideKey(b.unitTypeId, b.date)) ?? null })) as unknown as Prisma.InputJsonValue,
          nights: rows.length,
          status: Object.keys(values).length ? "SENDING" : "LIVE",
          sentAt: Object.keys(values).length ? null : new Date(),
          // An undo can't itself be undone.
          undoneAt: new Date(),
        },
      });
      return { changeId: record.id, values };
    },
    { timeout: 20000 },
  );
}

// Channex values per property, for the properties already on Channex (where a
// Channex key is set). Unit types added since the last publish have no
// Channex ids yet and are left out until the next publish.
async function ariFor(tx: Tx, nights: (Target & { override: Override | null })[]): Promise<Record<string, AriValues>> {
  const idsByProperty = await channexIds(
    tx,
    [...new Set(nights.map((n) => n.type.propertyId))],
  );
  const out: Record<string, AriValues> = {};
  for (const [propertyId, ids] of idsByProperty) {
    const mine = nights
      .filter((n) => n.type.propertyId === propertyId)
      .map((n) => ({ type: n.type, date: n.date, night: nightOf(n.type, n.date, n.override ?? undefined) }));
    const values = buildAri(ids, mine);
    if (values.restrictions.length || values.availability.length) out[propertyId] = values;
  }
  return out;
}

// The Channex ids of properties already published to Channex: the property,
// each unit type's room type and its standard rate plan.
async function channexIds(tx: Tx, propertyIds: string[]): Promise<Map<string, ChannexIds>> {
  if (!channexConfigured() || !propertyIds.length) return new Map();
  const rows = await tx.property.findMany({
    where: { id: { in: propertyIds }, channexId: { not: null } },
    select: {
      id: true,
      channexId: true,
      unitTypes: { select: { id: true, channexId: true, rates: { where: { parentId: null }, orderBy: { createdAt: "asc" }, select: { channexId: true } } } },
    },
  });
  const out = new Map<string, ChannexIds>();
  for (const p of rows) {
    const ids: ChannexIds = { propertyId: p.channexId!, roomTypes: {}, ratePlans: {} };
    for (const u of p.unitTypes) {
      if (u.channexId) ids.roomTypes[u.id] = u.channexId;
      const rate = u.rates[0]?.channexId;
      if (rate) ids.ratePlans[u.id] = rate;
    }
    out.set(p.id, ids);
  }
  return out;
}

// Every night of one published property from `from` to `to`, as Channex
// values: the calendar's changes on top of the unit types' defaults. A
// publish sends these right after the rooms and rates are made, so the
// channels show what the calendar shows (and a new unit type opens all its
// units for sale).
export async function calendarAri(propertyId: string, from: string, to: string): Promise<AriValues> {
  const rows = await prisma.unitType.findMany({ where: { propertyId }, orderBy: { sortOrder: "asc" }, include: typeInclude });
  const types = rows.map(toCalType).filter((t): t is CalTypeView => t !== null);
  const ids = (await channexIds(prisma, [propertyId])).get(propertyId);
  if (!ids || !types.length) return { restrictions: [], availability: [] };
  const days = await prisma.calendarDay.findMany({
    where: { unitTypeId: { in: types.map((t) => t.id) }, date: { gte: new Date(from), lte: new Date(to) } },
  });
  const stored = new Map(days.map((d) => [overrideKey(d.unitTypeId, d.date.toISOString().slice(0, 10)), rowToOverride(d)]));
  const nights = types.flatMap((type) =>
    dateRange(from, to).map((date) => ({ type, date, night: nightOf(type, date, stored.get(overrideKey(type.id, date))) })),
  );
  return buildAri(ids, nights);
}
