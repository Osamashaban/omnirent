"use client";

// An Airbnb request to book or inquiry on its own screen (phones; design
// board BookPhRequest): time left, guest, stay, amounts, message, and Accept
// or Decline pinned to the bottom.

import type { RequestView } from "@/lib/booking-data";
import { Check, Clock } from "@/components/broker/booking-icons";
import { SidePanel, Tile, bbtn } from "@/components/broker/booking-ui";
import { useAccept, type BookingsCtx } from "./useBookings";
import { datesText, nightsCount } from "./view";

export function hoursTo(expiresAt: string): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 3_600_000));
}

export function RequestPanel({ ctx, r, onClose, onDecline }: { ctx: BookingsCtx; r: RequestView; onClose: () => void; onDecline: () => void }) {
  const { t } = ctx;
  const accept = useAccept(ctx);
  const h = hoursTo(r.expiresAt);
  const rows: [string, string, boolean][] = [
    [t.ph.stay, r.unitName ? `${r.propertyName} · ${r.unitName}` : r.propertyName, false],
    [t.ph.dates, `${datesText(t, r.arrival, r.departure)} · ${t.nights(nightsCount(r))}`, false],
    [t.ph.total, t.money(r.total, r.currency), true],
    [t.ph.payout, t.money(r.payout, r.currency), false],
  ];
  return (
    <SidePanel
      label={r.guest}
      width={560}
      phoneTitle={t.ph.reqTitle[r.kind]}
      head={<h2 className="m-0 flex-1 text-[21px] font-bold">{t.ph.reqTitle[r.kind]}</h2>}
      onClose={onClose}
      closeLabel={t.close}
      backLabel={t.back}
      phoneFooter={
        <>
          <button type="button" disabled={ctx.busy} onClick={onDecline} className={bbtn.dangerOutline}>
            {t.decline}
          </button>
          <button type="button" disabled={ctx.busy} onClick={() => accept(r, onClose)} className={`${bbtn.primary} flex-1`}>
            <Check />
            {r.kind === "req" ? t.accept : t.preapprove}
          </button>
        </>
      }
      footer={
        <>
          <button type="button" disabled={ctx.busy} onClick={() => accept(r, onClose)} className={`${bbtn.primary} flex-1`}>
            <Check />
            {r.kind === "req" ? t.accept : t.preapprove}
          </button>
          <button type="button" disabled={ctx.busy} onClick={onDecline} className={bbtn.dangerOutline}>
            {t.decline}
          </button>
        </>
      }
    >
      <div className="flex gap-2.5 rounded-[10px] border border-[#FECDD3] bg-[#FFF1F2] p-3 text-[13px] leading-[1.6] text-[#881337]">
        <Clock size={18} />
        <span>
          <b>{t.ph.hoursLeft(h)}</b> {t.ph.expiresNote}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <Tile color="#FF5A5F" ini="A" size={40} radius={10} font={15} />
        <div className="flex flex-col">
          <span className="text-[17px] font-bold">{r.guest}</span>
          <span className="text-[13px] text-[#6B7280]">
            {r.country ? `${r.country} · ` : ""}
            {t.guestsN(r.adults, r.children)}
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-1">
        {rows.map(([k, v, strong], i) => (
          <div key={k} className={`flex justify-between gap-3 py-[7px] text-[14px] ${i ? "border-t border-[#F3F4F6]" : ""}`}>
            <span className="text-[#4B5563]">{k}</span>
            <span className={`whitespace-nowrap tabular-nums ${strong ? "font-bold" : "font-medium"}`}>{v}</span>
          </div>
        ))}
      </div>
      {r.message && <p className="m-0 rounded-lg border border-[#E5E7EB] bg-white p-3 text-[14px] leading-[1.6]">«{r.message}»</p>}
      <span className="text-[12px] leading-[1.6] text-[#6B7280]">{t.ph.replyNote}</span>
    </SidePanel>
  );
}
