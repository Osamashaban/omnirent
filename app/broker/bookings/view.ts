// How a booking or guest is written on screen: labels, dates, price lines,
// guest stats. Shared by the Bookings and Guests pages; no server code.

import type { BookingDict } from "@/lib/booking-i18n";
import type { BookingView, BookingsData, GuestView } from "@/lib/booking-data";
import { DIRECT, commissionPct, doubleBooked, guestTags, initialsOf, round2, type GuestTag } from "@/lib/booking-rules";

// The unit name is wrapped in bidi isolates so an English name like
// "2-bedroom chalet" keeps its order inside Arabic text.
export function unitLabel(t: BookingDict, b: Pick<BookingView, "unitName" | "count" | "apt">, long = false): string {
  const name = `\u2068${b.unitName}\u2069`;
  return b.count > 1 ? `${name} · ${long ? t.apartment(b.apt) : t.apt(b.apt)}` : name;
}

export function datesText(t: BookingDict, arrival: string, departure: string): string {
  return `${t.day(arrival)}${t.arrow}${t.day(departure)}`;
}

export function nightsCount(b: Pick<BookingView, "arrival" | "departure">): number {
  return Math.max(0, Math.round((Date.parse(`${b.departure}T00:00:00Z`) - Date.parse(`${b.arrival}T00:00:00Z`)) / 86_400_000));
}

export type PayTone = "ota" | "unpaid" | "part" | "paid" | "none";
export function payLabel(t: BookingDict, b: BookingView): string {
  return b.payState === "ota" ? t.paidVia(b.platformName) : t.pay[b.payState];
}

export function stayAmount(b: BookingView): number {
  const sum = b.nightly.reduce((a, n) => a + n.p, 0);
  if (sum > 0) return round2(sum);
  return Math.max(0, round2(b.total - b.cleaning - (b.platform === "abb" ? 0 : b.tax)));
}

// The price card of the booking detail, as in the design: one line per night,
// then stay, cleaning, VAT, total, commission and payout.
export function priceLines(t: BookingDict, b: BookingView) {
  const nights = nightsCount(b);
  const acc = stayAmount(b);
  const nightRows = b.nightly.map((n) => ({ k: t.day(n.d), v: t.money(n.p, b.currency) }));
  const lines: { k: string; v: string; strong: boolean }[] = [{ k: t.stayN(t.nights(nights)), v: t.money(acc, b.currency), strong: false }];
  if (b.cleaning) lines.push({ k: t.cleaning, v: t.money(b.cleaning, b.currency), strong: false });
  if (b.tax) lines.push({ k: b.platform === "bdc" || b.platform === "exp" ? t.vat : t.tax, v: t.money(b.tax, b.currency), strong: false });
  lines.push({ k: b.platform === "abb" ? t.bookingTotalAbb : t.bookingTotal, v: t.money(b.total, b.currency), strong: true });
  if (b.commission) {
    const pct = commissionPct({ nights: acc, cleaning: b.cleaning, tax: b.tax, total: b.total, commission: b.commission });
    lines.push({ k: b.platform === "abb" ? t.abbFee(pct) : t.commission(b.platformName, pct), v: `− ${t.money(b.commission, b.currency)}`, strong: false });
  }
  if (b.platform !== DIRECT) lines.push({ k: t.yourPayoutLine, v: t.money(round2(b.total - b.commission - b.tax), b.currency), strong: true });
  return { nightRows, lines };
}

export type GuestStats = { n: number; nights: number; spent: number; last: BookingView | null; platforms: string[]; all: BookingView[]; upcoming: BookingView[]; current: BookingView | null };

export function statsOf(bookings: BookingView[]): Map<string, GuestStats> {
  const out = new Map<string, GuestStats>();
  for (const b of bookings) {
    if (!b.guestId) continue;
    const s = out.get(b.guestId) ?? { n: 0, nights: 0, spent: 0, last: null, platforms: [], all: [], upcoming: [], current: null };
    s.all.push(b);
    if (b.status !== "canc") {
      s.n += 1;
      s.nights += nightsCount(b);
      s.spent = round2(s.spent + b.total);
      if (!s.last || b.arrival > s.last.arrival) s.last = b;
      if (!s.platforms.includes(b.platformName)) s.platforms.push(b.platformName);
      if (b.stage === "up" || b.stage === "arr" || b.stage === "stay" || b.stage === "dep") s.upcoming.push(b);
      if (b.stage === "stay" || b.stage === "arr" || b.stage === "dep") s.current = b;
    }
    out.set(b.guestId, s);
  }
  return out;
}

const EMPTY: GuestStats = { n: 0, nights: 0, spent: 0, last: null, platforms: [], all: [], upcoming: [], current: null };
export const statsFor = (m: Map<string, GuestStats>, id: string) => m.get(id) ?? EMPTY;

export function tagsOf(g: GuestView, s: GuestStats): GuestTag[] {
  return g.deleted ? [] : guestTags({ stays: s.n, vip: g.vip, blocked: g.blocked });
}

export const guestIni = (name: string) => initialsOf(name);

export function overIds(data: BookingsData): Set<string> {
  return doubleBooked(
    data.bookings.map((b) => ({ id: b.id, unitTypeId: b.unitTypeId, apt: b.apt, arrival: b.arrival, departure: b.departure, cancelled: b.status === "canc" })),
    data.today,
  );
}

export function overlapsB(a: Pick<BookingView, "arrival" | "departure">, b: Pick<BookingView, "arrival" | "departure">) {
  return a.arrival < b.departure && b.arrival < a.departure;
}

// The other booking in the same apartment on the same nights, and an
// identical apartment that is free for this stay.
export function clashOf(b: BookingView, all: BookingView[]) {
  const other = all.find((x) => x.id !== b.id && x.status !== "canc" && x.unitTypeId === b.unitTypeId && x.apt === b.apt && overlapsB(x, b)) ?? null;
  let free: number | null = null;
  if (other)
    for (let a = 1; a <= b.count; a++) {
      if (a === b.apt) continue;
      if (!all.some((x) => x.id !== b.id && x.status !== "canc" && x.unitTypeId === b.unitTypeId && x.apt === a && overlapsB(x, b))) {
        free = a;
        break;
      }
    }
  return { other, free };
}

export function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
