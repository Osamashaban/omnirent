"use client";

// Edit a direct booking (design App_Bookings v88, phone board BookPhEdit):
// dates, apartment type and apartment, guests, price per night, and splitting
// the stay across two identical apartments. Before / after with the
// difference; the server checks availability again and closes the new nights
// and reopens the old ones on every platform.

import { useEffect, useState } from "react";
import type { BookingView } from "@/lib/booking-data";
import { nightsOf, plusDays, type EditError } from "@/lib/booking-rules";
import { editBooking, quoteNights } from "@/app/actions/bookings";
import { Field, SidePanel, bbtn, fieldBase, fieldBorder } from "@/components/broker/booking-ui";
import type { BookingsCtx } from "./useBookings";
import { datesText } from "./view";

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

export function CheckBox({ checked, onChange, children, role = "checkbox" }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; role?: "checkbox" | "switch" }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-8 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-start text-[14px] font-semibold text-[#111827]"
    >
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-[5px] text-[12px] font-bold text-white ${
          checked ? "border-[1.5px] border-[#639922] bg-[#639922]" : "border-[1.5px] border-[#9CA3AF] bg-white"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span>{children}</span>
    </button>
  );
}

export function editErrorText(ctx: BookingsCtx, e: EditError): string {
  const { t } = ctx;
  const v = t.v90.err;
  switch (e.code) {
    case "badDates":
      return t.err.badDates;
    case "pastMove":
      return v.pastMove;
    case "nothing":
      return v.nothing;
    case "taken":
      return v.takenShort(e.guest, datesText(t, e.from, e.to));
    case "noGuests":
      return t.err.noGuests;
    case "tooMany":
      return t.err.tooMany(t.guestsUpTo(e.max));
    case "badRate":
      return v.rate;
    case "splitDay":
      return v.splitDay;
    case "splitApt":
      return v.splitApt;
    case "splitTaken":
      return v.splitTaken(e.apt, e.guest);
  }
}

