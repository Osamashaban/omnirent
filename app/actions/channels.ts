"use server";

// Changes made from the broker Channels page: connecting platforms and
// properties, linking unit types to listings, rate plans, syncing, the price
// on a platform, disconnecting, pulling Airbnb listings, and the bell. Every
// action looks up the signed-in broker again and only touches that broker
// company's own data; ids from another company are ignored. Each answer
// carries the page's fresh data, so the screen always shows what's stored.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentBroker, type CurrentBroker } from "@/lib/broker-auth";
import { isRowId } from "@/lib/action-args";
import { getLang } from "@/lib/lang";
import { isPropertyLevel, platformById, type Platform } from "@/lib/channel-catalog";
import { checkMarkup, readFields } from "@/lib/channel-rules";
import {
  airbnbStart,
  askForHelp,
  confirmSuggestions,
  connectAccount,
  connectProperty,
  disconnectPlatform,
  dismissSuggestion,
  linkListing,
  loadChannels,
  pullAirbnb,
  saveMarkup,
  saveRatePlans,
  startLink,
  stopLink,
  unlink,
  type ChannelsData,
  type ConnectResult,
  type SyncOutcome,
} from "@/lib/channel-data";

type Fail = { ok: false; error: "signedOut" | "failed" };
const signedOut: Fail = { ok: false, error: "signedOut" };
const failed: Fail = { ok: false, error: "failed" };

async function fresh(current: CurrentBroker): Promise<ChannelsData> {
  revalidatePath("/broker/channels");
  return loadChannels(current.broker.id, current.user.name, current.broker.companyName);
}

function platformOf(raw: unknown): Platform | null {
  return typeof raw === "string" ? (platformById(raw) ?? null) : null;
}

function readIds(raw: unknown, max = 500): string[] | null {
  if (!Array.isArray(raw) || raw.length > max || !raw.every(isRowId)) return null;
  return [...new Set(raw as string[])];
}

export async function refreshChannels(): Promise<{ ok: true; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  return { ok: true, data: await fresh(current) };
}

// ---------------------------------------------------------------------------
// Connecting

export async function connectPlatform(input: {
  platform: unknown;
  propertyId?: unknown;
  fields?: unknown;
  currency?: unknown;
  login?: unknown;
}): Promise<{ ok: true; result: ConnectResult; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const p = platformOf(input?.platform);
  const fields = readFields(input?.fields ?? {});
  if (!p || !fields || p.how === "na" || p.id === "abb") return failed;
  const brokerId = current.broker.id;

  let result: ConnectResult;
  if (isPropertyLevel(p)) {
    if (!isRowId(input.propertyId)) return failed;
    let currency: { mode: "ask" } | { mode: "conv"; rate: number } | undefined;
    const c = input.currency as { mode?: unknown; rate?: unknown } | undefined;
    if (c !== undefined && c !== null) {
      if (c.mode === "ask") currency = { mode: "ask" };
      else if (c.mode === "conv" && typeof c.rate === "number" && Number.isFinite(c.rate) && c.rate > 0 && c.rate < 1_000_000) currency = { mode: "conv", rate: c.rate };
      else return failed;
    }
    result = await connectProperty({ brokerId, platform: p, propertyId: input.propertyId, fields, currency });
  } else {
    let login: { email: string; password: string; code?: string } | undefined;
    const l = input.login as { email?: unknown; password?: unknown; code?: unknown } | undefined;
    if (l !== undefined && l !== null) {
      if (p.how !== "login") return failed;
      if (typeof l.email !== "string" || typeof l.password !== "string" || l.email.length > 200 || l.password.length > 200) return failed;
      if (!l.email.trim() || !l.password) return { ok: true, result: { kind: "error", error: "fill" }, data: await fresh(current) };
      if (l.code !== undefined && (typeof l.code !== "string" || !/^\d{6}$/.test(l.code))) return { ok: true, result: { kind: "error", error: "code" }, data: await fresh(current) };
      login = { email: l.email.trim(), password: l.password, ...(l.code ? { code: l.code } : {}) };
    }
    result = await connectAccount({ brokerId, platform: p, fields, login });
  }
  return { ok: true, result, data: await fresh(current) };
}

export async function startAirbnb(): Promise<{ ok: true; url: string } | { ok: false; error: "signedOut" | "failed" | "noProperty" }> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const r = await airbnbStart(current.broker.id);
  return "url" in r ? { ok: true, url: r.url } : { ok: false, error: r.error };
}

