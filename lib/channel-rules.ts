// ---------------------------------------------------------------------------
// The rules of the Channels page (design App_Channels, version 80), with no
// database or network: what state each platform is in, the counts on the
// cards, the filters, what each cell of the Apartments & links grid shows,
// the suggested matches, the price adjustment, the ready message for support
// and how Channex's answers are read. The screens and the server actions run
// the same rules, so a tampered request can't store what the screens refuse.
// ---------------------------------------------------------------------------

import { PLATFORMS, isPropertyLevel, platformById, type Platform } from "./channel-catalog.ts";

// What a card shows: connected, waiting for the platform, needs attention
// (the platform stopped accepting the login), not connected, rejected, or
// not for apartments.
export type St = "on" | "wait" | "attn" | "off" | "rej" | "na";

// The database states (enum ChannelState) as the screens name them.
export type DbState = "WAITING" | "CONNECTED" | "ATTENTION" | "REJECTED";
export const ST_OF: Record<DbState, St> = { WAITING: "wait", CONNECTED: "on", ATTENTION: "attn", REJECTED: "rej" };

export type AccountView = {
  platform: string;
  state: St | null;
  // While waiting: "confirm", "request" or "unk".
  waitReason: string | null;
  account: string;
  priceMode: PriceMode;
  pricePct: number;
};

export type ConnView = {
  id: string;
  platform: string;
  propertyId: string;
  state: St;
  // While waiting: "confirm", "sup" or "cur".
  waitReason: string | null;
  externalId: string;
  rejectReason: string | null;
  currency: string | null;
  exchangeRate: number | null;
};

export type PropView = { id: string; name: string; published: boolean; currency: string };
export type RateView = { id: string; name: string; derived: boolean };
export type UnitView = { id: string; propertyId: string; name: string; count: number; guests: number; rates: RateView[] };
export type PlatformRate = { id: string; title: string; occupancy: number | null };
export type ListingView = {
  id: string;
  platform: string;
  propertyId: string | null;
  externalId: string;
  name: string;
  city: string;
  guests: number | null;
  rates: PlatformRate[];
  gone: boolean;
  dismissed: string[];
};
export type LinkView = {
  id: string;
  unitTypeId: string;
  platform: string;
  listingId: string;
  syncOn: boolean;
  // "off", "live" or "failed".
  status: string;
  // Why syncing failed: the property isn't published yet, the platform
  // refused (msg is its own words), we couldn't reach it, or the platform's
  // login stopped.
  error: { code: "unpublished" | "platform" | "reach" | "paused"; msg: string } | null;
  ratePlans: Record<string, string> | null;
};
export type Booking = { code: string; guest: string; arrival: string; departure: string };

export type ChannelsState = {
  accounts: AccountView[];
  conns: ConnView[];
  props: PropView[];
  units: UnitView[];
  listings: ListingView[];
  links: LinkView[];
  // Upcoming bookings per link key (see linkKey).
  future: Record<string, Booking[]>;
  // Unit types with an unlisted-on-the-platform alert, per link key.
  unlisted: string[];
};

export const linkKey = (unitTypeId: string, platform: string) => `${unitTypeId}|${platform}`;

// ---------------------------------------------------------------------------
// Platform state

export function connsOf(s: Pick<ChannelsState, "conns">, platform: string): ConnView[] {
  return s.conns.filter((c) => c.platform === platform);
}

export function accountOf(s: Pick<ChannelsState, "accounts">, platform: string): AccountView | undefined {
  return s.accounts.find((a) => a.platform === platform);
}

// Property-level platforms are connected when one property is, waiting when
// one is waiting, rejected when the only tries were declined.
export function platformState(s: Pick<ChannelsState, "accounts" | "conns">, p: Platform): St {
  if (p.how === "na") return "na";
  if (isPropertyLevel(p)) {
    const v = connsOf(s, p.id).map((c) => c.state);
    if (v.includes("on")) return "on";
    if (v.includes("wait")) return "wait";
    if (v.includes("rej")) return "rej";
    return "off";
  }
  return accountOf(s, p.id)?.state ?? "off";
}

