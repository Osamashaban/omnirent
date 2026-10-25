// Reading and changing the broker Channels page. Server only. Every function
// takes the signed-in broker company's id and only touches that company's
// own platforms, properties, unit types and listings. The rules come from
// lib/channel-rules.ts; the Channex calls from lib/channel-channex.ts.

import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { ChannexError, channexConfigured } from "./channex";
import { isPropertyLevel, platformById, type Platform } from "./channel-catalog";
import {
  ST_OF,
  checkRatePlans,
  defaultRatePlans,
  derivedOption,
  linkKey,
  platformFromOta,
  readyMessage,
  settingsFor,
  suggestions,
  type AccountView,
  type Booking,
  type ChannelsState,
  type ConnView,
  type DbState,
  type LinkView,
  type ListingView,
  type PlatformRate,
  type PriceMode,
  type PropView,
  type Revision,
  type UnitView,
} from "./channel-rules";
import * as cx from "./channel-channex";
import { openSettings, sealSettings } from "./channel-secrets";
import { CHANNEL_DICTS, dateRangeText, type NoticeArgs } from "./channel-i18n";
import { sendEmail } from "./email";
import { button, esc, h1, layout, p as para } from "./broker-emails";
import { calendarToday } from "./calendar-data";
import type { Lang } from "./i18n";

// ---------------------------------------------------------------------------
// Addresses

// The broker app the emails and Channex point at: production, or the shared
// staging site for every other deployment.
export function brokerAppUrl(): string {
  return process.env.VERCEL_ENV === "production" ? "https://app.getomnirent.com" : "https://app.staging.getomnirent.com";
}

function teamEmail(): string {
  return process.env.CHANNELS_TEAM_EMAIL || "info@getomnirent.com";
}

// ---------------------------------------------------------------------------
// The page

export type IssueView = { id: string; platform: string; kind: string; unitTypeId: string | null; data: Record<string, string> };
export type NoticeView = { id: string; platform: string; kind: string; params: Partial<NoticeArgs>; go: string; read: boolean; at: string };

export type ChannelsData = ChannelsState & {
  today: string;
  ready: boolean;
  signer: string;
  company: string;
  // For the price example in Manage: the first unit type with a price.
  example: { unit: string; price: number; currency: string } | null;
  issues: IssueView[];
  notices: NoticeView[];
};

const st = (s: string | null | undefined) => (s ? ST_OF[s as DbState] : null);

