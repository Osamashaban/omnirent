// The Channex side of the Channels page: finding each platform's adapter,
// testing a property's connection, reading its rooms and rates, the Airbnb
// approval link and listings, mappings, activation, bookings and the
// webhook. Server only; every call goes through lib/channex.ts.

import { ChannexError, answerId, channex } from "./channex";
import type { Platform } from "./channel-catalog";
import {
  classifyFailure,
  parseAirbnbListings,
  parseCurrency,
  parseMappingDetails,
  parseRevision,
  testPassed,
  type AdapterParam,
  type Revision,
  type TestFailure,
} from "./channel-rules";

// ---------------------------------------------------------------------------
// Adapters

// Platforms whose adapter code is known; the rest are found by name in
// Channex's catalogue (GET /channels/list).
const KNOWN: Record<string, string> = {
  abb: "AirBNB",
  bdc: "BookingCom",
  exp: "Expedia",
  ago: "Agoda",
  vrbo: "VRBO",
  trip: "Ctrip",
  hw: "Hostelworld",
  goo: "GoogleHotelARI",
  check24: "Check24",
  crewdogs: "Crewdogs",
  didatravel: "DidaTravel",
  glampinghub: "GlampingHub",
  hipcamp: "Hipcamp",
  heytrip: "Heytrip",
  hookusbookus: "Hookusbookus",
  emergingtravelgroup: "Ostrovok",
  edreams: "eDreams",
  bedandbreakfastit: "BedAndBreakfastItaly",
  ctoutvertsecureholiday: "Ctoutvert",
  bookeasy: "Bookeasy",
};

export type Adapter = { code: string; title: string; params: AdapterParam[]; rateParams: string[] };

type CatalogRow = { code: string; title: string };
let catalog: { at: number; rows: CatalogRow[] } | null = null;

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");

async function adapterCatalog(): Promise<CatalogRow[]> {
  if (catalog && Date.now() - catalog.at < 6 * 3600_000) return catalog.rows;
  const answer = await channex("GET", "/channels/list");
  const data = (answer.body as { data?: unknown } | null)?.data ?? answer.body;
  const rows = (Array.isArray(data) ? data : [])
    .map((d) => {
      const x = d as { code?: unknown; title?: unknown; attributes?: { code?: unknown; title?: unknown } };
      const code = x.code ?? x.attributes?.code;
      const title = x.title ?? x.attributes?.title;
      return typeof code === "string" ? { code, title: typeof title === "string" ? title : code } : null;
    })
    .filter((r): r is CatalogRow => r !== null);
  catalog = { at: Date.now(), rows };
  return rows;
}

// The Channex adapter code of a platform, or null when Channex has none.
export async function adapterCode(p: Platform): Promise<string | null> {
  const rows = await adapterCatalog().catch(() => [] as CatalogRow[]);
  const known = KNOWN[p.id];
  if (known && (!rows.length || rows.some((r) => r.code === known))) return known;
  const n = norm(p.name);
  const hit =
    rows.find((r) => norm(r.title) === n || norm(r.code) === n) ??
    rows.find((r) => n.length >= 4 && (norm(r.title).startsWith(n) || n.startsWith(norm(r.title)) || norm(r.code) === n.slice(0, norm(r.code).length)));
  return hit?.code ?? known ?? null;
}

export async function adapter(code: string): Promise<Adapter> {
  const answer = await channex("GET", `/channels/adapter?code=${encodeURIComponent(code)}`);
  const d = (answer.body as { data?: Record<string, unknown> } | null)?.data ?? {};
  const attrs = ((d as { attributes?: Record<string, unknown> }).attributes ?? d) as Record<string, unknown>;
  const params = Object.entries((attrs.params ?? {}) as Record<string, { type?: unknown; position?: unknown; default?: unknown }>).map(([name, v]) => ({
    name,
    type: typeof v?.type === "string" ? v.type : "string",
    position: typeof v?.position === "number" ? v.position : 0,
    default: v?.default,
  }));
  return {
    code,
    title: typeof attrs.title === "string" ? attrs.title : code,
    params,
    rateParams: Object.keys((attrs.rate_params ?? {}) as Record<string, unknown>),
  };
}

// ---------------------------------------------------------------------------
// Testing a connection and reading the platform side

export type TestResult = { ok: true } | { ok: false; failure: TestFailure };

export async function testConnection(code: string, settings: Record<string, unknown>): Promise<TestResult> {
  try {
    const answer = await channex("POST", "/channels/test_connection", { channel: code, settings });
    if (testPassed(answer.body)) return { ok: true };
    return { ok: false, failure: classifyFailure(answer.body) };
  } catch (e) {
    if (e instanceof ChannexError && e.status >= 400 && e.status < 500) return { ok: false, failure: classifyFailure(e.body) };
    throw e;
  }
}

