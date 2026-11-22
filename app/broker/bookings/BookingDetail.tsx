"use client";

// One booking (design App_Bookings v87: side panel on desktop, BookPhDetail
// and BookPhDouble full screen on phones): actions, warnings, arrival,
// stay, guest, price, payment, the team note and the activity log.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BookingView } from "@/lib/booking-data";
import { canCancel, canMove, canReport, dueOf, telLink, waLink } from "@/lib/booking-rules";
import { countryName, type BookingDict } from "@/lib/booking-i18n";
import { confirmDirect, saveTeamNote } from "@/app/actions/bookings";
import { Alert, Ban, Calendar, Chat, Check, MenuDots, Phone, Swap, Wallet } from "@/components/broker/booking-icons";
import { Banner, Dialog, Pill, SidePanel, Tile, bbtn, textareaClass } from "@/components/broker/booking-ui";
import type { BookingsCtx } from "./useBookings";
import { clashOf, datesText, nightsCount, payLabel, priceLines, unitLabel } from "./view";
import type { Dlg } from "./BookingsApp";
import { CancelDialog, MoveDialog, PayDialog, ReportDialog } from "./BookingDialogs";

function logLine(t: BookingDict, kind: string, p: Record<string, string | number>, by: string, b: BookingView): string {
  const s = (k: string) => String(p[k] ?? "");
  const n = (k: string) => Number(p[k] ?? 0);
  switch (kind) {
    case "created":
      return t.log.created(by, t.sources[s("s") as keyof typeof t.sources] ?? t.sources.other);
    case "received":
      return t.log.received(s("p") || b.platformName);
    case "changed":
      return t.log.changed(s("p") || b.platformName, datesText(t, s("a"), s("b")), datesText(t, s("c"), s("d")));
    case "payment":
      return t.log.payment(t.money(n("a"), b.currency), t.methods[s("m") as keyof typeof t.methods] ?? s("m"));
    case "refund":
      return t.log.refund(t.money(n("a"), b.currency), t.methods[s("m") as keyof typeof t.methods] ?? s("m"));
    case "autoConfirmed":
      return t.log.autoConfirmed;
    case "confirmed":
      return t.log.confirmed(by);
    case "moved":
      return t.log.moved(n("a"), n("b"));
    case "cancelledGuest":
      return t.log.cancelledGuest(s("p") || b.platformName);
    case "cancelledBy":
      return t.log.cancelledBy(by);
    case "noShow":
      return t.log.noShow;
    case "card":
      return t.log.card;
    default:
      return "";
  }
}

