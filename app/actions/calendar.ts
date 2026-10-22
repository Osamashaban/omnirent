"use server";

// Changes made from the broker Calendar: quick edit, block, reset, bulk edit,
// undo and retry. Every action looks up the signed-in broker again and only
// touches that broker company's own unit types; ids from another company are
// ignored. The checks are the same rules the screens run, so a tampered
// request can't store what the screens would refuse.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentBroker } from "@/lib/broker-auth";
import { isFlag, isRowId } from "@/lib/action-args";
import { brokerTypes, calendarToday, restoreNights, saveNights, type BeforeRow } from "@/lib/calendar-data";
import { retryFailed, sendChange } from "@/lib/calendar-sync";
import {
  BLOCK_REASONS,
  UNDO_GRACE_SECONDS,
  applyEdit,
  bulkPreview,
  checkBulk,
  checkQuickEdit,
  isIsoDate,
  lastEditable,
  overrideKey,
  readSpec,
  targetNights,
  type BlockReason,
  type EditError,
  type Override,
} from "@/lib/calendar-rules";

export type CalendarResult =
  | { ok: true; changeId: string | null; done: number; skipped: number; types: number; sent: boolean }
  | { ok: false; error: EditError | "below" | "confirm" | "signedOut" | "failed"; count?: number };

type Input = {
  action: "edit" | "block" | "reset" | "bulk";
  typeIds: unknown;
  from: unknown;
  to: unknown;
  spec?: unknown;
  reason?: unknown;
  confirm?: unknown;
};

function readIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length > 500 || !raw.every(isRowId)) return null;
  return [...new Set(raw as string[])];
}

export async function saveCalendar(input: Input): Promise<CalendarResult> {
  const current = await getCurrentBroker();
  if (!current) return { ok: false, error: "signedOut" };
  const action = input?.action;
  const typeIds = readIds(input?.typeIds);
  if (!["edit", "block", "reset", "bulk"].includes(action) || !typeIds) return { ok: false, error: "failed" };
  if (!typeIds.length) return { ok: false, error: "noTypes" };

  const today = calendarToday();
  const from = input.from, to = input.to;
  if (!isIsoDate(from) || !isIsoDate(to) || to < from || from < today || to > lastEditable(today)) return { ok: false, error: "range" };

  const spec = readSpec(input.spec);
  if (!spec) return { ok: false, error: "failed" };
  const types = await brokerTypes(current.broker.id, typeIds);
  if (!types.length) return { ok: false, error: "noTypes" };
  if (!spec.days.some(Boolean)) return { ok: false, error: action === "bulk" ? "range" : "weekday" };

  let change: (t: { type: (typeof types)[number]; date: string }, o: Override | undefined) => Override | null;
  if (action === "edit") {
    const error = checkQuickEdit(spec);
    if (error) return { ok: false, error };
    change = (t, o) => applyEdit(t.type, t.date, o, spec);
  } else if (action === "bulk") {
    // The preview needs the stored prices of every night in range.
    const rows = await prisma.calendarDay.findMany({
      where: { unitTypeId: { in: types.map((t) => t.id) }, date: { gte: new Date(from), lte: new Date(to) } },
      select: { unitTypeId: true, date: true, price: true },
    });
    const prices = new Map<string, Override>(
      rows.map((r) => [overrideKey(r.unitTypeId, r.date.toISOString().slice(0, 10)), r.price === null ? {} : { price: Number(r.price) }]),
    );
    const bulk = { ...spec, typeIds: types.map((t) => t.id), from, to, confirm: isFlag(input.confirm) && input.confirm };
    const preview = bulkPreview(types, prices, bulk);
    const error = checkBulk(bulk, preview, today);
    if (error === "nothing") return { ok: false, error };
    if (error === "below") return { ok: false, error, count: preview.below };
    if (error === "confirm") return { ok: false, error, count: preview.nights };
    if (error) return { ok: false, error };
    change = (t, o) => applyEdit(t.type, t.date, o, spec);
  } else if (action === "block") {
    const reason = BLOCK_REASONS.includes(input.reason as BlockReason) ? (input.reason as BlockReason) : null;
    if (!reason) return { ok: false, error: "failed" };
    change = (_t, o) => ({ ...(o ?? {}), block: reason });
  } else {
    change = () => null;
  }

  const { targets, skipped } = targetNights(types, from, to, spec.days);
  if (!targets.length) return { ok: true, changeId: null, done: 0, skipped, types: types.length, sent: true };
  try {
    const saved = await saveNights({ brokerId: current.broker.id, userId: current.user.id }, targets, change);
    const sent = Object.keys(saved.values).length ? await sendChange(saved.changeId) : true;
    revalidatePath("/broker/calendar");
    return { ok: true, changeId: saved.changeId, done: targets.length, skipped, types: types.length, sent };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// Undo within a short time, only by the person who saved, and only once.
export async function undoCalendar(changeId: unknown): Promise<{ ok: boolean; sent?: boolean }> {
  const current = await getCurrentBroker();
  if (!current || !isRowId(changeId)) return { ok: false };
  const change = await prisma.calendarChange.findFirst({
    where: { id: changeId, brokerId: current.broker.id, createdById: current.user.id, undoneAt: null },
  });
  if (!change || Date.now() - change.createdAt.getTime() > UNDO_GRACE_SECONDS * 1000) return { ok: false };
  const before = change.before as unknown as BeforeRow[];
  const types = await brokerTypes(current.broker.id, [...new Set(before.map((b) => b.unitTypeId))]);
  try {
    const saved = await restoreNights({ brokerId: current.broker.id, userId: current.user.id }, before, types, change.id);
    const sent = Object.keys(saved.values).length ? await sendChange(saved.changeId) : true;
    revalidatePath("/broker/calendar");
    return { ok: true, sent };
  } catch {
    return { ok: false };
  }
}

export async function retryCalendar(): Promise<{ ok: boolean; left: number }> {
  const current = await getCurrentBroker();
  if (!current) return { ok: false, left: 0 };
  const left = await retryFailed(current.broker.id);
  revalidatePath("/broker/calendar");
  return { ok: left === 0, left };
}
