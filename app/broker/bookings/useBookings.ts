"use client";

// The state the Bookings and Guests pages share: the data, the toast, and a
// helper that runs a server action and takes the fresh data it returns.

import { useCallback, useEffect, useMemo, useState } from "react";
import { BOOKING_DICTS } from "@/lib/booking-i18n";
import type { BookingsData, RequestView } from "@/lib/booking-data";
import type { Lang } from "@/lib/i18n";
import { answerBookingRequest, refreshBookings } from "@/app/actions/bookings";
import { overIds, statsOf } from "./view";

export type RunResult<R> = Extract<R, { ok: true }> | (Extract<R, { ok: false }> & { failed: true });

export function useBookings(lang: Lang, initial: BookingsData) {
  const t = BOOKING_DICTS[lang];
  const [data, setData] = useState(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setData(initial), [initial]);

  // New bookings and Airbnb requests the webhook may have missed.
  useEffect(() => {
    let live = true;
    refreshBookings()
      .then((r) => live && r.ok && setData(r.data))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const over = useMemo(() => overIds(data), [data]);
  const stats = useMemo(() => statsOf(data.bookings), [data]);
  const closeToast = useCallback(() => setToast(null), []);

  // Runs an action. On success the page takes the fresh data; on a refusal
  // the caller gets the error to show next to the field. Unexpected failures
  // show a toast.
  const run = useCallback(
    async <R extends { ok: boolean }>(fn: () => Promise<R>): Promise<RunResult<R> | null> => {
      setBusy(true);
      try {
        const r = await fn();
        if (!r.ok) {
          const error = (r as { error?: string }).error;
          if (error === "signedOut") {
            window.location.reload();
            return null;
          }
          if (error === "failed") setToast(t.err.generic);
          return { ...(r as Extract<R, { ok: false }>), failed: true } as RunResult<R>;
        }
        const d = (r as { data?: BookingsData }).data;
        if (d) setData(d);
        return r as RunResult<R>;
      } catch {
        setToast(t.err.generic);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  return { t, lang, data, over, stats, busy, run, toast, say: setToast, closeToast };
}

export type BookingsCtx = ReturnType<typeof useBookings>;

// Accept a request to book or a change request, or pre-approve an inquiry.
export function useAccept(ctx: BookingsCtx) {
  return useCallback(
    async (r: RequestView, after?: () => void) => {
      const { t } = ctx;
      const res = await ctx.run(() => answerBookingRequest(r.id, r.kind === "inq" ? "preapprove" : "accept"));
      if (!res) return;
      if (res.ok) {
        ctx.say(r.kind === "req" ? t.toast.accepted : r.kind === "alt" ? t.v90.toast.altAccepted : t.toast.preapproved);
        after?.();
      } else ctx.say(res.error === "clash" ? t.v90.err.altClash(res.guest ?? "") : res.error === "platform" ? t.err.platform : t.err.gone);
    },
    [ctx],
  );
}

// Decline a change request: the booking stays as it was.
export function useDeclineChange(ctx: BookingsCtx) {
  return useCallback(
    async (r: RequestView, after?: () => void) => {
      const res = await ctx.run(() => answerBookingRequest(r.id, "declineChange"));
      if (!res) return;
      if (res.ok) {
        ctx.say(ctx.t.v90.toast.altDeclined);
        after?.();
      } else ctx.say(res.error === "platform" ? ctx.t.err.platform : ctx.t.err.gone);
    },
    [ctx],
  );
}