export function EditPanel({ ctx, b, onClose }: { ctx: BookingsCtx; b: BookingView; onClose: () => void }) {
  const { t, data, busy } = ctx;
  const v = t.v90;
  const half = plusDays(b.arrival, Math.max(1, Math.floor(nightsOf(b.arrival, b.departure) / 2)));
  const [f, setF] = useState({
    ci: b.arrival,
    co: b.departure,
    u: b.unitTypeId ?? "",
    apt: String(b.apt),
    adults: String(b.adults),
    children: String(b.children),
    rate: b.rate ? String(b.rate) : "",
    split: Boolean(b.split),
    sd: b.split?.at ?? half,
    sapt: b.split ? String(b.split.apt) : "",
  });
  const [errs, setErrs] = useState<Partial<Record<EditError["field"], string>>>({});
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const units = data.units.filter((u) => u.propertyId === b.propertyId);
  const unit = data.units.find((u) => u.id === f.u);
  const count = unit?.count ?? b.count;
  const cur = unit?.currency ?? b.currency;
  const curLabel = cur === "EGP" && ctx.lang === "en" ? "EGP" : cur;

  const nights = f.ci && f.co && f.co > f.ci ? nightsOf(f.ci, f.co) : 0;
  const [quote, setQuote] = useState<{ d: string; p: number }[]>([]);
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

  const rate = num(f.rate);
  const sameStay = f.ci === b.arrival && f.co === b.departure && f.u === b.unitTypeId && (rate > 0 ? rate : null) === (b.rate ?? null);
  const after = !nights ? null : sameStay ? b.total : rate > 0 ? rate * nights : quote.length === nights ? quote.reduce((a, n) => a + n.p, 0) : null;
  const diff = after === null ? 0 : Math.round(after - b.total);
  const ratePh = quote[0] ? String(quote[0].p) : v.calendarPrice;

  const save = async () => {
    const r = await ctx.run(() =>
      editBooking(b.id, {
        unitTypeId: f.u,
        apt: count > 1 ? Number(f.apt) || 1 : 1,
        arrival: f.ci,
        departure: f.co,
        adults: Number.isFinite(num(f.adults)) ? Math.trunc(num(f.adults)) : 0,
        children: Number.isFinite(num(f.children)) ? Math.max(0, Math.trunc(num(f.children))) : 0,
        rate: f.rate.trim() === "" ? null : Number.isFinite(rate) && rate >= 0 ? rate : 0,
        split: count > 1 && f.split ? { at: f.sd, apt: Number(f.sapt) || 0 } : null,
      }),
    );
    if (!r) return;
    if (r.ok) {
      ctx.say(v.toast.edited);
      onClose();
      return;
    }
    if ("errors" in r) {
      const e: Partial<Record<EditError["field"], string>> = {};
      for (const x of r.errors) e[x.field] ??= editErrorText(ctx, x);
      setErrs(e);
    } else if (r.error !== "failed") setErrs({ edates: t.err.gone });
  };

  const select = (bad = false) => `${fieldBase} ${fieldBorder(bad)}`;
  const alert = (m?: string) =>
    m ? (
      <span role="alert" className="text-[13px] text-[#B91C1C]">
        {m}
      </span>
    ) : null;
  const aptOpts = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <SidePanel
      label={v.editBooking}
      width={560}
      phoneTitle={v.editBooking}
      onClose={onClose}
      closeLabel={t.close}
      backLabel={t.back}
      z={50}
      head={
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="m-0 text-[21px] font-bold">{v.editTitle}</h2>
          <p className="m-0 text-[14px] text-[#4B5563]">{v.editIntro}</p>
        </div>
      }
      footer={
        <>
          <button type="button" disabled={busy} onClick={save} className={`${bbtn.primary} flex-1`}>
            {v.saveEdit}
          </button>
          <button type="button" onClick={onClose} className={bbtn.secondary}>
            {t.cancel}
          </button>
        </>
      }
      phoneFooter={
        <button type="button" disabled={busy} onClick={save} className={`${bbtn.primary} flex-1`}>
          {v.saveEdit}
        </button>
      }
    >
      <span className="text-[13px] text-[#4B5563] min-[900px]:hidden">{v.editSub(b.guestName, b.code)}</span>
      <div className="flex gap-3">
        <Field id="eci" label={t.checkIn}>
          <input id="eci" type="date" dir="ltr" value={f.ci} onChange={(e) => set({ ci: e.target.value })} className={`${select(Boolean(errs.edates))} text-start`} />
        </Field>
        <Field id="eco" label={t.checkOut}>
          <input id="eco" type="date" dir="ltr" min={f.ci || undefined} value={f.co} onChange={(e) => set({ co: e.target.value })} className={`${select(Boolean(errs.edates))} text-start`} />
        </Field>
      </div>
      {alert(errs.edates)}
      <div className="flex gap-3">
        <Field id="eu" label={v.aptType}>
          <select id="eu" value={f.u} onChange={(e) => set({ u: e.target.value, apt: "1", split: false, sapt: "" })} className={select()}>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        {count > 1 && (
          <Field id="eapt" label={v.apartment}>
            <select id="eapt" value={f.apt} onChange={(e) => set({ apt: e.target.value })} className={select()}>
              {aptOpts.map((a) => (
                <option key={a} value={a}>
                  {t.apartment(a)}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <div className="flex gap-3">
        <Field id="ead" label={t.adults} error={errs.eadults}>
          <input id="ead" type="number" inputMode="numeric" min={1} value={f.adults} onChange={(e) => set({ adults: e.target.value })} className={select(Boolean(errs.eadults))} />
        </Field>
        <Field id="ech" label={t.children}>
          <input id="ech" type="number" inputMode="numeric" min={0} value={f.children} onChange={(e) => set({ children: e.target.value })} className={select()} />
        </Field>
      </div>
      <div className="flex gap-3">
        <Field id="erate" label={v.rate(curLabel)} error={errs.erate}>
          <input id="erate" type="number" inputMode="decimal" dir="ltr" min={0} placeholder={ratePh} value={f.rate} onChange={(e) => set({ rate: e.target.value })} className={`${select(Boolean(errs.erate))} text-start`} />
        </Field>
      </div>
      <span className="-mt-1.5 text-[12px] text-[#6B7280]">{v.rateHint}</span>
      {count > 1 && (
        <div className="flex flex-col gap-2.5">
          <CheckBox role="switch" checked={f.split} onChange={(x) => set({ split: x })}>
            {v.splitToggle}
          </CheckBox>
          {f.split && (
            <>
              <div className="flex gap-3">
                <Field id="esd" label={v.movesOn}>
                  <input id="esd" type="date" dir="ltr" min={f.ci || undefined} max={f.co || undefined} value={f.sd} onChange={(e) => set({ sd: e.target.value })} className={`${select(Boolean(errs.esplit))} text-start`} />
                </Field>
                <Field id="esa" label={v.toApt}>
                  <select id="esa" value={f.sapt} onChange={(e) => set({ sapt: e.target.value })} className={select(Boolean(errs.esplit))}>
                    <option value="">{v.chooseApt}</option>
                    {aptOpts
                      .filter((a) => String(a) !== f.apt)
                      .map((a) => (
                        <option key={a} value={a}>
                          {t.apartment(a)}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>
              {alert(errs.esplit)}
              <span className="text-[12px] text-[#6B7280]">{v.splitHint}</span>
            </>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1.5 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3 text-[14px] max-[899px]:px-3 max-[899px]:text-[13px]">
        <span>
          <span className="text-[#6B7280]">{v.before}</span> {`${datesText(t, b.arrival, b.departure)} · ${t.nights(nightsOf(b.arrival, b.departure))} · ${t.money(b.total, b.currency)}`}
        </span>
        <span>
          <span className="text-[#6B7280]">{v.after}</span>{" "}
          <b>{nights ? `${datesText(t, f.ci, f.co)} · ${t.nights(nights)}${after !== null ? ` · ${t.money(after, cur)}` : ""}` : "-"}</b>
        </span>
        {diff !== 0 && <span className="font-semibold text-[#B45309]">{diff > 0 ? v.diffMore(t.money(diff, cur)) : v.diffLess(t.money(-diff, cur))}</span>}
      </div>
      <span className="text-[12px] leading-[1.6] text-[#6B7280] min-[900px]:hidden">{v.editIntro}</span>
    </SidePanel>
  );
}
