import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ackRevision, bookingRevision } from "@/lib/channel-channex";
import { ingestRevision, platformEvent } from "@/lib/channel-data";

// Events from our connection partner: new, changed and cancelled bookings,
// and platform problems (access removed, a listing unlisted, a price
// rejected). Only requests carrying our shared secret header are read; the
// booking itself is then fetched from the partner, not taken from the body.
export const dynamic = "force-dynamic";

function allowed(req: NextRequest): boolean {
  const secret = process.env.CHANNEX_WEBHOOK_SECRET;
  const given = req.headers.get("x-omnirent-webhook-secret");
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const id = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);

export async function POST(req: NextRequest) {
  if (!allowed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { event?: unknown; payload?: unknown; property_id?: unknown } | null;
  const event = typeof body?.event === "string" ? body.event : "";
  const payload = body?.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? (body.payload as Record<string, unknown>) : {};
  try {
    if (event === "booking" || event === "booking_unmapped_room" || event === "booking_unmapped_rate") {
      const revisionId = id(payload.revision_id) ?? id(payload.booking_revision_id);
      if (revisionId) {
        const rev = await bookingRevision(revisionId);
        if (rev) {
          await ingestRevision(rev);
          await ackRevision(rev.id).catch(() => undefined);
        }
      }
    } else if (["disconnect_channel", "disconnect_listing", "rate_error", "sync_error"].includes(event)) {
      await platformEvent(event, payload, id(body?.property_id));
    }
  } catch {
    // Answer 500 so the partner sends the event again later.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