export async function askHelp(input: { platform: unknown; propertyId?: unknown }): Promise<{ ok: true } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const p = platformOf(input?.platform);
  if (!p) return failed;
  const propertyId = isRowId(input.propertyId) ? input.propertyId : null;
  await askForHelp(current.broker.id, current.user, p, propertyId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Links

export async function linkUnit(input: { unitTypeId: unknown; platform: unknown; listingId: unknown }): Promise<{ ok: true; result: "ok" | "taken" | "failed"; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const p = platformOf(input?.platform);
  if (!p || !isRowId(input.unitTypeId) || !isRowId(input.listingId)) return failed;
  const result = await linkListing(current.broker.id, input.unitTypeId, p.id, input.listingId);
  return { ok: true, result, data: await fresh(current) };
}

export async function unlinkUnit(input: { unitTypeId: unknown; platform: unknown }): Promise<{ ok: true; result: "ok" | "blocked" | "failed"; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const p = platformOf(input?.platform);
  if (!p || !isRowId(input.unitTypeId)) return failed;
  const result = await unlink(current.broker.id, input.unitTypeId, p.id);
  return { ok: true, result, data: await fresh(current) };
}

export async function notThis(input: { unitTypeId: unknown; listingId: unknown }): Promise<{ ok: true; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  if (!isRowId(input?.unitTypeId) || !isRowId(input.listingId)) return failed;
  if (!(await dismissSuggestion(current.broker.id, input.unitTypeId, input.listingId))) return failed;
  return { ok: true, data: await fresh(current) };
}

// The suggestions of these unit types, or all of them (null).
export async function confirmMatches(input: { unitTypeIds: unknown }): Promise<{ ok: true; n: number; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const ids = input?.unitTypeIds === null ? null : readIds(input?.unitTypeIds);
  if (input?.unitTypeIds !== null && !ids) return failed;
  const n = await confirmSuggestions(current.broker.id, ids);
  return { ok: true, n, data: await fresh(current) };
}

export async function saveRates(input: { unitTypeId: unknown; platform: unknown; plans: unknown }): Promise<{ ok: true; result: "ok" | "none" | "failed"; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const p = platformOf(input?.platform);
  if (!p || !isRowId(input.unitTypeId)) return failed;
  const result = await saveRatePlans(current.broker.id, input.unitTypeId, p.id, input.plans);
  return { ok: true, result, data: await fresh(current) };
}

// Turns syncing on or off for these links.
export async function setSyncing(input: { linkIds: unknown; on: unknown }): Promise<{ ok: true; outcomes: SyncOutcome[]; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const ids = readIds(input?.linkIds, 200);
  if (!ids || typeof input.on !== "boolean") return failed;
  const brokerId = current.broker.id;
  const own = await prisma.channelLink.findMany({ where: { id: { in: ids }, unitType: { property: { brokerId } } }, select: { id: true } });
  const outcomes: SyncOutcome[] = [];
  for (const { id } of own) {
    if (input.on) outcomes.push(await startLink(brokerId, id));
    else await stopLink(brokerId, id);
  }
  return { ok: true, outcomes, data: await fresh(current) };
}

// ---------------------------------------------------------------------------
// Manage

export async function savePrice(input: { platform: unknown; mode: unknown; pct: unknown }): Promise<{ ok: true; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const p = platformOf(input?.platform);
  const m = checkMarkup(input?.mode, input?.pct);
  if (!p || !m || p.how === "na") return failed;
  await saveMarkup(current.broker.id, p.id, m.mode, m.pct);
  return { ok: true, data: await fresh(current) };
}

export async function disconnect(input: { platform: unknown }): Promise<{ ok: true; result: "ok" | "blocked"; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const p = platformOf(input?.platform);
  if (!p) return failed;
  const result = await disconnectPlatform(current.broker.id, p.id);
  return { ok: true, result, data: await fresh(current) };
}

export async function pullListings(input: { listingIds: unknown }): Promise<{ ok: true; n: number; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const ids = readIds(input?.listingIds, 100);
  if (!ids || !ids.length) return failed;
  const n = await pullAirbnb(current.broker.id, current.user.id, ids, await getLang());
  revalidatePath("/broker/properties");
  return { ok: true, n, data: await fresh(current) };
}

// ---------------------------------------------------------------------------
// Bell and alerts

export async function markRead(input: { ids: unknown }): Promise<{ ok: true } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  const ids = input?.ids === null ? null : readIds(input?.ids, 100);
  if (input?.ids !== null && !ids) return failed;
  await prisma.channelNotice.updateMany({ where: { brokerId: current.broker.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
  return { ok: true };
}

export async function dismissIssue(input: { id: unknown }): Promise<{ ok: true; data: ChannelsData } | Fail> {
  const current = await getCurrentBroker();
  if (!current) return signedOut;
  if (!isRowId(input?.id)) return failed;
  await prisma.channelIssue.updateMany({ where: { id: input.id, brokerId: current.broker.id, dismissedAt: null }, data: { dismissedAt: new Date() } });
  return { ok: true, data: await fresh(current) };
}
