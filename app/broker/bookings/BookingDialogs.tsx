"use client";

// The Bookings page dialogs (design App_Bookings v87; BookPhNew and BookPhPay
// on phones): new direct booking, decline an Airbnb request, record a
// payment, move to another apartment, cancel a direct booking, and report to
// Booking.com.

import { useEffect, useMemo, useState } from "react";
import type { BookingView, RequestView } from "@/lib/booking-data";
import {
  DECLINE_REASONS,
  METHODS,
  REPORTS,
  SOURCES,
  STAY_CHANGE,
  defaultReport,
  dueOf,
  phoneKey,
  reportError,
  round2,
  waMessageLink,
  type DeclineReason,
  type DirectError,
  type Method,
  type Report,
  type ReportError,
  type Source,
} from "@/lib/booking-rules";
import type { BookingDict } from "@/lib/booking-i18n";
import { addDirectBooking, addPayment, answerBookingRequest, cancelDirectBooking, moveToApartment, quoteNights, reportBooking } from "@/app/actions/bookings";
import { Ban } from "@/components/broker/booking-icons";
import { Dialog, Field, SidePanel, bbtn, fieldBase, fieldBorder, textareaClass } from "@/components/broker/booking-ui";
import type { BookingsCtx } from "./useBookings";
import { datesText, overlapsB } from "./view";
import { CheckBox } from "./BookingEdit";

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

function directError(t: BookingDict, e: DirectError): string {
  switch (e.code) {
    case "noUnit":
      return t.err.noUnit;
    case "badDates":
      return t.err.badDates;
    case "past":
      return t.err.past;
    case "taken":
      return t.err.taken(e.guest, t.day(e.from), t.day(e.to));
    case "noGuests":
      return t.err.noGuests;
    case "tooMany":
      return t.err.tooMany(t.guestsUpTo(e.max));
    case "noGuest":
      return t.err.noGuest;
    case "noName":
      return t.err.noName;
    case "badPhone":
      return t.err.badPhone;
    case "badRate":
      return t.err.badRate;
    case "badDeposit":
      return t.err.badDeposit;
  }
}

// ---------------------------------------------------------------------------
// New direct booking

// Dates and apartment type chosen on the Calendar's free nights (design v88).
export type NewPreset = { propertyId: string; unitTypeId: string; ci: string; co: string };