// The platforms that get a column in the links grid: every one that isn't
// off, rejected or unavailable.
export function linkColumns(s: Pick<ChannelsState, "accounts" | "conns">): Platform[] {
  return PLATFORMS.filter((p) => !["off", "na", "rej"].includes(platformState(s, p)));
}

export type Kpis = { on: number; wait: number; attn: number; live: number; units: number };

export function kpis(s: ChannelsState, issues: number): Kpis {
  const states = PLATFORMS.map((p) => platformState(s, p));
  const on = states.filter((x) => x === "on" || x === "attn").length;
  const wait = states.filter((x) => x === "wait").length;
  const attn = states.filter((x) => x === "attn" || x === "rej").length + issues;
  const live = s.units.filter((u) => s.links.some((l) => l.unitTypeId === u.id && l.syncOn)).length;
  return { on, wait, attn, live, units: s.units.length };
}

export type Filter = "all" | "on" | "wait" | "off";

export function matchesFilter(st: St, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "on") return st === "on" || st === "attn";
  if (f === "wait") return st === "wait";
  return st === "off" || st === "na" || st === "rej";
}

// The All platforms list: without a search or filter, the platforms outside
// the recommended eight; with one, every platform that matches.
export function platformList(s: Pick<ChannelsState, "accounts" | "conns">, q: string, f: Filter): Platform[] {
  const query = q.trim().toLowerCase();
  const byName = (p: Platform) => !query || p.name.toLowerCase().includes(query);
  if (!query && f === "all") return PLATFORMS.filter((p) => !p.rec);
  return PLATFORMS.filter((p) => byName(p) && matchesFilter(platformState(s, p), f));
}

export function filterCounts(s: Pick<ChannelsState, "accounts" | "conns">): Record<Filter, number> {
  const states = PLATFORMS.map((p) => platformState(s, p));
  const on = states.filter((x) => matchesFilter(x, "on")).length;
  const wait = states.filter((x) => x === "wait").length;
  return { all: PLATFORMS.length, on, wait, off: PLATFORMS.length - on - wait };
}

// Linked unit types on one platform.
export function linkedCount(s: Pick<ChannelsState, "links" | "units">, platform: string): number {
  return s.units.filter((u) => s.links.some((l) => l.unitTypeId === u.id && l.platform === platform)).length;
}

// ---------------------------------------------------------------------------
// The links grid

export type Cell =
  | { kind: "prop"; propertyId: string; rejected: boolean }
  | { kind: "wait"; property: boolean }
  | { kind: "linked"; link: LinkView; listing: ListingView | null; sub: "paused" | "unlisted" | "failed" | "live" | "off"; guests: [number, number] | null }
  | { kind: "sugg"; listing: ListingView }
  | { kind: "none" };

export function cellFor(s: ChannelsState, sugg: Record<string, string>, u: UnitView, p: Platform): Cell {
  const st = platformState(s, p);
  const link = s.links.find((l) => l.unitTypeId === u.id && l.platform === p.id);
  if (isPropertyLevel(p) && !link) {
    const c = s.conns.find((x) => x.platform === p.id && x.propertyId === u.propertyId);
    if (!c) return { kind: "prop", propertyId: u.propertyId, rejected: false };
    if (c.state === "rej") return { kind: "prop", propertyId: u.propertyId, rejected: true };
    if (c.state === "wait") return { kind: "wait", property: true };
  } else if (st === "wait") return { kind: "wait", property: false };
  if (link) {
    const listing = s.listings.find((l) => l.id === link.listingId) ?? null;
    const unl = s.unlisted.includes(linkKey(u.id, p.id));
    const sub = st === "attn" ? "paused" : unl ? "unlisted" : link.status === "failed" ? "failed" : link.syncOn ? "live" : "off";
    const g = listing?.guests ?? 0;
    return { kind: "linked", link, listing, sub, guests: u.guests && g && u.guests !== g ? [u.guests, g] : null };
  }
  const sg = sugg[linkKey(u.id, p.id)];
  const listing = sg ? s.listings.find((l) => l.id === sg) : undefined;
  if (listing) return { kind: "sugg", listing };
  return { kind: "none" };
}