export function BookingDetail({
  ctx,
  b,
  dlg,
  setDlg,
  onClose,
}: {
  ctx: BookingsCtx;
  b: BookingView;
  dlg: Dlg | null;
  setDlg: (d: Dlg | null) => void;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const { t, data, over } = ctx;
  const g = b.guestId ? (data.guests.find((x) => x.id === b.guestId) ?? null) : null;
  const [note, setNote] = useState(b.teamNote);
  useEffect(() => setNote(b.teamNote), [b.id, b.teamNote]);

  const isDir = b.platform === "direct";
  const cancelled = b.status === "canc";
  const canPay = b.collect === "property" && !cancelled && b.payState !== "paid";
  const rule = { platform: b.platform, cancelled, stage: b.stage };
  const move = canMove(rule, b.count);
  const report = canReport(rule);
  const cancel = canCancel(rule);
  const phone = g && !g.deleted ? g.phone : "";
  const { other, free } = over.has(b.id) ? clashOf(b, data.bookings) : { other: null, free: null };
  const { nightRows, lines } = priceLines(t, b);
  const due = dueOf(b);
  const unit = unitLabel(t, b, true);

  const confirm = async () => {
    const r = await ctx.run(() => confirmDirect(b.id));
    if (r?.ok) ctx.say(t.toast.confirmed);
    else if (r) ctx.say(t.err.gone);
  };
  const saveNote = async () => {
    const r = await ctx.run(() => saveTeamNote(b.id, note));
    if (r?.ok) ctx.say(t.toast.note);
    else if (r) ctx.say(t.err.generic);
  };

  const contact = [
    { k: t.mobile, v: phone || (isDir ? "-" : t.hiddenBy(b.platformName)), ltr: Boolean(phone) },
    { k: t.email, v: g?.email ? g.email : isDir ? t.noEmailLong : t.hiddenBy(b.platformName), ltr: Boolean(g?.email) },
    ...(g?.country ? [{ k: t.country, v: countryName(t, g.country), ltr: false }] : []),
  ];
  const hidNote = !isDir && g && g.emailKind ? (g.emailKind === "alias" ? t.hidAlias : t.hidOther(b.platformName)) : "";
  const payTxt = b.collect === "ota" ? t.payOta(b.platformName) : isDir ? t.payDirect : t.payBdc;

  const secondary = (
    <>
      {b.status === "pend" && (
        <button type="button" disabled={ctx.busy} onClick={confirm} className={bbtn.sPrimary}>
          <Check size={15} />
          {t.confirmBooking}
        </button>
      )}
      {canPay && (
        <button type="button" onClick={() => setDlg({ k: "pay" })} className={`${bbtn.sSecondary} max-[899px]:hidden`}>
          <Wallet />
          {t.recordPayment}
        </button>
      )}
      {move && (
        <button type="button" onClick={() => setDlg({ k: "move" })} className={bbtn.sSecondary}>
          <Swap />
          {t.moveApt}
        </button>
      )}
      <Link href={`/broker/calendar?booking=${encodeURIComponent(b.id)}`} className={bbtn.sSecondary}>
        <Calendar />
        {t.inCalendar}
      </Link>
      {report && (
        <button type="button" onClick={() => setDlg({ k: "report" })} className={bbtn.sSecondary}>
          <Alert size={15} />
          {t.reportBdc}
        </button>
      )}
      {cancel && (
        <button type="button" onClick={() => setDlg({ k: "cancel" })} className={bbtn.sDanger}>
          {t.cancelBooking}
        </button>
      )}
    </>
  );

  return (
    <>
      <SidePanel
        label={b.guestName}
        width={640}
        phoneTitle={b.guestName}
        onClose={onClose}
        closeLabel={t.close}
        backLabel={t.back}
        z={40}
        head={
          <>
            <Tile color={b.color} ini={b.ini} size={40} radius={10} font={15} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h2 className="m-0 text-[21px] font-bold">{b.guestName}</h2>
              <Badges t={t} b={b} />
            </div>
          </>
        }
        phoneFooter={
          canPay ? (
            <button type="button" onClick={() => setDlg({ k: "pay" })} className={`${bbtn.primary} flex-1`}>
              <Wallet size={18} />
              {t.recordPayment}
            </button>
          ) : undefined
        }
      >
        <div className="min-[900px]:hidden">
          <Badges t={t} b={b} />
        </div>

        <div className="flex gap-2 min-[900px]:flex-wrap">
          {phone && (
            <>
              <a href={telLink(phone)} className={`${bbtn.sSecondary} max-[899px]:h-11 max-[899px]:flex-1 max-[899px]:text-[15px]`}>
                <Phone />
                {t.call}
              </a>
              <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className={`${bbtn.sWhatsapp} max-[899px]:h-11 max-[899px]:flex-1 max-[899px]:text-[15px]`}>
                <Chat />
                {t.whatsapp}
              </a>
            </>
          )}
          <span className="contents max-[899px]:hidden">{secondary}</span>
          <button type="button" aria-label={t.moreActions} onClick={() => setDlg({ k: "more" })} className={`${bbtn.secondary} w-11 px-0 min-[900px]:hidden ${phone ? "" : "flex-1"}`}>
            <MenuDots />
          </button>
        </div>

        {other && (
          <div role="alert" className="flex flex-col gap-2 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-3 text-[14px] leading-[1.6] text-[#7F1D1D] max-[899px]:text-[13px]">
            <span className="flex gap-2.5">
              <Alert size={18} />
              <span>{t.overTxt(other.guestName, other.platformName, datesText(t, b.arrival > other.arrival ? b.arrival : other.arrival, b.departure < other.departure ? b.departure : other.departure))}</span>
            </span>
            <span className="font-semibold">{free ? t.overFixMove(free) : t.overFixContact(other.platformName)}</span>
            {free && move && (
              <button type="button" onClick={() => setDlg({ k: "move" })} className={`${bbtn.sDangerSolid} self-start`}>
                <Swap />
                {t.moveFree}
              </button>
            )}
          </div>
        )}
        {g?.blocked && (
          <Banner tone="redSoft" role="alert" icon={<Ban size={18} />}>
            <b>{t.blockedWarn}</b> {g.blockReason}
          </Banner>
        )}
        {b.changed && (
          <Banner tone="blue" icon={<Swap size={18} />}>
            {t.chgTxt(b.platformName, t.day(b.changed.at), datesText(t, b.changed.from, b.changed.to), datesText(t, b.arrival, b.departure))}
          </Banner>
        )}
        {b.cancel && (
          <div className="flex flex-col gap-1 rounded-[10px] bg-[#F3F4F6] px-3.5 py-3 text-[14px] leading-[1.6] text-[#374151]">
            <span>{b.cancel.by === "guest" ? t.cancByGuest(b.platformName, t.day(b.cancel.at)) : t.cancByYou(t.day(b.cancel.at))}</span>
            {b.cancel.fee > 0 && <b>{t.feeTxt(t.money(b.cancel.fee, b.currency))}</b>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 min-[900px]:gap-3">
          <div className="flex flex-col gap-0.5 rounded-xl border border-[#E5E7EB] bg-white p-3 min-[900px]:gap-1 min-[900px]:p-3.5">
            <span className="text-[12px] text-[#6B7280]">{t.checkIn}</span>
            <span className="text-[14px] font-bold min-[900px]:text-[15px]">{t.weekday(b.arrival)}</span>
            <span className="text-[12px] text-[#6B7280]">
              {b.arrivalTime ? (
                <>
                  <span className="max-[899px]:hidden">{t.expected(b.arrivalTime)}</span>
                  <span className="min-[900px]:hidden">{t.around(b.arrivalTime)}</span>
                </>
              ) : (
                t.noArrival
              )}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl border border-[#E5E7EB] bg-white p-3 min-[900px]:gap-1 min-[900px]:p-3.5">
            <span className="text-[12px] text-[#6B7280]">{t.checkOut}</span>
            <span className="text-[14px] font-bold min-[900px]:text-[15px]">{t.weekday(b.departure)}</span>
            <span className="text-[12px] text-[#6B7280]">
              {t.nights(nightsCount(b))} · {t.guestsN(b.adults, b.children)}
            </span>
          </div>
        </div>

        <Section title={t.stay}>
          <span className="text-[14px]">
            {b.propertyName} · {unit}
          </span>
          {isDir ? (
            <span className="text-[13px] text-[#6B7280]">{t.sourceTxt(t.sources[b.source as keyof typeof t.sources] ?? t.sources.other)}</span>
          ) : (
            <span className="text-[13px] text-[#6B7280]">{t.otaEdit(b.platformName)}</span>
          )}
          {move && (
            <button type="button" onClick={() => setDlg({ k: "move" })} className={`${bbtn.secondary} mt-1 self-start text-[14px] min-[900px]:hidden`}>
              <Swap size={16} />
              {t.moveSame(b.unitName)}
            </button>
          )}
        </Section>

        <Section
          title={t.guest}
          action={
            b.guestId ? (
              <Link href={`/broker/guests?open=${encodeURIComponent(b.guestId)}`} className={bbtn.link}>
                {t.guestProfile}
              </Link>
            ) : undefined
          }
        >
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {contact.map((c) => (
              <li key={c.k} className="flex gap-3 text-[14px]">
                <span className="flex-[0_0_90px] text-[#6B7280]">{c.k}</span>
                <span dir={c.ltr ? "ltr" : "auto"} className={`min-w-0 break-words font-medium ${c.ltr ? "text-start" : "text-[#6B7280]"}`}>
                  {c.v}
                </span>
              </li>
            ))}
          </ul>
          {hidNote && <span className="text-[12px] text-[#6B7280]">{hidNote}</span>}
          {b.guestRequest && (
            <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-[14px] leading-[1.6] max-[899px]:text-[13px]">
              <b>{t.guestRequest}</b> {b.guestRequest}
            </div>
          )}
        </Section>

        <Section title={t.price}>
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-1">
            <div className="max-[899px]:hidden">
              {nightRows.map((r) => (
                <div key={r.k} className="flex justify-between py-1.5 text-[13px] text-[#6B7280]">
                  <span>{r.k}</span>
                  <span className="tabular-nums">{r.v}</span>
                </div>
              ))}
            </div>
            {lines.map((l, i) => (
              <div key={l.k} className={`flex justify-between gap-3 py-2 text-[14px] ${i || nightRows.length ? "border-t border-[#F3F4F6]" : ""}`}>
                <span>{l.k}</span>
                <span className={`whitespace-nowrap tabular-nums ${l.strong ? "font-bold" : "font-semibold"}`}>{l.v}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t.payment}>
          <span className="text-[14px] leading-[1.6] text-[#374151] max-[899px]:text-[13px]">{payTxt}</span>
          {b.payments.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {b.payments.map((p, i) => (
                <li key={i} className={`flex justify-between rounded-lg px-3 py-2 text-[14px] ${p.kind === "refund" ? "bg-[#F3F4F6]" : "bg-[#F0FDF4]"}`}>
                  <span>
                    {p.kind === "refund" ? "− " : ""}
                    {t.money(p.amount, b.currency)} · {t.methods[p.method as keyof typeof t.methods] ?? p.method}
                  </span>
                  <span className="text-[#6B7280]">{t.day(p.date)}</span>
                </li>
              ))}
            </ul>
          )}
          {canPay && <span className="text-[14px] font-bold text-[#B45309]">{t.stillDue(t.money(due, b.currency))}</span>}
        </Section>

        <Section title={t.teamNote}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} aria-label={t.teamNote} placeholder={t.teamNotePh} className={textareaClass} />
          <button type="button" disabled={ctx.busy || note === b.teamNote} onClick={saveNote} className={`${bbtn.sSecondary} self-start`}>
            {t.saveNote}
          </button>
        </Section>

        {b.events.length > 0 && (
          <Section title={t.activity}>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {b.events.map((e, i) => {
                const line = logLine(t, e.kind, e.params, e.by, b);
                return line ? (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-[1.5]">
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[#9CA3AF]" />
                    <span className="flex-1">{line}</span>
                    <span className="whitespace-nowrap text-[#6B7280]">{t.day(e.at)}</span>
                  </li>
                ) : null;
              })}
            </ol>
          </Section>
        )}
      </SidePanel>

      {dlg?.k === "more" && (
        <Dialog title={t.moreActions} onClose={() => setDlg(null)} closeLabel={t.close} footer={<button type="button" onClick={() => setDlg(null)} className={`${bbtn.secondary} flex-1`}>{t.close}</button>}>
          <div className="flex flex-col gap-2 [&>*]:h-11 [&>*]:w-full [&>*]:text-[15px]" onClick={(e) => (e.target as HTMLElement).closest("a") && setDlg(null)}>
            {secondary}
          </div>
        </Dialog>
      )}
      {dlg?.k === "pay" && <PayDialog ctx={ctx} b={b} onClose={() => setDlg(null)} />}
      {dlg?.k === "move" && <MoveDialog ctx={ctx} b={b} onClose={() => setDlg(null)} />}
      {dlg?.k === "cancel" && <CancelDialog ctx={ctx} b={b} onClose={() => setDlg(null)} />}
      {dlg?.k === "report" && <ReportDialog ctx={ctx} b={b} onClose={() => setDlg(null)} />}
    </>
  );
}

function Badges({ t, b }: { t: BookingDict; b: BookingView }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[13px] text-[#4B5563]">
        {b.platformName} · <span dir="ltr">{b.code}</span>
      </span>
      <Pill tone={b.status}>{t.st[b.status]}</Pill>
      {b.changed && <Pill tone="changed">{t.changed}</Pill>}
      <Pill tone="stage">{t.stage[b.stage]}</Pill>
      {b.payState !== "none" && <Pill tone={b.payState}>{payLabel(t, b)}</Pill>}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="m-0 flex-1 text-[14px] font-bold min-[900px]:text-[15px]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
