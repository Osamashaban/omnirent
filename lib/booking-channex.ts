// The connection partner's side of the Bookings page: direct bookings
// recorded there (so every platform sees the dates closed), Airbnb requests
// and inquiries from the live feed and their answers, and Booking.com
// reports. Server only; every call goes through lib/channex.ts.
//
// Paths follow the partner's documentation (docs.channex.io, read 22 Nov
// 2026): Booking CRS API (beta), Live Feed "resolve", Booking.com Reporting
// API. Cancelling a direct booking there isn't documented, so it is tried as
// a modification to "cancelled"; the dates reopen through availability either
// way (see lib/booking-data.ts).

import { channex, channexConfigured } from "./channex";
import { declineReasonCode, parseLiveRequest, type DeclineReason, type LiveRequest } from "./booking-rules";

export function partnerOn(): boolean {
  return channexConfigured();
}

export type CrsBooking = {
  propertyId: string;
  roomTypeId: string;
  ratePlanId: string | null;
  code: string;
  arrival: string;
  departure: string;
  arrivalTime: string;
  currency: string;
  nightly: { d: string; p: number }[];
  adults: number;
  children: number;
  name: string;
  phone: string;
  note: string;
};

function crsBody(b: CrsBooking, status?: "modified" | "cancelled") {
  const [first, ...rest] = b.name.trim().split(/\s+/);
  return {
    booking: {
      ...(status ? { status } : {}),
      property_id: b.propertyId,
      ota_reservation_code: b.code,
      ota_name: "Offline",
      arrival_date: b.arrival,
      departure_date: b.departure,
      ...(b.arrivalTime ? { arrival_hour: b.arrivalTime } : {}),
      payment_collect: "property",
      currency: b.currency,
      notes: b.note.slice(0, 500),
      customer: { name: first ?? "", surname: rest.join(" "), phone: b.phone },
      rooms: [
        {
          room_type_id: b.roomTypeId,
          ...(b.ratePlanId ? { rate_plan_id: b.ratePlanId } : {}),
          days: Object.fromEntries(b.nightly.map((n) => [n.d, n.p.toFixed(2)])),
          occupancy: { adults: b.adults, children: b.children, infants: 0 },
        },
      ],
    },
  };
}

// The partner's booking id, or null when it isn't recorded there (the
// property doesn't have the CRS app, or the partner can't be reached).
export async function createCrsBooking(b: CrsBooking): Promise<string | null> {
  if (!channexConfigured()) return null;
  try {
    const answer = await channex("POST", "/bookings", crsBody(b));
    const a = (answer.body as { data?: { id?: unknown; attributes?: { booking_id?: unknown } } } | null)?.data;
    const id = typeof a?.attributes?.booking_id === "string" ? a.attributes.booking_id : typeof a?.id === "string" ? a.id : null;
    return id;
  } catch {
    return null;
  }
}

export async function cancelCrsBooking(channexBookingId: string, b: CrsBooking): Promise<void> {
  if (!channexConfigured()) return;
  try {
    await channex("PUT", `/bookings/${encodeURIComponent(channexBookingId)}`, crsBody(b, "cancelled"));
  } catch {
    // The dates reopen through availability anyway.
  }
}

// A direct booking changed here (dates, apartment type, guests, price):
// recorded with the partner as a modification. Returns false when the partner
// couldn't be reached; the nights are sent through availability either way.
export async function modifyCrsBooking(channexBookingId: string, b: CrsBooking): Promise<boolean> {
  if (!channexConfigured()) return false;
  try {
    await channex("PUT", `/bookings/${encodeURIComponent(channexBookingId)}`, crsBody(b, "modified"));
    return true;
  } catch {
    return false;
  }
}

// Booking.com reports (Booking.com Reporting API). Throws when the partner
// refuses.
export async function reportNoShow(channexBookingId: string, waived = false): Promise<void> {
  await channex("POST", `/bookings/${encodeURIComponent(channexBookingId)}/no_show`, { no_show_report: { waived_fees: waived } });
}

export async function reportInvalidCard(channexBookingId: string): Promise<void> {
  await channex("POST", `/bookings/${encodeURIComponent(channexBookingId)}/invalid_card`, {});
}

// Booking.com cancels the booking with no fee, once the guest had 24 hours to
// update the card.
export async function cancelDueInvalidCard(channexBookingId: string): Promise<void> {
  await channex("POST", `/bookings/${encodeURIComponent(channexBookingId)}/cancel_due_invalid_card`, {});
}

// Open Airbnb requests to book and inquiries for a property.
export async function liveRequests(channexPropertyId: string): Promise<LiveRequest[]> {
  if (!channexConfigured()) return [];
  const out: LiveRequest[] = [];
  for (const event of ["reservation_request", "inquiry", "alteration_request"]) {
    const answer = await channex(
      "GET",
      `/live_feed?filter[event]=${event}&filter[property_id]=${encodeURIComponent(channexPropertyId)}&order[inserted_at]=desc`,
    );
    const data = (answer.body as { data?: unknown } | null)?.data;
    for (const x of Array.isArray(data) ? data : []) {
      const r = parseLiveRequest(x);
      if (r) out.push(r);
    }
  }
  return out;
}

export type Answer = { kind: "accept" } | { kind: "preapprove" } | { kind: "offer"; total: number } | { kind: "decline"; reason: DeclineReason };

// Accept or decline a request to book, pre-approve an inquiry or send it a
// special offer (price for the whole stay), accept or decline a change
// request. Declining an inquiry isn't an action on Airbnb (it's left
// unanswered), so it sends nothing. Throws when the partner refuses.
export async function answerRequest(liveFeedId: string, requestKind: "req" | "inq" | "alt", a: Answer): Promise<void> {
  if (requestKind === "inq" && a.kind === "decline") return;
  const resolution =
    requestKind === "alt"
      ? { accept: a.kind === "accept" ? "accept" : "decline" }
      : a.kind === "accept"
        ? { accept: true }
        : a.kind === "preapprove"
          ? { type: "preapproval" }
          : a.kind === "offer"
            ? { type: "special_offer", total_price: Math.round(a.total) }
            : { accept: false, reason: declineReasonCode(a.reason) };
  await channex("POST", `/live_feed/${encodeURIComponent(liveFeedId)}/resolve`, { resolution });
}