export async function loadChannels(brokerId: string, signer: string, company: string): Promise<ChannelsData> {
  const today = calendarToday();
  const [accounts, conns, properties, listings, bookings, issues, notices] = await Promise.all([
    prisma.channelAccount.findMany({ where: { brokerId } }),
    prisma.channelConnection.findMany({ where: { brokerId } }),
    prisma.property.findMany({
      where: { brokerId, archivedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nickname: true,
        status: true,
        channexId: true,
        currency: true,
        unitTypes: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            count: true,
            adults: true,
            children: true,
            rates: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, parentId: true, price: true } },
            channelLinks: true,
          },
        },
      },
    }),
    prisma.channelListing.findMany({ where: { brokerId }, orderBy: { createdAt: "asc" } }),
    prisma.channelBooking.findMany({
      where: { brokerId, status: { not: "cancelled" }, departure: { gt: new Date(today) } },
      orderBy: { arrival: "asc" },
    }),
    prisma.channelIssue.findMany({ where: { brokerId, dismissedAt: null }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.channelNotice.findMany({ where: { brokerId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const props: PropView[] = properties.map((p) => ({ id: p.id, name: p.nickname, published: !!p.channexId && p.status !== "DRAFT", currency: p.currency }));
  const units: UnitView[] = properties.flatMap((p) =>
    p.unitTypes.map((u) => ({
      id: u.id,
      propertyId: p.id,
      name: u.name,
      count: Math.max(1, u.count),
      guests: u.adults + u.children,
      rates: u.rates.map((r) => ({ id: r.id, name: r.name, derived: !!r.parentId })),
    })),
  );
  const links: LinkView[] = properties.flatMap((p) =>
    p.unitTypes.flatMap((u) =>
      u.channelLinks.map((l) => ({
        id: l.id,
        unitTypeId: l.unitTypeId,
        platform: l.platform,
        listingId: l.listingId,
        syncOn: l.syncOn,
        status: l.status,
        error: (l.error as LinkView["error"]) ?? null,
        ratePlans: (l.ratePlans as Record<string, string> | null) ?? null,
      })),
    ),
  );
  const future: Record<string, Booking[]> = {};
  for (const b of bookings) {
    if (!b.unitTypeId) continue;
    (future[linkKey(b.unitTypeId, b.platform)] ??= []).push({
      code: b.code,
      guest: b.guest,
      arrival: b.arrival.toISOString().slice(0, 10),
      departure: b.departure.toISOString().slice(0, 10),
    });
  }
  const firstPriced = properties.flatMap((p) => p.unitTypes.map((u) => ({ p, u }))).find(({ u }) => u.rates.some((r) => !r.parentId && Number(r.price) > 0));
  return {
    today,
    ready: channexConfigured(),
    signer,
    company,
    example: firstPriced
      ? { unit: firstPriced.u.name, price: Number(firstPriced.u.rates.find((r) => !r.parentId)!.price), currency: firstPriced.p.currency }
      : null,
    accounts: accounts.map(
      (a): AccountView => ({
        platform: a.platform,
        state: st(a.state),
        waitReason: a.waitReason,
        account: a.account,
        priceMode: a.priceMode as PriceMode,
        pricePct: a.pricePct,
      }),
    ),
    conns: conns.map(
      (c): ConnView => ({
        id: c.id,
        platform: c.platform,
        propertyId: c.propertyId,
        state: st(c.state)!,
        waitReason: c.waitReason,
        externalId: c.externalId,
        rejectReason: c.rejectReason,
        currency: c.currency,
        exchangeRate: c.exchangeRate === null ? null : Number(c.exchangeRate),
      }),
    ),
    props,
    units,
    listings: listings.map(listingView),
    links,
    future,
    unlisted: issues.filter((i) => i.kind === "unlisted" && i.unitTypeId).map((i) => linkKey(i.unitTypeId!, i.platform)),
    issues: issues.map((i) => ({ id: i.id, platform: i.platform, kind: i.kind, unitTypeId: i.unitTypeId, data: (i.data ?? {}) as Record<string, string> })),
    notices: notices.map((n) => ({
      id: n.id,
      platform: n.platform,
      kind: n.kind,
      params: (n.params ?? {}) as Partial<NoticeArgs>,
      go: n.go,
      read: !!n.readAt,
      at: n.createdAt.toISOString(),
    })),
  };
}

function listingView(l: Prisma.ChannelListingGetPayload<object>): ListingView {
  return {
    id: l.id,
    platform: l.platform,
    propertyId: l.propertyId,
    externalId: l.externalId,
    name: l.name,
    city: l.city,
    guests: l.guests,
    rates: (l.rates as PlatformRate[]) ?? [],
    gone: l.gone,
    dismissed: l.dismissed,
  };
}

// The state the rules need, for checks inside actions.
export async function brokerState(brokerId: string): Promise<ChannelsData> {
  return loadChannels(brokerId, "", "");
}

// ---------------------------------------------------------------------------
// Notices and emails

export async function notify(brokerId: string, platform: string, kind: string, params: Partial<NoticeArgs>, go: string, email = false) {
  await prisma.channelNotice.create({ data: { brokerId, platform, kind, params: params as Prisma.InputJsonValue, go } });
  if (!email) return;
  const p = platformById(platform);
  const text = (lang: Lang) => {
    const t = CHANNEL_DICTS[lang];
    const fn = t.notice[kind];
    return fn ? fn({ p: p?.name ?? platform, r: "", n: 0, room: "", u: "", code: "", ...params }) : "";
  };
  const users = await prisma.brokerUser.findMany({ where: { brokerId, status: "ACTIVE" }, select: { email: true } });
  const link = `${brokerAppUrl()}/channels`;
  for (const u of users) {
    const html = layout(
      "ar",
      h1(CHANNEL_DICTS.ar.channels) +
        para(esc(text("ar"))) +
        `<div dir="ltr" style="text-align:left">${h1(CHANNEL_DICTS.en.channels)}${para(esc(text("en")))}</div>` +
        button(link, "افتح القنوات · Open Channels"),
    );
    await sendEmail({ to: u.email, subject: `Omnirent · ${text("en")}`.slice(0, 140), html, text: `${text("ar")}\n\n${text("en")}\n\n${link}` }).catch(() => undefined);
  }
}

// Requests for the Omnirent team: Google, a currency change, "Need help?".
async function emailTeam(subject: string, lines: string[]) {
  await sendEmail({
    to: teamEmail(),
    subject: `[Channels] ${subject}`.slice(0, 160),
    html: layout("en", h1(subject) + lines.map((l) => para(esc(l))).join("")),
    text: lines.join("\n"),
  }).catch(() => undefined);
}

export async function askForHelp(brokerId: string, user: { name: string; email: string; mobile: string }, platform: Platform, propertyId: string | null) {
  const [broker, prop] = await Promise.all([
    prisma.broker.findUnique({ where: { id: brokerId }, select: { companyName: true } }),
    propertyId ? prisma.property.findFirst({ where: { id: propertyId, brokerId }, select: { nickname: true } }) : null,
  ]);
  await emailTeam(`Help connecting ${platform.name} · ${broker?.companyName ?? ""}`, [
    `${user.name} (${user.email}, ${user.mobile}) asked for a call to connect ${platform.name}.`,
    prop ? `Property: ${prop.nickname}` : "Whole account",
  ]);
}

// ---------------------------------------------------------------------------
// Connecting a platform

export type ConnectResult =
  | { kind: "connected"; listings: number; matches: number; bookings: number; propertyId: string | null }
  | { kind: "wait"; why: "confirm" | "sup" | "cur" | "request" | "unk" }
  | { kind: "reconnected" }
  | { kind: "cur"; currency: string; own: string }
  | { kind: "error"; error: "reach" | "cm" | "fill" | "allConnected" | "failed" | "auth" | "otp" | "code" };

async function ensureWebhookQuietly() {
  const secret = process.env.CHANNEX_WEBHOOK_SECRET;
  if (!secret) return;
  await cx.ensureWebhook(`${brokerAppUrl()}/api/channex/webhook`, secret).catch(() => undefined);
}

async function settingsForPlatform(p: Platform, fields: Record<string, string>) {
  const code = await cx.adapterCode(p);
  if (!code) return null;
  const a = await cx.adapter(code).catch(() => null);
  const settings = a ? settingsFor(a.params, fields) : fields.pid ? { hotel_id: fields.pid } : {};
  return { code, settings, rateParams: a?.rateParams ?? [], params: a?.params ?? [] };
}

// Saves what the platform says it has for this property (or the account) as
// listings, keeping the ones already linked and marking the rest gone.
async function saveListings(brokerId: string, platform: string, propertyId: string | null, rooms: { id: string; title: string; maxPersons: number | null; rates: PlatformRate[]; city?: string }[], pricingType: string | null) {
  for (const r of rooms) {
    await prisma.channelListing.upsert({
      where: { brokerId_platform_externalId: { brokerId, platform, externalId: r.id } },
      create: { brokerId, platform, propertyId, externalId: r.id, name: r.title.slice(0, 200), city: r.city ?? "", guests: r.maxPersons, rates: r.rates as Prisma.InputJsonValue, pricingType },
      update: { propertyId, name: r.title.slice(0, 200), guests: r.maxPersons, rates: r.rates as Prisma.InputJsonValue, pricingType, gone: false, ...(r.city ? { city: r.city } : {}) },
    });
  }
  const ids = rooms.map((r) => r.id);
  await prisma.channelListing.updateMany({
    where: { brokerId, platform, ...(propertyId ? { propertyId } : {}), externalId: { notIn: ids.length ? ids : ["-"] } },
    data: { gone: true },
  });
}

async function matchesFound(brokerId: string, platform: string): Promise<number> {
  const s = await brokerState(brokerId);
  return Object.keys(suggestions(s)).filter((k) => k.endsWith(`|${platform}`)).length;
}

// A property on Booking.com, Expedia, Hostelworld... (ext and sup platforms).
export async function connectProperty(o: {
  brokerId: string;
  platform: Platform;
  propertyId: string;
  fields: Record<string, string>;
  currency?: { mode: "ask" } | { mode: "conv"; rate: number };
}): Promise<ConnectResult> {
  const { brokerId, platform: p, propertyId, fields } = o;
  const prop = await prisma.property.findFirst({ where: { id: propertyId, brokerId, archivedAt: null }, select: { id: true, nickname: true, currency: true, channexId: true } });
  if (!prop) return { kind: "error", error: "failed" };
  const existing = await prisma.channelConnection.findUnique({ where: { platform_propertyId: { platform: p.id, propertyId } } });
  if (existing && (existing.state === "CONNECTED" || (existing.state === "WAITING" && existing.waitReason !== "sup" && existing.waitReason !== "confirm")))
    return { kind: "error", error: "allConnected" };

  // Support-type: no ID yet means the broker sent the message.
  if (!fields.pid && !fields.u && !fields.tok) {
    if (p.how !== "sup") return { kind: "error", error: "fill" };
    await prisma.channelConnection.upsert({
      where: { platform_propertyId: { platform: p.id, propertyId } },
      create: { brokerId, platform: p.id, propertyId, state: "WAITING", waitReason: "sup" },
      update: { state: "WAITING", waitReason: "sup", rejectReason: null },
    });
    return { kind: "wait", why: "sup" };
  }

  const found = await settingsForPlatform(p, fields);
  if (!found) return { kind: "error", error: "reach" };
  const test = await cx.testConnection(found.code, found.settings);
  const sealed = sealSettings({ code: found.code, settings: found.settings });
  if (!test.ok) {
    if (test.failure === "cm") return { kind: "error", error: "cm" };
    // Booking.com accepts the request a little after the broker sends it:
    // the property waits and is checked again.
    if (p.id === "bdc") {
      await prisma.channelConnection.upsert({
        where: { platform_propertyId: { platform: p.id, propertyId } },
        create: { brokerId, platform: p.id, propertyId, state: "WAITING", waitReason: "confirm", externalId: fields.pid ?? "", settings: sealed, checkedAt: new Date() },
        update: { state: "WAITING", waitReason: "confirm", externalId: fields.pid ?? "", settings: sealed, rejectReason: null, checkedAt: new Date() },
      });
      return { kind: "wait", why: "confirm" };
    }
    return { kind: "error", error: "reach" };
  }

  const currency = await cx.connectionCurrency(found.code, found.settings);
  if (currency && currency !== prop.currency) {
    if (!o.currency) return { kind: "cur", currency, own: prop.currency };
    if (o.currency.mode === "ask") {
      await prisma.channelConnection.upsert({
        where: { platform_propertyId: { platform: p.id, propertyId } },
        create: { brokerId, platform: p.id, propertyId, state: "WAITING", waitReason: "cur", externalId: fields.pid ?? "", settings: sealed, currency, checkedAt: new Date() },
        update: { state: "WAITING", waitReason: "cur", externalId: fields.pid ?? "", settings: sealed, currency, rejectReason: null, checkedAt: new Date() },
      });
      const broker = await prisma.broker.findUnique({ where: { id: brokerId }, select: { companyName: true } });
      await emailTeam(`Currency change on ${p.name} · ${broker?.companyName ?? ""}`, [
        `Please ask ${p.name} to change the currency of "${prop.nickname}" (property ID ${fields.pid ?? ""}) from ${currency} to ${prop.currency}.`,
        "The property connects by itself once the platform changes it.",
      ]);
      return { kind: "wait", why: "cur" };
    }
  }

  const details = await cx.mappingDetails(found.code, found.settings);
  await prisma.channelConnection.upsert({
    where: { platform_propertyId: { platform: p.id, propertyId } },
    create: {
      brokerId,
      platform: p.id,
      propertyId,
      state: "CONNECTED",
      externalId: fields.pid ?? fields.u ?? "",
      settings: sealed,
      connectedAt: new Date(),
      checkedAt: new Date(),
      ...(currency && currency !== prop.currency && o.currency?.mode === "conv" ? { currency, exchangeRate: o.currency.rate } : {}),
    },
    update: {
      state: "CONNECTED",
      waitReason: null,
      rejectReason: null,
      externalId: fields.pid ?? fields.u ?? "",
      settings: sealed,
      connectedAt: new Date(),
      checkedAt: new Date(),
      ...(currency && currency !== prop.currency && o.currency?.mode === "conv" ? { currency, exchangeRate: o.currency.rate } : { currency: null, exchangeRate: null }),
    },
  });
  await saveListings(brokerId, p.id, propertyId, details.rooms, details.pricingType);
  await ensureWebhookQuietly();
  await notify(brokerId, p.id, "propConnected", { r: prop.nickname }, p.id);
  return { kind: "connected", listings: details.rooms.length, matches: await matchesFound(brokerId, p.id), bookings: 0, propertyId };
}

// The whole account: Google (request), platforms with no guide (unk), and
// login platforms (VRBO) with the sign-in window.
export async function connectAccount(o: {
  brokerId: string;
  platform: Platform;
  fields: Record<string, string>;
  login?: { email: string; password: string; code?: string };
}): Promise<ConnectResult> {
  const { brokerId, platform: p, fields } = o;
  const current = await prisma.channelAccount.findUnique({ where: { brokerId_platform: { brokerId, platform: p.id } } });
  const reconnect = current?.state === "ATTENTION";
  if (current?.state === "CONNECTED") return { kind: "error", error: "allConnected" };

  if (p.how === "request") {
    await prisma.channelAccount.upsert({
      where: { brokerId_platform: { brokerId, platform: p.id } },
      create: { brokerId, platform: p.id, state: "WAITING", waitReason: "request" },
      update: { state: "WAITING", waitReason: "request" },
    });
    const broker = await prisma.broker.findUnique({ where: { id: brokerId }, select: { companyName: true } });
    await emailTeam(`Turn on ${p.name} · ${broker?.companyName ?? ""}`, [`${broker?.companyName ?? "A broker"} asked to turn on ${p.name} for their syncing apartments.`]);
    return { kind: "wait", why: "request" };
  }
  if (p.how === "unk" && !fields.pid) {
    await prisma.channelAccount.upsert({
      where: { brokerId_platform: { brokerId, platform: p.id } },
      create: { brokerId, platform: p.id, state: "WAITING", waitReason: "unk" },
      update: { state: "WAITING", waitReason: "unk" },
    });
    return { kind: "wait", why: "unk" };
  }

  const loginFields = o.login ? { u: o.login.email, pw: o.login.password } : fields;
  const found = await settingsForPlatform(p, loginFields);
  if (!found) return { kind: "error", error: "reach" };
  if (o.login?.code) {
    const codeParam = found.params.find((x) => /otp|verif|sms|2fa|mfa|code/i.test(x.name) && !/hotel|property/i.test(x.name));
    found.settings[codeParam?.name ?? "otp"] = o.login.code;
  }
  const test = await cx.testConnection(found.code, found.settings);
  if (!test.ok) {
    if (o.login) {
      if (o.login.code) return { kind: "error", error: test.failure === "auth" ? "auth" : "code" };
      if (test.failure === "otp") return { kind: "error", error: "otp" };
      return { kind: "error", error: test.failure === "auth" ? "auth" : "reach" };
    }
    return { kind: "error", error: test.failure === "cm" ? "cm" : "reach" };
  }
  // The code itself is only good once; it isn't kept.
  delete found.settings[found.params.find((x) => /otp|verif|sms|2fa|mfa/i.test(x.name))?.name ?? "otp"];
  const details = await cx.mappingDetails(found.code, found.settings);
  await prisma.channelAccount.upsert({
    where: { brokerId_platform: { brokerId, platform: p.id } },
    create: {
      brokerId,
      platform: p.id,
      state: "CONNECTED",
      account: (o.login?.email ?? fields.pid ?? "").slice(0, 200),
      settings: sealSettings({ code: found.code, settings: found.settings }),
      connectedAt: new Date(),
    },
    update: {
      state: "CONNECTED",
      waitReason: null,
      account: (o.login?.email ?? fields.pid ?? current?.account ?? "").slice(0, 200),
      settings: sealSettings({ code: found.code, settings: found.settings }),
      connectedAt: new Date(),
    },
  });
  await saveListings(brokerId, p.id, null, details.rooms, details.pricingType);
  await ensureWebhookQuietly();
  if (reconnect) {
    await resumeAll(brokerId, p.id);
    await notify(brokerId, p.id, "reconnected", {}, p.id);
    return { kind: "reconnected" };
  }
  await notify(brokerId, p.id, "connected", {}, p.id);
  return { kind: "connected", listings: details.rooms.length, matches: await matchesFound(brokerId, p.id), bookings: 0, propertyId: null };
}

// Booking.com connections waiting for the platform to accept, checked again
// when the page opens (at most every 10 minutes each).
export async function recheckWaiting(brokerId: string): Promise<void> {
  if (!channexConfigured()) return;
  const due = await prisma.channelConnection.findMany({
    where: { brokerId, state: "WAITING", waitReason: { in: ["confirm", "cur"] }, settings: { not: null }, OR: [{ checkedAt: null }, { checkedAt: { lt: new Date(Date.now() - 10 * 60_000) } }] },
    include: { property: { select: { nickname: true, currency: true } } },
    take: 5,
  });
  for (const c of due) {
    await prisma.channelConnection.update({ where: { id: c.id }, data: { checkedAt: new Date() } });
    const saved = openSettings(c.settings) as { code?: string; settings?: Record<string, unknown> } | null;
    const p = platformById(c.platform);
    if (!saved?.code || !saved.settings || !p) continue;
    try {
      const test = await cx.testConnection(saved.code, saved.settings);
      if (!test.ok) {
        if (test.failure === "cm") {
          await prisma.channelConnection.update({ where: { id: c.id }, data: { state: "REJECTED", waitReason: null, rejectReason: CHANNEL_DICTS.en.errCmBdc } });
          await notify(brokerId, c.platform, "declined", { r: c.property.nickname }, c.platform, true);
        }
        continue;
      }
      if (c.waitReason === "cur") {
        const currency = await cx.connectionCurrency(saved.code, saved.settings);
        if (currency && currency !== c.property.currency) continue;
      }
      const details = await cx.mappingDetails(saved.code, saved.settings);
      await prisma.channelConnection.update({ where: { id: c.id }, data: { state: "CONNECTED", waitReason: null, connectedAt: new Date(), currency: null, exchangeRate: null } });
      await saveListings(brokerId, c.platform, c.propertyId, details.rooms, details.pricingType);
      await notify(brokerId, c.platform, "confirmed", { r: c.property.nickname }, c.platform);
    } catch {
      // Tried again next time.
    }
  }
}

// ---------------------------------------------------------------------------
// Airbnb

export async function airbnbStart(brokerId: string): Promise<{ url: string } | { error: "noProperty" | "failed" }> {
  const [broker, props, account] = await Promise.all([
    prisma.broker.findUnique({ where: { id: brokerId }, select: { channexGroupId: true, companyName: true } }),
    prisma.property.findMany({ where: { brokerId, archivedAt: null, channexId: { not: null } }, select: { channexId: true } }),
    prisma.channelAccount.findUnique({ where: { brokerId_platform: { brokerId, platform: "abb" } } }),
  ]);
  if (!broker?.channexGroupId || !props.length) return { error: "noProperty" };
  const token = randomBytes(24).toString("base64url");
  await prisma.channelAccount.upsert({
    where: { brokerId_platform: { brokerId, platform: "abb" } },
    create: { brokerId, platform: "abb", oauthToken: token, oauthAt: new Date() },
    update: { oauthToken: token, oauthAt: new Date() },
  });
  const back = `${brokerAppUrl()}/channels/airbnb`;
  try {
    const url = await cx.airbnbLink({
      groupId: broker.channexGroupId,
      propertyIds: props.map((p) => p.channexId!),
      channelId: account?.channexChannelId ?? null,
      redirect: back,
      failure: back,
      token,
      title: `${broker.companyName} · Airbnb`.slice(0, 100),
    });
    return { url };
  } catch {
    return { error: "failed" };
  }
}

// Airbnb sent the broker back. The token proves the approval belongs to this
// company and is recent (Airbnb links last two hours).
export async function airbnbFinish(brokerId: string, channelId: string, token: string): Promise<"connected" | "reconnected" | "failed"> {
  const account = await prisma.channelAccount.findUnique({ where: { brokerId_platform: { brokerId, platform: "abb" } } });
  if (!account?.oauthToken || !account.oauthAt || account.oauthToken !== token || Date.now() - account.oauthAt.getTime() > 2 * 3600_000) return "failed";
  if (!/^[0-9a-f-]{36}$/i.test(channelId)) return "failed";
  const other = await prisma.channelAccount.findFirst({ where: { channexChannelId: channelId, NOT: { brokerId } } });
  if (other) return "failed";
  const wasAttn = account.state === "ATTENTION";
  await prisma.channelAccount.update({
    where: { id: account.id },
    data: { state: "CONNECTED", waitReason: null, channexChannelId: channelId, oauthToken: null, oauthAt: null, connectedAt: new Date() },
  });
  try {
    const listings = await cx.airbnbListings(channelId);
    await saveListings(
      brokerId,
      "abb",
      null,
      listings.map((l) => ({ id: l.id, title: l.title, maxPersons: l.guests, rates: [], city: l.city })),
      null,
    );
  } catch {
    // Listings can be read again from Manage.
  }
  await ensureWebhookQuietly();
  if (wasAttn) {
    await resumeAll(brokerId, "abb");
    await notify(brokerId, "abb", "reconnected", {}, "abb");
    return "reconnected";
  }
  await notify(brokerId, "abb", "connected", {}, "abb");
  return "connected";
}

// Copies Airbnb listings into Omnirent as draft properties, each with one
// unit type and its standard rate, linked to the listing. Photos aren't
// copied yet (Omnirent has no photo storage); the broker adds them in the
// property wizard.
export async function pullAirbnb(brokerId: string, userId: string, listingIds: string[], lang: Lang): Promise<number> {
  const account = await prisma.channelAccount.findUnique({ where: { brokerId_platform: { brokerId, platform: "abb" } } });
  if (account?.state !== "CONNECTED" || !account.channexChannelId) return 0;
  const listings = await prisma.channelListing.findMany({ where: { brokerId, platform: "abb", id: { in: listingIds }, gone: false }, include: { links: true } });
  let n = 0;
  for (const l of listings) {
    if (l.links.length) continue;
    let d: cx.AirbnbDetails | null = null;
    try {
      d = await cx.airbnbListingDetails(account.channexChannelId, l.externalId);
    } catch {
      d = null;
    }
    const title = (d?.title || l.name).slice(0, 120);
    await prisma.$transaction(async (tx) => {
      const prop = await tx.property.create({
        data: {
          brokerId,
          createdById: userId,
          nickname: title,
          titleEn: title,
          descriptionEn: d?.description ?? "",
          address: d?.address ?? "",
          currency: d?.currency && /^[A-Z]{3}$/.test(d.currency) ? d.currency : "EGP",
          maxGuests: d?.guests ?? l.guests ?? null,
          latitude: d?.lat ?? null,
          longitude: d?.lng ?? null,
        },
      });
      const unit = await tx.unitType.create({
        data: {
          propertyId: prop.id,
          kind: "WHOLE",
          name: lang === "ar" ? "الشقة كاملة" : "Whole apartment",
          adults: Math.max(1, d?.guests ?? l.guests ?? 2),
          bedrooms: d?.bedrooms ?? null,
          beds: Math.max(1, d?.beds ?? 1),
          bathrooms: d?.bathrooms ?? null,
        },
      });
      await tx.ratePlan.create({
        data: { unitTypeId: unit.id, name: lang === "ar" ? "السعر القياسي" : "Standard rate", price: d?.price ?? 0, guests: Math.max(1, d?.guests ?? l.guests ?? 2) },
      });
      await tx.channelLink.create({ data: { unitTypeId: unit.id, platform: "abb", listingId: l.id } });
    });
    n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Links

export async function unitOf(brokerId: string, unitTypeId: string) {
  return prisma.unitType.findFirst({
    where: { id: unitTypeId, property: { brokerId, archivedAt: null } },
    include: {
      property: { select: { id: true, nickname: true, channexId: true, status: true } },
      rates: { orderBy: { createdAt: "asc" } },
    },
  });
}

function unitView(u: NonNullable<Awaited<ReturnType<typeof unitOf>>>): UnitView {
  return {
    id: u.id,
    propertyId: u.propertyId,
    name: u.name,
    count: u.count,
    guests: u.adults + u.children,
    rates: u.rates.map((r) => ({ id: r.id, name: r.name, derived: !!r.parentId })),
  };
}

export async function linkListing(brokerId: string, unitTypeId: string, platform: string, listingId: string): Promise<"ok" | "taken" | "failed"> {
  const [unit, listing] = await Promise.all([unitOf(brokerId, unitTypeId), prisma.channelListing.findFirst({ where: { id: listingId, brokerId, platform, gone: false } })]);
  if (!unit || !listing) return "failed";
  if (listing.propertyId && listing.propertyId !== unit.propertyId) return "failed";
  const p = platformById(platform);
  if (!p) return "failed";
  if (isPropertyLevel(p)) {
    const conn = await prisma.channelConnection.findUnique({ where: { platform_propertyId: { platform, propertyId: unit.propertyId } } });
    if (conn?.state !== "CONNECTED") return "failed";
  } else {
    const acc = await prisma.channelAccount.findUnique({ where: { brokerId_platform: { brokerId, platform } } });
    if (acc?.state !== "CONNECTED" && acc?.state !== "ATTENTION") return "failed";
  }
  const taken = await prisma.channelLink.findFirst({ where: { platform, listingId, NOT: { unitTypeId } } });
  if (taken) return "taken";
  const already = await prisma.channelLink.findUnique({ where: { unitTypeId_platform: { unitTypeId, platform } } });
  if (already) return "taken";
  await prisma.channelLink.create({
    data: {
      unitTypeId,
      platform,
      listingId,
      ratePlans: listing.rates && (listing.rates as PlatformRate[]).length ? (defaultRatePlans(listing.rates as PlatformRate[], unitView(unit)) as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });
  return "ok";
}

export async function saveRatePlans(brokerId: string, unitTypeId: string, platform: string, raw: unknown): Promise<"ok" | "none" | "failed"> {
  const unit = await unitOf(brokerId, unitTypeId);
  const link = unit ? await prisma.channelLink.findUnique({ where: { unitTypeId_platform: { unitTypeId, platform } }, include: { listing: true } }) : null;
  if (!unit || !link) return "failed";
  const checked = checkRatePlans(raw, (link.listing.rates as PlatformRate[]) ?? [], unitView(unit));
  if (checked === null) return "failed";
  if (checked === "none") return "none";
  await prisma.channelLink.update({ where: { id: link.id }, data: { ratePlans: checked as Prisma.InputJsonValue } });
  if (link.syncOn) await startLink(brokerId, link.id);
  return "ok";
}

// Upcoming (not cancelled) bookings on a unit type from a platform.
export async function upcoming(brokerId: string, unitTypeId: string, platform?: string) {
  return prisma.channelBooking.count({
    where: { brokerId, unitTypeId, ...(platform ? { platform } : {}), status: { not: "cancelled" }, departure: { gt: new Date(calendarToday()) } },
  });
}

export async function unlink(brokerId: string, unitTypeId: string, platform: string): Promise<"ok" | "blocked" | "failed"> {
  const unit = await unitOf(brokerId, unitTypeId);
  const link = unit ? await prisma.channelLink.findUnique({ where: { unitTypeId_platform: { unitTypeId, platform } } }) : null;
  if (!unit || !link) return "failed";
  if (await upcoming(brokerId, unitTypeId, platform)) return "blocked";
  if (link.syncOn || link.mappingIds.length) await stopLink(brokerId, link.id);
  await prisma.channelLink.delete({ where: { id: link.id } });
  await prisma.channelIssue.updateMany({ where: { brokerId, unitTypeId, platform, dismissedAt: null, kind: "unlisted" }, data: { dismissedAt: new Date() } });
  return "ok";
}

export async function dismissSuggestion(brokerId: string, unitTypeId: string, listingId: string): Promise<boolean> {
  const [unit, listing] = await Promise.all([unitOf(brokerId, unitTypeId), prisma.channelListing.findFirst({ where: { id: listingId, brokerId } })]);
  if (!unit || !listing) return false;
  if (!listing.dismissed.includes(unitTypeId)) await prisma.channelListing.update({ where: { id: listing.id }, data: { dismissed: { push: unitTypeId } } });
  return true;
}

// Confirms the suggested matches of these unit types (or all of them).
export async function confirmSuggestions(brokerId: string, unitTypeIds: string[] | null): Promise<number> {
  const s = await brokerState(brokerId);
  const sugg = suggestions(s);
  let n = 0;
  for (const [key, listingId] of Object.entries(sugg)) {
    const [unitTypeId, platform] = key.split("|");
    if (unitTypeIds && !unitTypeIds.includes(unitTypeId)) continue;
    if ((await linkListing(brokerId, unitTypeId, platform, listingId)) === "ok") n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Syncing

export type LinkFailure = NonNullable<LinkView["error"]>;
export type SyncOutcome = { linkId: string; unitTypeId: string; platform: string; ok: boolean; error: LinkFailure | null };

const numeric = (v: string) => (/^\d{1,15}$/.test(v) ? Number(v) : v);

// Makes (or finds) the Channex channel a link syncs through.
async function channelFor(brokerId: string, p: Platform, propertyId: string, channexPropertyId: string): Promise<{ id: string; rateParams: string[] }> {
  const broker = await prisma.broker.findUnique({ where: { id: brokerId }, select: { channexGroupId: true, companyName: true } });
  if (!broker?.channexGroupId) throw new ChannexError(0, null);
  if (isPropertyLevel(p)) {
    const conn = await prisma.channelConnection.findUnique({ where: { platform_propertyId: { platform: p.id, propertyId } }, include: { property: { select: { nickname: true } } } });
    const saved = openSettings(conn?.settings) as { code?: string; settings?: Record<string, unknown> } | null;
    if (!conn || !saved?.code || !saved.settings) throw new ChannexError(0, null);
    const a = await cx.adapter(saved.code).catch(() => null);
    if (conn.channexChannelId && (await cx.channelInfo(conn.channexChannelId))) return { id: conn.channexChannelId, rateParams: a?.rateParams ?? [] };
    const id = await cx.createChannel({ code: saved.code, groupId: broker.channexGroupId, title: `${conn.property.nickname} · ${p.name}`.slice(0, 100), propertyIds: [channexPropertyId], settings: saved.settings });
    await prisma.channelConnection.update({ where: { id: conn.id }, data: { channexChannelId: id } });
    return { id, rateParams: a?.rateParams ?? [] };
  }
  const acc = await prisma.channelAccount.findUnique({ where: { brokerId_platform: { brokerId, platform: p.id } } });
  if (!acc) throw new ChannexError(0, null);
  if (p.id === "abb") {
    if (!acc.channexChannelId) throw new ChannexError(0, null);
    return { id: acc.channexChannelId, rateParams: ["listing_id"] };
  }
  const saved = openSettings(acc.settings) as { code?: string; settings?: Record<string, unknown> } | null;
  if (!saved?.code || !saved.settings) throw new ChannexError(0, null);
  const a = await cx.adapter(saved.code).catch(() => null);
  if (acc.channexChannelId) {
    const info = await cx.channelInfo(acc.channexChannelId);
    if (info) {
      if (!info.properties.includes(channexPropertyId)) await cx.updateChannelProperties(acc.channexChannelId, [...info.properties, channexPropertyId]);
      return { id: acc.channexChannelId, rateParams: a?.rateParams ?? [] };
    }
  }
  const id = await cx.createChannel({ code: saved.code, groupId: broker.channexGroupId, title: `${broker.companyName} · ${p.name}`.slice(0, 100), propertyIds: [channexPropertyId], settings: saved.settings });
  await prisma.channelAccount.update({ where: { id: acc.id }, data: { channexChannelId: id } });
  return { id, rateParams: a?.rateParams ?? [] };
}

async function linkFull(linkId: string) {
  return prisma.channelLink.findUnique({
    where: { id: linkId },
    include: {
      listing: true,
      unitType: { include: { property: { select: { id: true, brokerId: true, channexId: true, status: true } }, rates: { orderBy: { createdAt: "asc" } } } },
    },
  });
}

// Turns syncing on for one link: the platform's rooms and rates get their
// Omnirent rates (with the platform's price adjustment), then the channel is
// activated, which sends full prices and availability first.
export async function startLink(brokerId: string, linkId: string): Promise<SyncOutcome> {
  const link = await linkFull(linkId);
  if (!link || link.unitType.property.brokerId !== brokerId) throw new Error("not found");
  const out = (ok: boolean, error: LinkFailure | null): SyncOutcome => ({ linkId, unitTypeId: link.unitTypeId, platform: link.platform, ok, error });
  const fail = async (error: LinkFailure) => {
    await prisma.channelLink.update({ where: { id: linkId }, data: { syncOn: false, status: "failed", error: error as unknown as Prisma.InputJsonValue } });
    return out(false, error);
  };
  const p = platformById(link.platform);
  if (!p) return fail({ code: "reach", msg: "" });
  const acc = await prisma.channelAccount.findUnique({ where: { brokerId_platform: { brokerId, platform: p.id } } });
  if (acc?.state === "ATTENTION") return fail({ code: "paused", msg: "" });
  const prop = link.unitType.property;
  const standard = link.unitType.rates.find((r) => !r.parentId);
  if (!prop.channexId || prop.status === "DRAFT" || !link.unitType.channexId || !standard?.channexId) return fail({ code: "unpublished", msg: "" });
  if (!channexConfigured()) return fail({ code: "reach", msg: "" });
  const derived = derivedOption((acc?.priceMode ?? "same") as PriceMode, acc?.pricePct ?? 0);
  try {
    const channel = await channelFor(brokerId, p, prop.id, prop.channexId);
    for (const m of link.mappingIds) await cx.removeMapping(channel.id, m);
    const ids: string[] = [];
    if (p.id === "abb") {
      ids.push(await cx.createMapping(channel.id, standard.channexId, { listing_id: link.listing.externalId, ...(derived ? { derived_option: derived } : {}) }));
    } else {
      const rates = (link.listing.rates as PlatformRate[]) ?? [];
      const map = (link.ratePlans as Record<string, string> | null) ?? {};
      const targets = rates.length ? rates.filter((r) => (map[r.id] ?? standard.id) !== "none") : [{ id: link.listing.externalId, title: "", occupancy: null }];
      if (!targets.length) return fail({ code: "platform", msg: "" });
      for (const r of targets) {
        const rp = link.unitType.rates.find((x) => x.id === (map[r.id] ?? standard.id)) ?? standard;
        if (!rp.channexId) return fail({ code: "unpublished", msg: "" });
        const occupancy = Math.max(1, Math.min(r.occupancy ?? rp.guests, rp.guests || r.occupancy || 1));
        const all: Record<string, unknown> = {
          room_type_code: numeric(link.listing.externalId),
          rate_plan_code: numeric(r.id),
          occupancy,
          pricing_type: link.listing.pricingType ?? "Standard",
          primary_occ: true,
          readonly: false,
        };
        const settings = channel.rateParams.length ? Object.fromEntries(Object.entries(all).filter(([k]) => channel.rateParams.includes(k))) : all;
        if (derived) settings.derived_option = derived;
        ids.push(await cx.createMapping(channel.id, rp.channexId, settings));
      }
    }
    await prisma.channelLink.update({ where: { id: linkId }, data: { mappingIds: ids } });
    const problems = await cx.readiness(channel.id);
    if (problems.length) return fail({ code: "platform", msg: problems.join(" ").slice(0, 300) });
    await cx.activate(channel.id);
    await prisma.channelLink.update({ where: { id: linkId }, data: { syncOn: true, status: "live", error: Prisma.DbNull } });
    await cx.loadFutureReservations(channel.id, p.id === "abb" ? link.listing.externalId : undefined);
    return out(true, null);
  } catch (e) {
    if (e instanceof ChannexError && e.status >= 400 && e.status < 500) return fail({ code: "platform", msg: cx.channexMessage(e.body) });
    return fail({ code: "reach", msg: "" });
  }
}

// Turns syncing off for one link: its mappings are removed, and the channel
// is deactivated when nothing else syncs through it.
export async function stopLink(brokerId: string, linkId: string): Promise<void> {
  const link = await linkFull(linkId);
  if (!link || link.unitType.property.brokerId !== brokerId) return;
  const p = platformById(link.platform);
  let channelId: string | null = null;
  if (p && isPropertyLevel(p)) {
    channelId = (await prisma.channelConnection.findUnique({ where: { platform_propertyId: { platform: p.id, propertyId: link.unitType.propertyId } } }))?.channexChannelId ?? null;
  } else if (p) {
    channelId = (await prisma.channelAccount.findUnique({ where: { brokerId_platform: { brokerId, platform: p.id } } }))?.channexChannelId ?? null;
  }
  if (channelId && channexConfigured()) {
    try {
      for (const m of link.mappingIds) await cx.removeMapping(channelId, m);
      const others = await prisma.channelLink.count({
        where: {
          platform: link.platform,
          syncOn: true,
          NOT: { id: link.id },
          ...(p && isPropertyLevel(p) ? { unitType: { propertyId: link.unitType.propertyId } } : { unitType: { property: { brokerId } } }),
        },
      });
      if (!others) await cx.deactivate(channelId);
    } catch {
      // Stopped in Omnirent either way; the link no longer sends anything.
    }
  }
  await prisma.channelLink.update({ where: { id: link.id }, data: { syncOn: false, status: "off", error: Prisma.DbNull, mappingIds: [] } });
}

// After a reconnect, the links that were syncing start again.
async function resumeAll(brokerId: string, platform: string) {
  const links = await prisma.channelLink.findMany({ where: { platform, syncOn: true, unitType: { property: { brokerId } } }, select: { id: true } });
  for (const l of links) await startLink(brokerId, l.id).catch(() => undefined);
}

// A new price on the platform: links that sync get their mappings again.
export async function saveMarkup(brokerId: string, platform: string, mode: PriceMode, pct: number) {
  await prisma.channelAccount.upsert({
    where: { brokerId_platform: { brokerId, platform } },
    create: { brokerId, platform, priceMode: mode, pricePct: pct },
    update: { priceMode: mode, pricePct: pct },
  });
  await resumeAll(brokerId, platform);
}

export async function disconnectPlatform(brokerId: string, platform: string): Promise<"ok" | "blocked"> {
  const links = await prisma.channelLink.findMany({ where: { platform, unitType: { property: { brokerId } } }, select: { id: true, unitTypeId: true } });
  for (const l of links) if (await upcoming(brokerId, l.unitTypeId, platform)) return "blocked";
  for (const l of links) await stopLink(brokerId, l.id);
  const channels = [
    ...(await prisma.channelConnection.findMany({ where: { brokerId, platform }, select: { channexChannelId: true } })),
    ...(await prisma.channelAccount.findMany({ where: { brokerId, platform }, select: { channexChannelId: true } })),
  ]
    .map((c) => c.channexChannelId)
    .filter((x): x is string => !!x);
  if (channexConfigured()) {
    for (const id of channels) {
      await cx.deactivate(id).catch(() => undefined);
      await cx.deleteChannel(id).catch(() => undefined);
    }
  }
  await prisma.$transaction([
    prisma.channelLink.deleteMany({ where: { platform, unitType: { property: { brokerId } } } }),
    prisma.channelListing.deleteMany({ where: { brokerId, platform } }),
    prisma.channelConnection.deleteMany({ where: { brokerId, platform } }),
    prisma.channelAccount.updateMany({
      where: { brokerId, platform },
      data: { state: null, waitReason: null, account: "", settings: null, channexChannelId: null, oauthToken: null, oauthAt: null, connectedAt: null },
    }),
    prisma.channelIssue.updateMany({ where: { brokerId, platform, dismissedAt: null }, data: { dismissedAt: new Date() } }),
  ]);
  return "ok";
}

// ---------------------------------------------------------------------------
// Bookings and platform events (webhook, and the feed as a backup)

export async function ingestRevision(rev: Revision): Promise<void> {
  const prop = await prisma.property.findFirst({ where: { channexId: rev.propertyId }, select: { id: true, brokerId: true, unitTypes: { select: { id: true, channexId: true, name: true } } } });
  if (!prop) return;
  const room = rev.rooms[0];
  const unit = room?.roomTypeId ? prop.unitTypes.find((u) => u.channexId === room.roomTypeId) : undefined;
  const platform = platformFromOta(rev.otaName)?.id ?? "";
  const data = {
    brokerId: prop.brokerId,
    platform,
    propertyId: prop.id,
    unitTypeId: unit?.id ?? null,
    code: rev.code.slice(0, 80),
    guest: rev.guest.slice(0, 120),
    arrival: new Date(rev.arrival),
    departure: new Date(rev.departure),
    status: rev.status,
    rooms: Math.max(1, rev.rooms.filter((r) => !r.roomTypeId || r.roomTypeId === room?.roomTypeId).length),
  };
  const before = await prisma.channelBooking.findUnique({ where: { channexBookingId: rev.bookingId } });
  await prisma.channelBooking.upsert({ where: { channexBookingId: rev.bookingId }, create: { channexBookingId: rev.bookingId, ...data }, update: data });
  if (!unit && rev.status !== "cancelled" && !before) {
    await prisma.channelIssue.create({
      data: { brokerId: prop.brokerId, platform, kind: "unlinked", data: { code: data.code, room: "", from: rev.arrival, to: rev.departure, bookingId: rev.bookingId } },
    });
    await notify(prop.brokerId, platform || "abb", "unlinkedBooking", { code: data.code, room: "" }, "issues", true);
  }
}

// Platform events from the webhook: access removed, a listing unlisted,
// a price rejected.
export async function platformEvent(event: string, payload: Record<string, unknown>, channexPropertyId: string | null): Promise<void> {
  const channelId = typeof payload.channel_id === "string" ? payload.channel_id : null;
  const acc = channelId ? await prisma.channelAccount.findFirst({ where: { channexChannelId: channelId } }) : null;
  const conn = !acc && channelId ? await prisma.channelConnection.findFirst({ where: { channexChannelId: channelId }, include: { property: { select: { nickname: true } } } }) : null;
  const prop = channexPropertyId ? await prisma.property.findFirst({ where: { channexId: channexPropertyId }, select: { brokerId: true, id: true } }) : null;
  const brokerId = acc?.brokerId ?? conn?.brokerId ?? prop?.brokerId;
  if (!brokerId) return;
  const platform = acc?.platform ?? conn?.platform ?? "";
  const msg = cx.channexMessage(payload).slice(0, 300);

  if (event === "disconnect_channel" && acc && acc.state === "CONNECTED") {
    await prisma.channelAccount.update({ where: { id: acc.id }, data: { state: "ATTENTION" } });
    await notify(brokerId, platform, platform === "abb" ? "accessRemoved" : "loginStopped", {}, platform, true);
    return;
  }
  if (event === "disconnect_channel" && conn) {
    await prisma.channelLink.updateMany({
      where: { platform: conn.platform, syncOn: true, unitType: { propertyId: conn.propertyId } },
      data: { syncOn: false, status: "failed", error: { code: "platform", msg } },
    });
    await notify(brokerId, platform, "syncFail", { n: 1 }, "links", true);
    return;
  }
  if (event === "disconnect_listing") {
    const listingId = typeof payload.listing_id === "string" || typeof payload.listing_id === "number" ? String(payload.listing_id) : null;
    const listing = listingId ? await prisma.channelListing.findFirst({ where: { brokerId, platform: platform || "abb", externalId: listingId }, include: { links: true } }) : null;
    const unitTypeId = listing?.links[0]?.unitTypeId ?? null;
    if (listing && !(await prisma.channelIssue.findFirst({ where: { brokerId, kind: "unlisted", unitTypeId, platform: listing.platform, dismissedAt: null } }))) {
      await prisma.channelIssue.create({ data: { brokerId, platform: listing.platform, kind: "unlisted", unitTypeId, data: { room: listing.name } } });
    }
    return;
  }
  if (event === "rate_error" || event === "sync_error") {
    const recent = await prisma.channelIssue.findFirst({ where: { brokerId, kind: "rate", platform, dismissedAt: null, createdAt: { gt: new Date(Date.now() - 6 * 3600_000) } } });
    if (recent) return;
    await prisma.channelIssue.create({ data: { brokerId, platform, kind: "rate", data: { msg, date: typeof payload.date === "string" ? payload.date.slice(0, 10) : "" } } });
    await notify(brokerId, platform || "abb", "rate", {}, "issues", true);
  }
}

// Booking changes the webhook may have missed, read when the Channels page
// opens (at most every 15 minutes per company).
const lastFeed = new Map<string, number>();
export async function pullFeed(brokerId: string): Promise<void> {
  if (!channexConfigured()) return;
  if (Date.now() - (lastFeed.get(brokerId) ?? 0) < 15 * 60_000) return;
  lastFeed.set(brokerId, Date.now());
  const props = await prisma.property.findMany({ where: { brokerId, channexId: { not: null } }, select: { channexId: true } });
  const live = await prisma.channelLink.count({ where: { syncOn: true, unitType: { property: { brokerId } } } });
  if (!live) return;
  for (const p of props.slice(0, 20)) {
    try {
      for (const rev of await cx.revisionFeed(p.channexId!)) {
        await ingestRevision(rev);
        await cx.ackRevision(rev.id);
      }
    } catch {
      // Read again next time.
    }
  }
}

// ---------------------------------------------------------------------------
// Unit type delete guard (property page)

export async function unitHasUpcomingBookings(unitTypeId: string): Promise<boolean> {
  const n = await prisma.channelBooking.count({ where: { unitTypeId, status: { not: "cancelled" }, departure: { gt: new Date(calendarToday()) } } });
  return n > 0;
}

// The Connected platforms column of the properties list: how many platforms
// each property has a linked listing on.
export async function connectedCounts(brokerId: string): Promise<Record<string, number>> {
  const links = await prisma.channelLink.findMany({
    where: { unitType: { property: { brokerId } } },
    select: { platform: true, unitType: { select: { propertyId: true } } },
  });
  const sets: Record<string, Set<string>> = {};
  for (const l of links) (sets[l.unitType.propertyId] ??= new Set()).add(l.platform);
  return Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.size]));
}

// The ready message, signed with the broker's name and company.
export function messageFor(platform: Platform, property: string | null, pid: string, signer: string, company: string) {
  return readyMessage({ platform: platform.name, property, pid, signer, company });
}

export { dateRangeText };