export async function mappingDetails(code: string, settings: Record<string, unknown>) {
  try {
    const answer = await channex("POST", "/channels/mapping_details", { channel: code, settings });
    return parseMappingDetails(answer.body);
  } catch (e) {
    if (e instanceof ChannexError && e.status >= 400 && e.status < 500) return { pricingType: null, rooms: [] };
    throw e;
  }
}

// The currency the property trades in on the platform, where it says.
export async function connectionCurrency(code: string, settings: Record<string, unknown>): Promise<string | null> {
  try {
    const answer = await channex("POST", "/channels/connection_details", { channel: code, settings });
    return parseCurrency(answer.body);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Channel connections and their mappings

export async function createChannel(o: { code: string; groupId: string; title: string; propertyIds: string[]; settings: Record<string, unknown> }): Promise<string> {
  return answerId(
    await channex("POST", "/channels", {
      channel: { channel: o.code, group_id: o.groupId, title: o.title, properties: o.propertyIds, settings: o.settings },
    }),
  );
}

export async function updateChannelProperties(channelId: string, propertyIds: string[]): Promise<void> {
  await channex("PUT", `/channels/${channelId}`, { channel: { properties: propertyIds } });
}

export async function channelInfo(channelId: string): Promise<{ active: boolean; properties: string[] } | null> {
  try {
    const answer = await channex("GET", `/channels/${channelId}`);
    const a = (answer.body as { data?: { attributes?: { is_active?: unknown; properties?: unknown } } } | null)?.data?.attributes;
    return { active: a?.is_active === true, properties: Array.isArray(a?.properties) ? (a!.properties as string[]) : [] };
  } catch (e) {
    if (e instanceof ChannexError && e.status === 404) return null;
    throw e;
  }
}

// One mapping: an Omnirent (Channex) rate plan sold on one room and rate of
// the platform. Returns the mapping id.
export async function createMapping(channelId: string, ratePlanId: string, settings: Record<string, unknown>): Promise<string> {
  return answerId(await channex("POST", `/channels/${channelId}/mappings`, { mapping: { rate_plan_id: ratePlanId, settings } }));
}

export async function removeMapping(channelId: string, mappingId: string): Promise<void> {
  try {
    await channex("DELETE", `/channels/${channelId}/mappings/${mappingId}`);
  } catch (e) {
    if (!(e instanceof ChannexError && e.status === 404)) throw e;
  }
}

// What Channex says blocks activation; empty when the channel is ready.
export async function readiness(channelId: string): Promise<string[]> {
  try {
    const answer = await channex("POST", `/channels/${channelId}/check_readiness`);
    const d = (answer.body as { data?: unknown } | null)?.data;
    const list = Array.isArray(d) ? d : Array.isArray((d as { errors?: unknown })?.errors) ? (d as { errors: unknown[] }).errors : [];
    return list.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).slice(0, 5);
  } catch (e) {
    if (e instanceof ChannexError && e.status >= 400 && e.status < 500) return [channexMessage(e.body)];
    throw e;
  }
}

export async function activate(channelId: string): Promise<void> {
  await channex("POST", `/channels/${channelId}/activate`);
}

export async function deactivate(channelId: string): Promise<void> {
  try {
    await channex("POST", `/channels/${channelId}/deactivate`);
  } catch (e) {
    if (!(e instanceof ChannexError && e.status === 404)) throw e;
  }
}

export async function deleteChannel(channelId: string): Promise<void> {
  try {
    await channex("DELETE", `/channels/${channelId}`);
  } catch (e) {
    if (!(e instanceof ChannexError && e.status === 404)) throw e;
  }
}

// The upcoming bookings already on the platform, imported in the background.
export async function loadFutureReservations(channelId: string, listingId?: string): Promise<void> {
  try {
    await channex("POST", `/channels/${channelId}/execute/load_future_reservations`, listingId ? { listing_id: listingId } : {});
  } catch {
    // Not every platform offers it; bookings still arrive as they change.
  }
}

// A short reason from a Channex error body, in the platform's words.
export function channexMessage(body: unknown): string {
  const b = body as { errors?: unknown; error?: unknown; message?: unknown } | null;
  const pick = (x: unknown): string => {
    if (!x) return "";
    if (typeof x === "string") return x;
    if (Array.isArray(x)) return x.map(pick).filter(Boolean).join(" ");
    if (typeof x === "object") {
      const o = x as Record<string, unknown>;
      if (typeof o.title === "string") return [o.title, pick(o.details)].filter(Boolean).join(": ");
      return Object.entries(o)
        .map(([k, v]) => (k === "code" ? "" : pick(v)))
        .filter(Boolean)
        .join(" ");
    }
    return String(x);
  };
  return (pick(b?.errors) || pick(b?.error) || pick(b?.message)).slice(0, 300);
}

// ---------------------------------------------------------------------------
// Airbnb

export async function airbnbLink(o: {
  groupId: string;
  propertyIds: string[];
  channelId?: string | null;
  redirect: string;
  failure: string;
  token: string;
  title: string;
}): Promise<string> {
  const answer = await channex("POST", "/meta/airbnb/connection_link", {
    connection_link: {
      group_id: o.groupId,
      properties: o.propertyIds,
      ...(o.channelId ? { channel_id: o.channelId } : {}),
      redirect_uri: o.redirect,
      failure_redirect_uri: o.failure,
      token: o.token,
      title: o.title,
      settings: { min_stay_type: "Arrival", booking_amount_settings: "Total Paid Amount", send_email_notifications: false },
    },
  });
  const url = (answer.body as { data?: { attributes?: { url?: unknown }; url?: unknown } } | null)?.data;
  const value = url?.attributes?.url ?? url?.url;
  if (typeof value !== "string" || !/^https:\/\//.test(value)) throw new ChannexError(502, answer.body);
  return value;
}

export async function airbnbListings(channelId: string) {
  return parseAirbnbListings((await channex("GET", `/channels/${channelId}/action/listings`)).body);
}

export type AirbnbDetails = {
  title: string;
  description: string;
  guests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  price: number | null;
  currency: string | null;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

export async function airbnbListingDetails(channelId: string, listingId: string): Promise<AirbnbDetails> {
  const answer = await channex("GET", `/channels/${channelId}/action/listing_details?listing_id=${encodeURIComponent(listingId)}`);
  const d = ((answer.body as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const desc = (d.descriptions ?? d.description) as unknown;
  const firstDesc = Array.isArray(desc) ? (desc[0] as Record<string, unknown> | undefined) : (desc as Record<string, unknown> | undefined);
  const pricing = (d.pricing_settings ?? {}) as Record<string, unknown>;
  return {
    title: str(d.name ?? d.title),
    description: str(firstDesc?.summary ?? firstDesc?.description ?? (typeof desc === "string" ? desc : "")).slice(0, 5000),
    guests: num(d.person_capacity),
    bedrooms: num(d.bedrooms),
    beds: num(d.beds),
    bathrooms: num(d.bathrooms),
    price: num(pricing.default_daily_price),
    currency: typeof pricing.listing_currency === "string" ? pricing.listing_currency : null,
    city: str(d.city),
    address: [str(d.street), str(d.apt)].filter(Boolean).join(", "),
    lat: num(d.lat),
    lng: num(d.lng),
  };
}

// ---------------------------------------------------------------------------
// Bookings

export async function bookingRevision(id: string): Promise<Revision | null> {
  return parseRevision((await channex("GET", `/booking_revisions/${encodeURIComponent(id)}`)).body);
}

export async function ackRevision(id: string): Promise<void> {
  try {
    await channex("POST", `/booking_revisions/${encodeURIComponent(id)}/ack`);
  } catch {
    // Unacknowledged revisions stay in the feed and are read again later.
  }
}

// Revisions not acknowledged yet, for a backup pull when a webhook was missed.
export async function revisionFeed(propertyId: string): Promise<Revision[]> {
  const answer = await channex("GET", `/booking_revisions/feed?filter[property_id]=${encodeURIComponent(propertyId)}`);
  const data = (answer.body as { data?: unknown } | null)?.data;
  return (Array.isArray(data) ? data : []).map((x) => parseRevision(x)).filter((r): r is Revision => r !== null);
}

// ---------------------------------------------------------------------------
// The webhook that tells us about bookings and platform events. One global
// webhook for the account, made the first time a platform connects.

let webhookChecked = false;

export async function ensureWebhook(callbackUrl: string, secret: string): Promise<void> {
  if (webhookChecked) return;
  const answer = await channex("GET", "/webhooks");
  const data = (answer.body as { data?: unknown } | null)?.data;
  const existing = (Array.isArray(data) ? data : []).find(
    (w) => (w as { attributes?: { callback_url?: unknown } }).attributes?.callback_url === callbackUrl,
  ) as { id?: string; attributes?: { is_active?: unknown; headers?: Record<string, unknown> } } | undefined;
  const webhook = {
    callback_url: callbackUrl,
    event_mask: "*",
    property_id: null,
    is_global: true,
    is_active: true,
    send_data: true,
    request_params: {},
    headers: { "x-omnirent-webhook-secret": secret },
  };
  if (!existing?.id) await channex("POST", "/webhooks", { webhook });
  else if (existing.attributes?.is_active !== true || existing.attributes?.headers?.["x-omnirent-webhook-secret"] !== secret)
    await channex("PUT", `/webhooks/${existing.id}`, { webhook });
  webhookChecked = true;
}