// The listings a unit type can be linked to on a platform: for property-level
// platforms only the ones found on its own property. Each is marked with the
// unit type already using it.
export function pickList(s: ChannelsState, u: UnitView, platform: string): { listing: ListingView; usedBy: UnitView | null }[] {
  return s.listings
    .filter((l) => l.platform === platform && !l.gone && (!l.propertyId || l.propertyId === u.propertyId))
    .map((listing) => {
      const by = s.links.find((k) => k.platform === platform && k.listingId === listing.id && k.unitTypeId !== u.id);
      return { listing, usedBy: by ? (s.units.find((x) => x.id === by.unitTypeId) ?? null) : null };
    });
}

// ---------------------------------------------------------------------------
// Suggested matches: a listing and a unit type whose names share words, or
// the only room of a property connected on its own. Each unit type and each
// listing gets at most one suggestion; "Not this" is remembered per listing.

const STOP = new Set(["the", "and", "with", "for", "in", "on", "of", "at", "a", "an", "by", "to", "من", "في", "على", "مع", "و"]);

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٟ̀-ͯ]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

export function matchScore(listingName: string, propName: string, unitName: string): number {
  const a = new Set(words(listingName));
  const b = new Set([...words(propName), ...words(unitName)]);
  let n = 0;
  for (const w of a) if (b.has(w)) n += /^\d+$/.test(w) ? 0.5 : 1;
  return n;
}