export function NewBookingPanel({
  ctx,
  guestId,
  preset: from,
  onClose,
  onSaved,
}: {
  ctx: BookingsCtx;
  guestId?: string;
  preset?: NewPreset;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { t, data, busy } = ctx;
  const preset = guestId ? data.guests.find((g) => g.id === guestId && !g.deleted) : undefined;
  const [f, setF] = useState({
    p: from?.propertyId ?? (data.properties.length === 1 ? data.properties[0].id : ""),
    u: from?.unitTypeId ?? "",
    ci: from?.ci ?? "",
    co: from?.co ?? "",
    adults: "2",
    children: "0",
    mode: (preset ? "old" : data.guests.some((g) => !g.deleted) ? "old" : "new") as "old" | "new",
    gid: preset?.id ?? "",
    gq: "",
    gname: "",
    gphone: "",
    src: (preset ? "repeat" : "whatsapp") as Source,
    rate: "",
    status: "pend" as "pend" | "conf",
    dep: "",
    depm: "cash" as Method,
    note: "",
  });
  const [errs, setErrs] = useState<Partial<Record<DirectError["field"], string>>>({});
  const [quote, setQuote] = useState<{ d: string; p: number }[]>([]);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const units = data.units.filter((u) => u.propertyId === f.p);
  useEffect(() => {
    if (units.length === 1 && f.u !== units[0].id) set({ u: units[0].id });
  }, [f.p]); // eslint-disable-line react-hooks/exhaustive-deps
  const unit = data.units.find((u) => u.id === f.u);
  const cur = unit?.currency ?? "EGP";

  const nights = f.ci && f.co && f.co > f.ci ? Math.round((Date.parse(f.co) - Date.parse(f.ci)) / 86_400_000) : 0;
  useEffect(() => {
    let live = true;
    if (!f.u || !nights) return setQuote([]);
    quoteNights(f.u, f.ci, f.co)
      .then((r) => live && setQuote(r.ok ? r.nights : []))
      .catch(() => live && setQuote([]));
    return () => {
      live = false;
    };
  }, [f.u, f.ci, f.co, nights]);
  const est = quote.length ? Math.round(quote.reduce((a, n) => a + n.p, 0) / quote.length) : 0;
  const rate = num(f.rate);
  const total = nights ? (rate > 0 ? rate * nights : quote.reduce((a, n) => a + n.p, 0)) : 0;

  const sel = f.gid ? data.guests.find((g) => g.id === f.gid) : undefined;
  const matches = useMemo(() => {
    const q = f.gq.trim().toLowerCase();
    if (q.length < 2) return [];
    return data.guests.filter((g) => !g.deleted && `${g.name} ${g.phone}`.toLowerCase().includes(q)).slice(0, 4);
  }, [f.gq, data.guests]);
  // "Don't rent" warns on any new booking with that name or number.
  const warn =
    f.mode === "old"
      ? sel?.blocked
        ? sel
        : undefined
      : data.guests.find(
          (g) =>
            g.blocked &&
            ((phoneKey(f.gphone).length >= 8 && phoneKey(g.phone) === phoneKey(f.gphone)) || (f.gname.trim() && g.name.trim().toLowerCase() === f.gname.trim().toLowerCase())),
        );

  // Shown as soon as the dates clash with every identical apartment.
  const clash = useMemo(() => {
    if (!unit || !nights) return null;
    const range = { arrival: f.ci, departure: f.co };
    const busyApts = Array.from({ length: Math.max(1, unit.count) }, (_, i) =>
      data.bookings.find((b) => b.unitTypeId === unit.id && b.status !== "canc" && b.apt === i + 1 && overlapsB(b, range)),
    );
    return busyApts.every(Boolean) ? busyApts[0]! : null;
  }, [unit, nights, f.ci, f.co, data.bookings]);

  const save = async () => {
    const r = await ctx.run(() =>
      addDirectBooking({
        unitTypeId: f.u,
        arrival: f.ci,
        departure: f.co,
        adults: Number.isFinite(num(f.adults)) ? Math.trunc(num(f.adults)) : -1,
        children: Number.isFinite(num(f.children)) ? Math.trunc(num(f.children)) : 0,
        guestMode: f.mode,
        guestId: f.mode === "old" ? f.gid : "",
        guestName: f.gname,
        guestPhone: f.gphone,
        rate: f.rate.trim() === "" ? null : rate,
        deposit: f.dep.trim() === "" ? 0 : num(f.dep),
        source: f.src,
        status: f.status,
        depositMethod: f.depm,
        note: f.note,
      }),
    );
    if (!r) return;
    if (r.ok) {
      ctx.say(t.toast.saved(r.code));
      onSaved(r.id);
      return;
    }
    if ("errors" in r) {
      const e: Partial<Record<DirectError["field"], string>> = {};
      for (const x of r.errors) e[x.field] ??= directError(t, x);
      setErrs(e);
    } else if (r.error === "failed") setErrs({});
  };

  const err = { ...errs, ...(clash && !errs.dates ? { dates: t.err.taken(clash.guestName, t.day(clash.arrival), t.day(clash.departure)) } : {}) };
  const select = (bad = false) => `${fieldBase} ${fieldBorder(bad)}`;

  return (
    <SidePanel
      label={t.newTitle}
      width={560}
      phoneTitle={t.newTitle}
      onClose={onClose}
      closeLabel={t.close}
      backLabel={t.back}
      z={50}
      head={
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="m-0 text-[21px] font-bold">{t.newTitle}</h2>
          <p className="m-0 text-[14px] text-[#4B5563]">{t.newIntro}</p>
        </div>
      }
      footer={
        <>
          <button type="button" disabled={busy} onClick={save} className={`${bbtn.primary} flex-1`}>
            {t.saveBooking}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
      phoneFooter={
        <button type="button" disabled={busy} onClick={save} className={`${bbtn.primary} flex-1`}>
          {t.ph.saveShort}
        </button>
      }
    >
      <div className="flex gap-3">
        <Field id="np" label={t.property}>
          <select id="np" value={f.p} onChange={(e) => set({ p: e.target.value, u: "" })} className={select()}>
            <option value="">{t.chooseProperty}</option>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="nu" label={t.apartmentLbl} error={err.u}>
          <select id="nu" value={f.u} onChange={(e) => set({ u: e.target.value })} className={select(Boolean(err.u))}>
            <option value="">{t.chooseApartment}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.count > 1 ? `${u.name} · ${t.identical(u.count)}` : u.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex gap-3">
        <Field id="nci" label={t.checkIn}>
          <input id="nci" type="date" dir="ltr" min={data.today} value={f.ci} onChange={(e) => set({ ci: e.target.value })} className={`${select(Boolean(err.dates))} text-start`} />
        </Field>
        <Field id="nco" label={t.checkOut}>
          <input id="nco" type="date" dir="ltr" min={f.ci || data.today} value={f.co} onChange={(e) => set({ co: e.target.value })} className={`${select(Boolean(err.dates))} text-start`} />
        </Field>
      </div>
      {err.dates ? (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {err.dates}
        </span>
      ) : (
        nights > 0 &&
        total > 0 && <span className="text-[13px] text-[#15803D] min-[900px]:hidden">{t.ph.available(t.nights(nights), t.money(total, cur))}</span>
      )}
      <div className="flex gap-3">
        <Field id="nad" label={t.adults} error={err.adults}>
          <input id="nad" type="number" inputMode="numeric" min={1} value={f.adults} onChange={(e) => set({ adults: e.target.value })} className={select(Boolean(err.adults))} />
        </Field>
        <Field id="nch" label={t.children}>
          <input id="nch" type="number" inputMode="numeric" min={0} value={f.children} onChange={(e) => set({ children: e.target.value })} className={select()} />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium min-[900px]:text-[14px]">{t.guest}</span>
        <div role="radiogroup" aria-label={t.guest} className="flex rounded-lg bg-[#F3F4F6] p-[3px]">
          {(["old", "new"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={f.mode === m}
              onClick={() => set({ mode: m })}
              className="h-[34px] flex-1 cursor-pointer rounded-md border-0 bg-transparent text-[13px] font-semibold text-[#4B5563] aria-checked:bg-white aria-checked:text-[#111827] aria-checked:shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
            >
              {m === "old" ? t.existingGuest : t.newGuest}
            </button>
          ))}
        </div>
        {f.mode === "old" &&
          (sel ? (
            <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-[#639922] bg-[#F7FBF1] px-3 py-2.5">
              <span className="flex-1 font-semibold">{sel.name}</span>
              <button type="button" onClick={() => set({ gid: "", gq: "" })} className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#4B5563]">
                {t.change}
              </button>
            </div>
          ) : (
            <>
              <input type="search" value={f.gq} onChange={(e) => set({ gq: e.target.value })} aria-label={t.searchGuest} placeholder={t.searchGuest} className={select(Boolean(err.gid))} />
              {err.gid && (
                <span role="alert" className="text-[13px] text-[#B91C1C]">
                  {err.gid}
                </span>
              )}
              {matches.length > 0 && (
                <ul className="m-0 list-none overflow-hidden rounded-lg border border-[#E5E7EB] p-0">
                  {matches.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => set({ gid: g.id, gq: "" })}
                        className="flex w-full cursor-pointer justify-between gap-3 border-0 border-b border-[#F3F4F6] bg-white px-3 py-2.5 text-start text-[14px] text-[#111827]"
                      >
                        <span className="font-semibold">{g.name}</span>
                        <span dir="auto" className="text-[13px] text-[#6B7280]">
                          {g.phone || t.noNumber}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ))}
        {f.mode === "new" && (
          <div className="flex gap-3">
            <Field id="ngn" label={t.fullName} error={err.gname}>
              <input id="ngn" type="text" maxLength={120} value={f.gname} onChange={(e) => set({ gname: e.target.value })} className={select(Boolean(err.gname))} />
            </Field>
            <Field id="ngp" label={t.mobileWa} error={err.gphone}>
              <input id="ngp" type="tel" dir="ltr" maxLength={30} placeholder="+20 100 000 0000" value={f.gphone} onChange={(e) => set({ gphone: e.target.value })} className={`${select(Boolean(err.gphone))} text-start`} />
            </Field>
          </div>
        )}
        {warn && (
          <div role="alert" className="flex gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-[13px] leading-[1.6] text-[#7F1D1D]">
            <Ban size={16} />
            <span>
              <b>{t.blockedSel}</b> {warn.blockReason} {t.blockedSelEnd}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Field id="nsrc" label={t.source}>
          <select id="nsrc" value={f.src} onChange={(e) => set({ src: e.target.value as Source })} className={select()}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {t.sources[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="nrate" label={t.ratePerNight(cur)} error={err.rate}>
          <input id="nrate" type="number" inputMode="decimal" dir="ltr" min={0} placeholder={est ? String(est) : ""} value={f.rate} onChange={(e) => set({ rate: e.target.value })} className={`${select(Boolean(err.rate))} text-start`} />
        </Field>
      </div>
      {nights > 0 && total > 0 && <span className="text-[13px] text-[#1D4ED8] max-[899px]:hidden">{t.totalFor(t.money(total, cur), t.nights(nights))}</span>}

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium min-[900px]:text-[14px]">{t.status}</span>
        <div role="radiogroup" aria-label={t.status} className="flex gap-2.5">
          {(["pend", "conf"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={f.status === s}
              onClick={() => set({ status: s })}
              className={`flex flex-1 cursor-pointer flex-col items-start gap-1 rounded-[10px] p-3 text-start text-[14px] text-[#111827] ${
                f.status === s ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "border border-[#E5E7EB] bg-white"
              }`}
            >
              <b>{s === "pend" ? t.pendTitle : t.confTitle}</b>
              <span className="text-[12px] text-[#4B5563] max-[899px]:hidden">{s === "pend" ? t.pendBody : t.confBody}</span>
              <span className="text-[12px] text-[#4B5563] min-[900px]:hidden">{s === "pend" ? t.ph.pendShort : t.ph.confShort}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Field id="ndep" label={t.deposit} error={err.dep}>
          <input id="ndep" type="number" inputMode="decimal" dir="ltr" min={0} placeholder="0" value={f.dep} onChange={(e) => set({ dep: e.target.value })} className={`${select(Boolean(err.dep))} text-start`} />
        </Field>
        <Field id="ndm" label={t.method}>
          <select id="ndm" value={f.depm} onChange={(e) => set({ depm: e.target.value as Method })} className={select()}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {t.methods[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="nnote" label={t.noteOptional}>
        <textarea id="nnote" maxLength={500} value={f.note} onChange={(e) => set({ note: e.target.value })} className={`${textareaClass} min-h-16`} />
      </Field>
    </SidePanel>
  );
}

// ---------------------------------------------------------------------------
// Decline an Airbnb request

export function DeclineDialog({ ctx, r, onClose, onDone }: { ctx: BookingsCtx; r: RequestView; onClose: () => void; onDone: () => void }) {
  const { t } = ctx;
  const [why, setWhy] = useState<DeclineReason | "">("");
  const [err, setErr] = useState("");
  const go = async () => {
    if (!why) return setErr(t.err.why);
    const res = await ctx.run(() => answerBookingRequest(r.id, "decline", why));
    if (!res) return;
    if (res.ok) {
      ctx.say(t.toast.declined);
      onDone();
    } else setErr(res.error === "platform" ? t.err.platform : t.err.gone);
  };
  return (
    <Dialog
      title={t.declineTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.dangerOutline} flex-1`}>
            {t.declineGo}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.back}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151]">{t.declineIntro}</p>
      <Field id="dw" label={t.reason} error={err}>
        <select id="dw" value={why} onChange={(e) => setWhy(e.target.value as DeclineReason)} className={`${fieldBase} ${fieldBorder(Boolean(err))}`}>
          <option value="">{t.reasons[""]}</option>
          {DECLINE_REASONS.map((x) => (
            <option key={x} value={x}>
              {t.reasons[x]}
            </option>
          ))}
        </select>
      </Field>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Record a payment

export function PayDialog({ ctx, b, onClose }: { ctx: BookingsCtx; b: BookingView; onClose: () => void }) {
  const { t, data } = ctx;
  const due = dueOf(b);
  const [amt, setAmt] = useState(due ? String(due) : "");
  const [m, setM] = useState<Method>("cash");
  const [d, setD] = useState(data.today);
  const [err, setErr] = useState("");
  const a = num(amt);
  const go = async () => {
    if (!(a > 0)) return setErr(t.err.zero);
    if (a > due) return setErr(t.err.over(t.money(due, b.currency)));
    const r = await ctx.run(() => addPayment(b.id, a, m, d));
    if (!r) return;
    if (r.ok) {
      ctx.say(r.confirmed ? t.toast.paidConfirmed : t.toast.paid);
      onClose();
    } else if (r.error === "zero") setErr(t.err.zero);
    else if (r.error === "over") setErr(t.err.over(t.money(r.due ?? due, b.currency)));
    else if (r.error === "date") setErr(t.err.date);
    else setErr(t.err.gone);
  };
  return (
    <Dialog
      title={t.payTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.primary} flex-1`}>
            {t.recordPayment}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
    >
      <Field id="pa" label={t.amount(b.currency === "EGP" ? (ctx.lang === "ar" ? "ج.م" : "EGP") : b.currency)} error={err}>
        <input id="pa" type="number" inputMode="decimal" dir="ltr" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} className={`${fieldBase} ${fieldBorder(Boolean(err))} text-start`} />
      </Field>
      <div className="flex gap-3">
        <Field id="pm" label={t.method}>
          <select id="pm" value={m} onChange={(e) => setM(e.target.value as Method)} className={`${fieldBase} ${fieldBorder(false)}`}>
            {METHODS.map((x) => (
              <option key={x} value={x}>
                {t.methods[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="pd" label={t.date}>
          <input id="pd" type="date" dir="ltr" max={data.today} value={d} onChange={(e) => setD(e.target.value)} className={`${fieldBase} ${fieldBorder(false)} text-start`} />
        </Field>
      </div>
      {a > 0 && a <= due && <span className="text-[13px] text-[#1D4ED8] min-[900px]:hidden">{t.ph.leftAfter(t.money(round2(due - a), b.currency))}</span>}
      <span className="text-[13px] text-[#6B7280] max-[899px]:text-[12px] max-[899px]:leading-[1.6]">
        <span className="max-[899px]:hidden">{t.payHint}</span>
        <span className="min-[900px]:hidden">{t.ph.autoConfirm}</span>
      </span>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Move to another identical apartment

export function MoveDialog({ ctx, b, onClose }: { ctx: BookingsCtx; b: BookingView; onClose: () => void }) {
  const { t, data } = ctx;
  const opts = Array.from({ length: b.count }, (_, i) => i + 1)
    .filter((a) => a !== b.apt)
    .map((a) => ({ a, busy: data.bookings.find((x) => x.id !== b.id && x.unitTypeId === b.unitTypeId && x.apt === a && x.status !== "canc" && overlapsB(x, b)) }));
  const [apt, setApt] = useState<number | null>(opts.find((o) => !o.busy)?.a ?? null);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!apt) return setErr(t.err.noFree);
    const r = await ctx.run(() => moveToApartment(b.id, apt));
    if (!r) return;
    if (r.ok) {
      ctx.say(t.toast.moved(apt));
      onClose();
    } else setErr(t.err.noFree);
  };
  return (
    <Dialog
      title={t.moveTitle(b.guestName)}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.primary} flex-1`}>
            {t.moveGo}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151]">{t.moveIntro}</p>
      <div role="radiogroup" aria-label={t.apartmentLbl} className="flex flex-col gap-2">
        {opts.map((o) => (
          <button
            key={o.a}
            type="button"
            role="radio"
            aria-checked={apt === o.a}
            aria-disabled={Boolean(o.busy)}
            onClick={() => !o.busy && (setApt(o.a), setErr(""))}
            className={`flex items-center justify-between gap-3 rounded-[10px] bg-white px-3.5 py-3 text-start text-[14px] text-[#111827] ${
              o.busy ? "cursor-not-allowed border border-[#E5E7EB] opacity-55" : apt === o.a ? "cursor-pointer border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "cursor-pointer border border-[#D1D5DB]"
            }`}
          >
            <span className="font-semibold">{t.apartment(o.a)}</span>
            <span className={`text-[12px] font-semibold ${o.busy ? "text-[#B91C1C]" : "text-[#15803D]"}`}>
              {o.busy ? t.busy(o.busy.guestName, datesText(t, o.busy.arrival, o.busy.departure)) : t.freeWhole}
            </span>
          </button>
        ))}
      </div>
      {err && (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {err}
        </span>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Cancel a direct booking

export function CancelDialog({ ctx, b, onClose }: { ctx: BookingsCtx; b: BookingView; onClose: () => void }) {
  const { t, data } = ctx;
  const paid = b.paid;
  const g = b.guestId ? data.guests.find((x) => x.id === b.guestId && !x.deleted) : undefined;
  const phone = g?.phone ?? "";
  const [ref, setRef] = useState(paid ? String(paid) : "0");
  const [m, setM] = useState<Method>("cash");
  // Design v88: on by default when the guest has a mobile number. WhatsApp
  // opens with the message ready; the broker presses send there.
  const [wa, setWa] = useState(Boolean(phone));
  const [err, setErr] = useState("");
  const go = async () => {
    const r0 = paid ? num(ref) : 0;
    if (!(r0 >= 0) || r0 > paid) return setErr(t.err.ref(t.money(paid, b.currency)));
    // Opened now, while the tap still counts, so the browser doesn't block it.
    const win = wa && phone ? window.open("", "_blank") : null;
    const r = await ctx.run(() => cancelDirectBooking(b.id, r0, m, Boolean(win)));
    if (!r || !r.ok) win?.close();
    if (!r) return;
    if (r.ok) {
      if (win) win.location.href = waMessageLink(phone, t.v90.waMsg(b.guestName, b.code, datesText(t, b.arrival, b.departure), b.propertyName));
      ctx.say(win ? t.v90.toast.cancelledWa : t.toast.cancelled);
      onClose();
    } else setErr(r.error === "refund" ? t.err.ref(t.money(paid, b.currency)) : t.err.gone);
  };
  const cur = b.currency === "EGP" ? (ctx.lang === "ar" ? "ج.م" : "EGP") : b.currency;
  return (
    <Dialog
      title={t.cancelTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.dangerSolid} flex-1`}>
            {t.cancelBooking}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.back}
          </button>
        </>
      }
    >
      <p className="m-0 text-[15px] leading-[1.7] text-[#374151]">{t.cancelTxt(b.code, datesText(t, b.arrival, b.departure), t.money(paid, b.currency))}</p>
      {paid > 0 && (
        <>
          <div className="flex gap-3">
            <Field id="cref" label={t.refund(cur)} error={err}>
              <input id="cref" type="number" inputMode="decimal" dir="ltr" min={0} max={paid} value={ref} onChange={(e) => setRef(e.target.value)} className={`${fieldBase} ${fieldBorder(Boolean(err))} text-start`} />
            </Field>
            <Field id="crefm" label={t.refundMethod}>
              <select id="crefm" value={m} onChange={(e) => setM(e.target.value as Method)} className={`${fieldBase} ${fieldBorder(false)}`}>
                {METHODS.map((x) => (
                  <option key={x} value={x}>
                    {t.methods[x]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <span className="text-[12px] text-[#6B7280]">{t.refundHint}</span>
        </>
      )}
      {!paid && err && (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {err}
        </span>
      )}
      {phone && (
        <CheckBox checked={wa} onChange={setWa}>
          {t.v90.waToggle}
        </CheckBox>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Report to Booking.com (design v90): no-show (fee or no fee), invalid card,
// cancel after the card wasn't updated. "The stay dates changed" waits for
// the connection partner (STAY_CHANGE).

export function reportErrorText(t: BookingDict, e: ReportError | string): string {
  const v = t.v90.err;
  switch (e) {
    case "noshowEarly":
      return t.err.noshowEarly;
    case "noshowLate":
      return v.noshowLate;
    case "cardLate":
      return v.cardLate;
    case "cardAgain":
      return v.cardAgain;
    case "cardFirst":
      return v.cardFirst;
    case "cardWait":
      return v.cardWait;
    case "datesStay":
      return v.datesStay;
    case "platform":
      return t.err.platform;
    default:
      return t.err.gone;
  }
}

export function ReportDialog({ ctx, b, onClose }: { ctx: BookingsCtx; b: BookingView; onClose: () => void }) {
  const { t, data } = ctx;
  const v = t.v90;
  const [what, setWhat] = useState<Report>(defaultReport(b));
  const [err, setErr] = useState("");
  const options = REPORTS.filter((x) => x !== "dates" || STAY_CHANGE);
  const go = async () => {
    const e = reportError(what, b, data.today);
    if (e) return setErr(reportErrorText(t, e));
    const r = await ctx.run(() => reportBooking(b.id, what));
    if (!r) return;
    if (r.ok) {
      ctx.say(what === "noshow" ? t.toast.noShow : what === "noshoww" ? v.toast.noShowWaived : what === "card" ? t.toast.card : v.toast.cardCancelled);
      onClose();
    } else setErr(reportErrorText(t, r.error));
  };
  return (
    <Dialog
      title={t.noshowTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.primary} flex-1`}>
            {t.sendReport}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
    >
      <Field id="nw" label={t.what}>
        <select
          id="nw"
          value={what}
          onChange={(e) => {
            setWhat(e.target.value as Report);
            setErr("");
          }}
          className={`${fieldBase} ${fieldBorder(false)}`}
        >
          {options.map((x) => (
            <option key={x} value={x}>
              {v.reports[x]}
            </option>
          ))}
        </select>
      </Field>
      {err && (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {err}
        </span>
      )}
      <span className="text-[13px] leading-[1.6] text-[#6B7280]">{v.reportHints[what]}</span>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Special offer on an Airbnb inquiry (price for the whole stay)

export function OfferDialog({ ctx, r, onClose, onDone }: { ctx: BookingsCtx; r: RequestView; onClose: () => void; onDone: () => void }) {
  const { t } = ctx;
  const v = t.v90;
  const [amt, setAmt] = useState(r.total ? String(Math.round(r.total)) : "");
  const [err, setErr] = useState("");
  const go = async () => {
    const a = num(amt);
    if (!(a >= 1)) return setErr(v.err.offer);
    const res = await ctx.run(() => answerBookingRequest(r.id, "offer", a));
    if (!res) return;
    if (res.ok) {
      ctx.say(v.toast.offer);
      onDone();
    } else setErr(res.error === "platform" ? t.err.platform : t.err.gone);
  };
  const cur = r.currency === "EGP" && ctx.lang === "en" ? "EGP" : r.currency;
  return (
    <Dialog
      title={v.offerTitle}
      onClose={onClose}
      closeLabel={t.close}
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={go} className={`${bbtn.primary} flex-1`}>
            {v.sendOffer}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] leading-[1.7] text-[#374151]">{v.offerIntro}</p>
      <Field id="oamt" label={v.offerPrice(cur)} error={err}>
        <input id="oamt" type="number" inputMode="decimal" dir="ltr" min={1} value={amt} onChange={(e) => setAmt(e.target.value)} className={`${fieldBase} ${fieldBorder(Boolean(err))} text-start`} />
      </Field>
    </Dialog>
  );
}