export function suggestions(s: ChannelsState): Record<string, string> {
  const out: Record<string, string> = {};
  const propName = new Map(s.props.map((p) => [p.id, p.name]));
  for (const p of PLATFORMS) {
    const listings = s.listings.filter((l) => l.platform === p.id && !l.gone && !s.links.some((k) => k.platform === p.id && k.listingId === l.id));
    const free = s.units.filter((u) => !s.links.some((k) => k.platform === p.id && k.unitTypeId === u.id));
    const pairs: { l: ListingView; u: UnitView; score: number }[] = [];
    for (const l of listings) {
      for (const u of free) {
        if (l.dismissed.includes(u.id)) continue;
        if (l.propertyId && l.propertyId !== u.propertyId) continue;
        let score = matchScore(l.name, propName.get(u.propertyId) ?? "", u.name);
        if (l.propertyId) {
          // One room found for a property with one unit type: that's the match.
          const roomsHere = listings.filter((x) => x.propertyId === l.propertyId).length;
          const typesHere = s.units.filter((x) => x.propertyId === l.propertyId).length;
          if (roomsHere === 1 && typesHere === 1) score += 2;
        }
        if (score >= 1 && l.guests && l.guests === u.guests) score += 0.25;
        if (score >= 1) pairs.push({ l, u, score });
      }
    }
    pairs.sort((x, y) => y.score - x.score);
    const usedL = new Set<string>();
    const usedU = new Set<string>();
    for (const { l, u } of pairs) {
      if (usedL.has(l.id) || usedU.has(u.id)) continue;
      usedL.add(l.id);
      usedU.add(u.id);
      out[linkKey(u.id, p.id)] = l.id;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rate plans: which Omnirent rate each of the platform's rate plans gets.
// By default the non-refundable one gets the Omnirent rate derived from the
// standard rate (when there is one) and every other one the standard rate.

export const NO_RATE = "none";

export function defaultRatePlans(rates: PlatformRate[], unit: UnitView): Record<string, string> {
  const standard = unit.rates.find((r) => !r.derived);
  const derived = unit.rates.find((r) => r.derived);
  const out: Record<string, string> = {};
  for (const r of rates) {
    const nonRef = /non[\s-]?ref|غير قابل/i.test(r.title);
    out[r.id] = (nonRef && derived ? derived.id : standard?.id) ?? NO_RATE;
  }
  return out;
}

// Keeps only the platform's own rate plans and Omnirent rates of this unit
// type. At least one platform rate plan must get a rate.
export function checkRatePlans(raw: unknown, rates: PlatformRate[], unit: UnitView): Record<string, string> | "none" | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const allowed = new Set([NO_RATE, ...unit.rates.map((r) => r.id)]);
  const out: Record<string, string> = {};
  for (const r of rates) {
    const v = (raw as Record<string, unknown>)[r.id];
    if (typeof v !== "string" || !allowed.has(v)) return null;
    out[r.id] = v;
  }
  if (!Object.values(out).some((v) => v !== NO_RATE)) return "none";
  return out;
}

export function ratePlanCount(map: Record<string, string> | null): number {
  return map ? Object.values(map).filter((v) => v !== NO_RATE).length : 0;
}

// ---------------------------------------------------------------------------
// Price on this platform: the same as Omnirent, or higher or lower by 1 to 50%.

export const PRICE_MODES = ["same", "up", "down"] as const;
export type PriceMode = (typeof PRICE_MODES)[number];

export function checkMarkup(mode: unknown, pct: unknown): { mode: PriceMode; pct: number } | null {
  if (!PRICE_MODES.includes(mode as PriceMode)) return null;
  if (mode === "same") return { mode: "same", pct: 0 };
  const n = Number(pct);
  if (!Number.isInteger(n) || n < 1 || n > 50) return null;
  return { mode: mode as PriceMode, pct: n };
}

export function markedUp(price: number, mode: PriceMode, pct: number): number {
  if (mode === "up") return Math.round(price * (1 + pct / 100));
  if (mode === "down") return Math.round(price * (1 - pct / 100));
  return price;
}

// Channex's derived option on a mapping: the platform gets the Omnirent price
// moved by the percentage.
export function derivedOption(mode: PriceMode, pct: number): { rate: [string, string][] } | null {
  if (mode === "same" || !pct) return null;
  return { rate: [[mode === "up" ? "increase_by_percent" : "decrease_by_percent", String(pct)]] };
}

// ---------------------------------------------------------------------------
// The ready message the broker sends to the platform's support. English,
// because support teams work in English, and the one place besides the guide
// pictures that names our connection partner.

export function readyMessage(o: { platform: string; property: string | null; pid: string; signer: string; company: string }): string {
  const pid = o.pid.trim();
  return (
    `Hello ${o.platform} support team,\n\n` +
    (o.property ? `Please connect my property "${o.property}"` : "Please connect my properties") +
    (pid ? ` (property ID ${pid})` : "") +
    " to the channel manager Channex.io, for rates, availability and bookings.\n\n" +
    (pid ? "Please confirm once it is enabled." : "Please reply with my property ID once it is enabled.") +
    `\n\nThank you,\n${o.signer}${o.company ? `, ${o.company}` : ""}`
  );
}

// ---------------------------------------------------------------------------
// Connection settings: the guide's fields (pid, u, pw, tok, name) turned into
// the settings Channex's adapter for the platform asks for.

export type AdapterParam = { name: string; type: string; position: number; default?: unknown };

export function settingsFor(params: AdapterParam[], fields: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const used = new Set<string>();
  const sorted = [...params].filter((p) => p.type !== "hidden").sort((a, b) => a.position - b.position);
  const pick = (name: string) => {
    const n = name.toLowerCase();
    if (/pass|secret/.test(n)) return "pw";
    if (/token|api_?key|access/.test(n)) return "tok";
    if (/user|login|email/.test(n)) return "u";
    if (/name/.test(n) && !/hotel|property/.test(n)) return "name";
    if (/hotel|property|code|_id$|^id$/.test(n)) return "pid";
    return null;
  };
  for (const p of sorted) {
    if (p.type === "boolean") {
      if (p.default !== undefined) out[p.name] = p.default;
      continue;
    }
    const key = pick(p.name);
    if (key && fields[key]?.trim() && !used.has(key)) {
      out[p.name] = fields[key].trim();
      used.add(key);
    } else if (p.default !== undefined && p.default !== null) out[p.name] = p.default;
  }
  // Anything the names didn't place goes to the remaining text params in order.
  const left = ["pid", "u", "pw", "tok", "name"].filter((k) => fields[k]?.trim() && !used.has(k));
  for (const p of sorted) {
    if (!left.length) break;
    if (p.type === "boolean" || p.type === "select" || out[p.name] !== undefined) continue;
    out[p.name] = fields[left.shift()!].trim();
  }
  return out;
}

// The fields a guide asks for, as the broker typed them: only known keys,
// trimmed, at most 200 characters.
export function readFields(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const k of ["pid", "u", "pw", "tok", "name"]) {
    const v = (raw as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (typeof v !== "string" || v.length > 200) return null;
    if (v.trim()) out[k] = v.trim();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reading Channex's answers

// Why a connection test failed: the property is still with another channel
// manager, the login was refused, the platform wants a code, or we couldn't
// reach the property.
export type TestFailure = "cm" | "auth" | "otp" | "reach";

export function classifyFailure(body: unknown): TestFailure {
  const text = JSON.stringify(body ?? "").toLowerCase();
  if (/channel manager|another (cm|provider|connectivity)|already (connected|mapped|in use|used)|in use by|connected to (an)?other/.test(text)) return "cm";
  if (/otp|verification code|one[- ]time|two[- ]factor|2fa|sms code|security code|mfa/.test(text)) return "otp";
  if (/password|credential|unauthori[sz]ed|invalid login|wrong login|authentication/.test(text)) return "auth";
  return "reach";
}

// test_connection answers 200 with { data: { success, errors } }.
export function testPassed(body: unknown): boolean {
  return (body as { data?: { success?: unknown } } | null)?.data?.success === true;
}

export type MappedRoom = { id: string; title: string; maxPersons: number | null; rates: PlatformRate[] };

// The rooms and rates the platform has for this property (mapping_details).
export function parseMappingDetails(body: unknown): { pricingType: string | null; rooms: MappedRoom[] } {
  const data = (body as { data?: { pricing_type?: unknown; rooms?: unknown } } | null)?.data;
  const rooms = Array.isArray(data?.rooms) ? data!.rooms : [];
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    pricingType: typeof data?.pricing_type === "string" ? data.pricing_type : null,
    rooms: rooms
      .map((r) => r as { id?: unknown; title?: unknown; max_persons?: unknown; rates?: unknown })
      .filter((r) => r.id !== undefined && r.id !== null)
      .map((r) => {
        const rates = (Array.isArray(r.rates) ? r.rates : [])
          .map((x) => x as { id?: unknown; title?: unknown; max_persons?: unknown })
          .filter((x) => x.id !== undefined && x.id !== null)
          .map((x) => ({ id: String(x.id), title: String(x.title ?? x.id), occupancy: num(x.max_persons) }));
        const maxPersons = num(r.max_persons) ?? rates.reduce<number | null>((m, x) => (x.occupancy && (!m || x.occupancy > m) ? x.occupancy : m), null);
        return { id: String(r.id), title: String(r.title ?? r.id), maxPersons, rates };
      }),
  };
}

export function parseCurrency(body: unknown): string | null {
  const c = (body as { data?: { attributes?: { currency?: unknown } } } | null)?.data?.attributes?.currency;
  return typeof c === "string" && /^[A-Z]{3}$/.test(c) ? c : null;
}

// Airbnb listings (GET /channels/:id/action/listings).
export function parseAirbnbListings(body: unknown): { id: string; title: string; guests: number | null; city: string }[] {
  const values = (body as { data?: { listing_id_dictionary?: { values?: unknown } } } | null)?.data?.listing_id_dictionary?.values;
  return (Array.isArray(values) ? values : [])
    .map((v) => v as { id?: unknown; title?: unknown; occupancies?: unknown; person_capacity?: unknown; city?: unknown })
    .filter((v) => v.id !== undefined && v.id !== null)
    .map((v) => {
      const occ = Array.isArray(v.occupancies) ? (v.occupancies as unknown[]).filter((x): x is number => typeof x === "number") : [];
      const guests = typeof v.person_capacity === "number" ? v.person_capacity : occ.length ? Math.max(...occ) : null;
      return { id: String(v.id), title: String(v.title ?? v.id), guests, city: typeof v.city === "string" ? v.city : "" };
    });
}

// A booking revision as Channex sends it (GET /booking_revisions/:id).
export type Revision = {
  id: string;
  bookingId: string;
  propertyId: string;
  otaName: string;
  code: string;
  status: "new" | "modified" | "cancelled";
  guest: string;
  arrival: string;
  departure: string;
  rooms: { roomTypeId: string | null; ratePlanId: string | null; arrival: string; departure: string }[];
};

const iso = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

export function parseRevision(raw: unknown): Revision | null {
  const d = (raw as { data?: unknown } | null)?.data ?? raw;
  const r = d as { id?: unknown; attributes?: Record<string, unknown> } | null;
  const a = r?.attributes;
  if (!a || typeof r?.id !== "string") return null;
  const status = a.status === "cancelled" ? "cancelled" : a.status === "modified" ? "modified" : "new";
  const arrival = iso(a.arrival_date);
  const departure = iso(a.departure_date);
  if (!arrival || !departure || typeof a.property_id !== "string") return null;
  const customer = (a.customer ?? {}) as { name?: unknown; surname?: unknown };
  const rooms = (Array.isArray(a.rooms) ? a.rooms : []).map((x) => {
    const room = x as Record<string, unknown>;
    return {
      roomTypeId: typeof room.room_type_id === "string" ? room.room_type_id : null,
      ratePlanId: typeof room.rate_plan_id === "string" ? room.rate_plan_id : null,
      arrival: iso(room.checkin_date) ?? arrival,
      departure: iso(room.checkout_date) ?? departure,
    };
  });
  return {
    id: r.id,
    bookingId: typeof a.booking_id === "string" ? a.booking_id : r.id,
    propertyId: a.property_id,
    otaName: typeof a.ota_name === "string" ? a.ota_name : "",
    code: String(a.ota_reservation_code ?? a.unique_id ?? ""),
    status,
    guest: [customer.name, customer.surname].filter((x) => typeof x === "string" && x).join(" "),
    arrival,
    departure,
    rooms,
  };
}

// The catalog platform a booking came from, by Channex's OTA name.
export function platformFromOta(ota: string): Platform | undefined {
  const n = ota.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!n) return undefined;
  const alias: Record<string, string> = { bookingcom: "bdc", booking: "bdc", airbnb: "abb", expedia: "exp", agoda: "ago", vrbo: "vrbo", homeaway: "vrbo", tripcom: "trip", ctrip: "trip", hostelworld: "hw", google: "goo", googlehotelari: "goo" };
  if (alias[n]) return platformById(alias[n]);
  return PLATFORMS.find((p) => p.name.toLowerCase().replace(/[^a-z0-9]/g, "") === n);
}

// Nights booked per unit type and date, from the bookings that aren't
// cancelled (departure day not included).
export function bookedNights(bookings: { unitTypeId: string | null; arrival: string; departure: string; status: string; rooms: number }[]) {
  const out = new Map<string, number>();
  for (const b of bookings) {
    if (!b.unitTypeId || b.status === "cancelled") continue;
    for (let d = new Date(`${b.arrival}T00:00:00Z`); d.toISOString().slice(0, 10) < b.departure; d.setUTCDate(d.getUTCDate() + 1)) {
      const k = `${b.unitTypeId}|${d.toISOString().slice(0, 10)}`;
      out.set(k, (out.get(k) ?? 0) + Math.max(1, b.rooms));
    }
  }
  return out;
}
