"use client";

// The broker Bookings page (design App_Bookings, version 87): tabs with
// counts, search and filters, the bookings table (cards on phones), Airbnb
// requests and inquiries, the double-booking banner, and the empty state.
// The booking detail and the dialogs live in their own files.

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { BookingView, BookingsData, RequestView } from "@/lib/booking-data";
import { PAY_FILTERS, TABS, inTab, sortForTab, toCsv, type BookingTab } from "@/lib/booking-rules";
import { Toast } from "@/components/ops/Overlay";
import { Alert, Ban, CalendarCheck, Check, Clock, Download, Plug, Plus, Swap } from "@/components/broker/booking-icons";
import { Pill, SearchBox, Tile, bbtn } from "@/components/broker/booking-ui";
import { useAccept, useBookings, useDeclineChange, type BookingsCtx } from "./useBookings";
import { altInfo, datesText, download, nightsCount, payLabel, unitLabel } from "./view";
import { BookingDetail } from "./BookingDetail";
import { RequestPanel, hoursTo } from "./RequestPanel";
import { DeclineDialog, NewBookingPanel, OfferDialog } from "./BookingDialogs";

export type Dlg =
  | { k: "new"; guestId?: string }
  | { k: "decline"; req: RequestView }
  | { k: "pay" }
  | { k: "move" }
  | { k: "cancel" }
  | { k: "edit" }
  | { k: "offer"; req: RequestView }
  | { k: "report" }
  | { k: "more" };

const selectClass = "h-10 w-auto rounded-lg border border-[#D1D5DB] bg-white px-3 text-[14px] text-[#111827]";

export function BookingsApp({ lang, data: initial }: { lang: Lang; data: BookingsData }) {
  const ctx = useBookings(lang, initial);
  const { t, data, over } = ctx;
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  const [tab, setTab] = useState<BookingTab>("up");
  const [q, setQ] = useState("");
  const [fPlat, setFPlat] = useState("all");
  const [fProp, setFProp] = useState("all");
  const [fPay, setFPay] = useState<(typeof PAY_FILTERS)[number]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reqId, setReqId] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dlg | null>(null);

  // Links from the Guests page and the phone "+" button: ?open=<booking>,
  // ?new=1 (&guest=<id>).
  useEffect(() => {
    const open = params.get("open");
    const nw = params.get("new");
    if (!open && !nw) return;
    if (open && data.bookings.some((b) => b.id === open)) {
      setTab("all");
      setOpenId(open);
    }
    if (nw) setDlg({ k: "new", guestId: params.get("guest") ?? undefined });
    router.replace(path, { scroll: false });
  }, [params, data.bookings, path, router]);

  const guestById = useMemo(() => new Map(data.guests.map((g) => [g.id, g])), [data.guests]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(TABS.map((x) => [x, 0])) as Record<BookingTab, number>;
    for (const b of data.bookings) for (const x of TABS) if (x !== "req" && inTab(b.stage, x)) c[x] += 1;
    c.req = data.requests.length;
    return c;
  }, [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    const list = data.bookings.filter((b) => {
      if (!inTab(b.stage, tab)) return false;
      if (fPlat !== "all" && b.platform !== fPlat) return false;
      if (fProp !== "all" && b.propertyId !== fProp) return false;
      if (fPay !== "all" && b.payState !== fPay) return false;
      if (!needle) return true;
      const phone = (b.guestId && guestById.get(b.guestId)?.phone) || "";
      return b.guestName.toLowerCase().includes(needle) || b.code.toLowerCase().includes(needle) || (digits.length >= 3 && phone.replace(/\D/g, "").includes(digits));
    });
    return sortForTab(list, tab);
  }, [data.bookings, tab, q, fPlat, fProp, fPay, guestById]);

  const open = openId ? (data.bookings.find((b) => b.id === openId) ?? null) : null;
  const req = reqId ? (data.requests.find((r) => r.id === reqId) ?? null) : null;
  const emptyAccount = data.bookings.length === 0 && data.requests.length === 0;
  const filtersOn = q.trim() !== "" || fPlat !== "all" || fProp !== "all" || fPay !== "all";
  const clear = () => {
    setQ("");
    setFPlat("all");
    setFProp("all");
    setFPay("all");
  };

  const exportCsv = useCallback(() => {
    const rows = filtered.map((b) => [
      b.code,
      b.platformName,
      b.guestName,
      (b.guestId && guestById.get(b.guestId)?.phone) || "",
      b.propertyName,
      unitLabel(t, b).replace(/[\u2068\u2069]/g, ""),
      b.arrival,
      b.departure,
      nightsCount(b),
      b.adults + b.children,
      t.st[b.status],
      payLabel(t, b),
      b.total,
      b.currency,
    ]);
    download(`bookings-${data.today}.csv`, toCsv(t.exportHeader, rows));
  }, [filtered, guestById, t, data.today]);

  const firstOver = data.bookings.find((b) => over.has(b.id));
  const listTab = tab !== "req";

  return (
    <main className="flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-3 px-4 py-3 min-[900px]:gap-[18px] min-[900px]:px-9 min-[900px]:pb-9 min-[900px]:pt-6">
      <div className="hidden flex-wrap items-end gap-4 min-[900px]:flex">
        <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-bold">{t.bookings}</h1>
          <p className="m-0 text-[15px] text-[#4B5563]">{t.bookingsIntro}</p>
        </div>
        {!emptyAccount && (
          <button type="button" onClick={exportCsv} className={bbtn.secondary}>
            <Download />
            {t.export}
          </button>
        )}
        {!emptyAccount && (
          <button type="button" onClick={() => setDlg({ k: "new" })} className={bbtn.primary}>
            <Plus />
            {t.newBooking}
          </button>
        )}
      </div>

      {emptyAccount ? (
        <EmptyAccount t={t} onNew={() => setDlg({ k: "new" })} />
      ) : (
        <>
          {firstOver && (
            <div role="alert" className="flex items-center gap-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-3 text-[14px] leading-[1.6] text-[#7F1D1D] max-[899px]:text-[13px]">
              <Alert />
              <span className="flex-1">
                <b>{t.overBanner}</b> {t.overBannerBody}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTab("all");
                  setOpenId(firstOver.id);
                }}
                className={bbtn.sDangerSolid}
              >
                {t.openBooking}
              </button>
            </div>
          )}

          <SearchBox value={q} onChange={setQ} label={t.ph.search} className="min-[900px]:hidden" />

          <div role="tablist" className="flex gap-2 overflow-x-auto pb-1 min-[900px]:gap-[22px] min-[900px]:border-b min-[900px]:border-[#E5E7EB] min-[900px]:pb-0">
            {TABS.map((x) => {
              const on = tab === x;
              const red = x === "req" && counts.req > 0;
              return (
                <button
                  key={x}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setTab(x);
                    setOpenId(null);
                  }}
                  className={`flex flex-none cursor-pointer items-center whitespace-nowrap max-[899px]:h-[34px] max-[899px]:gap-1.5 max-[899px]:rounded-full max-[899px]:px-3 max-[899px]:text-[13px] max-[899px]:font-semibold min-[900px]:h-[46px] min-[900px]:gap-2 min-[900px]:border-0 min-[900px]:border-b-2 min-[900px]:bg-transparent min-[900px]:px-0.5 min-[900px]:text-[15px] ${
                    on
                      ? "max-[899px]:border-0 max-[899px]:bg-[#27500A] max-[899px]:text-white min-[900px]:border-[#639922] min-[900px]:font-bold min-[900px]:text-[#27500A]"
                      : "max-[899px]:border max-[899px]:border-[#D1D5DB] max-[899px]:bg-white max-[899px]:text-[#374151] min-[900px]:border-transparent min-[900px]:font-medium min-[900px]:text-[#4B5563]"
                  }`}
                >
                  {t.tabs[x]}
                  <span
                    className={`max-[899px]:text-[11px] max-[899px]:opacity-80 min-[900px]:rounded-full min-[900px]:px-2 min-[900px]:py-px min-[900px]:text-[12px] min-[900px]:font-bold ${
                      red ? "min-[900px]:bg-[#DC2626] min-[900px]:text-white" : "min-[900px]:bg-[#F3F4F6] min-[900px]:text-[#4B5563]"
                    }`}
                  >
                    {counts[x]}
                  </span>
                </button>
              );
            })}
          </div>

          {listTab && (
            <>
              <div className="hidden flex-wrap items-center gap-2.5 min-[900px]:flex">
                <SearchBox value={q} onChange={setQ} label={t.search} className="max-w-[360px] flex-[1_1_280px]" />
                <select aria-label={t.platformLabel} value={fPlat} onChange={(e) => setFPlat(e.target.value)} className={selectClass}>
                  <option value="all">{t.allPlatforms}</option>
                  {data.platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select aria-label={t.propertyLabel} value={fProp} onChange={(e) => setFProp(e.target.value)} className={selectClass}>
                  <option value="all">{t.allProperties}</option>
                  {data.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select aria-label={t.paymentLabel} value={fPay} onChange={(e) => setFPay(e.target.value as (typeof PAY_FILTERS)[number])} className={selectClass}>
                  {PAY_FILTERS.map((p) => (
                    <option key={p} value={p}>
                      {t.payFilter[p]}
                    </option>
                  ))}
                </select>
              </div>

              {filtered.length ? (
                <>
                  <BookingTable ctx={ctx} rows={filtered} openId={openId} onOpen={setOpenId} />
                  <BookingCards ctx={ctx} rows={filtered} onOpen={setOpenId} />
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#E5E7EB] bg-white px-6 py-10 text-center">
                  <span className="text-[15px] text-[#4B5563]">{filtersOn ? t.noMatch : t.noneHere}</span>
                  {filtersOn && (
                    <button type="button" onClick={clear} className={bbtn.secondary}>
                      {t.clearFilters}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {!listTab &&
            (data.requests.length ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2.5 rounded-[10px] border border-[#FECDD3] bg-[#FFF1F2] px-3.5 py-3 text-[13px] leading-[1.6] text-[#881337]">
                  <Clock size={18} />
                  <span>{t.reqNote}</span>
                </div>
                {data.requests.map((r) => (
                  <RequestCard key={r.id} ctx={ctx} r={r} onOpen={() => setReqId(r.id)} onDecline={() => setDlg({ k: "decline", req: r })} onOffer={() => setDlg({ k: "offer", req: r })} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white px-6 py-10 text-center text-[15px] text-[#4B5563]">{t.noRequests}</div>
            ))}
        </>
      )}

      {open && <BookingDetail ctx={ctx} b={open} dlg={dlg} setDlg={setDlg} onClose={() => setOpenId(null)} onOpen={setOpenId} />}
      {req && <RequestPanel ctx={ctx} r={req} onClose={() => setReqId(null)} onDecline={() => setDlg({ k: "decline", req })} onOffer={() => setDlg({ k: "offer", req })} />}
      {dlg?.k === "new" && <NewBookingPanel ctx={ctx} guestId={dlg.guestId} onClose={() => setDlg(null)} onSaved={(id) => {
            setDlg(null);
            setTab("all");
            setOpenId(id);
          }} />}
      {dlg?.k === "decline" && (
        <DeclineDialog
          ctx={ctx}
          r={dlg.req}
          onClose={() => setDlg(null)}
          onDone={() => {
            setDlg(null);
            setReqId(null);
          }}
        />
      )}
      {dlg?.k === "offer" && (
        <OfferDialog
          ctx={ctx}
          r={dlg.req}
          onClose={() => setDlg(null)}
          onDone={() => {
            setDlg(null);
            setReqId(null);
          }}
        />
      )}
      {ctx.toast && (
        <Toast onClose={ctx.closeToast} closeLabel={t.close} place="content">
          {ctx.toast}
        </Toast>
      )}
    </main>
  );
}

function EmptyAccount({ t, onNew }: { t: BookingsCtx["t"]; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-12 text-center min-[900px]:rounded-xl min-[900px]:border min-[900px]:border-dashed min-[900px]:border-[#E5E7EB] min-[900px]:bg-white min-[900px]:px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
        <CalendarCheck size={26} />
      </span>
      <h2 className="m-0 text-[20px] font-bold">{t.emptyTitle}</h2>
      <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">
        <span className="max-[899px]:hidden">{t.emptyBody}</span>
        <span className="min-[900px]:hidden">{t.emptyBodyPhone}</span>
      </p>
      <div className="flex gap-2.5 max-[899px]:w-full max-[899px]:flex-col-reverse">
        <Link href="/broker/channels" className={`${bbtn.secondary} max-[899px]:h-12`}>
          <Plug />
          {t.connectPlatform}
        </Link>
        <button type="button" onClick={onNew} className={`${bbtn.primary} max-[899px]:h-12`}>
          <Plus />
          {t.newBooking}
        </button>
      </div>
    </div>
  );
}

const th = "whitespace-nowrap border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-semibold text-[#4B5563]";
const td = "border-b border-[#F3F4F6] px-4 py-3 align-middle text-[14px]";

function BookingTable({ ctx, rows, openId, onOpen }: { ctx: BookingsCtx; rows: BookingView[]; openId: string | null; onOpen: (id: string) => void }) {
  const { t, over, data } = ctx;
  const guestById = new Map(data.guests.map((g) => [g.id, g]));
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white min-[900px]:block">
      <table className="w-full min-w-[1000px] border-collapse">
        <thead>
          <tr>
            <th className={th}>{t.cols.guest}</th>
            <th className={th}>{t.cols.platform}</th>
            <th className={th}>{t.cols.property}</th>
            <th className={th}>{t.cols.dates}</th>
            <th className={th}>{t.cols.status}</th>
            <th className={th}>{t.cols.payment}</th>
            <th className={`${th} text-end`}>{t.cols.total}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const g = b.guestId ? guestById.get(b.guestId) : undefined;
            return (
              <tr
                key={b.id}
                onClick={() => onOpen(b.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(b.id)}
                tabIndex={0}
                className={`cursor-pointer hover:bg-[#F9FAFB] ${openId === b.id ? "bg-[#F7FBF1]" : ""}`}
              >
                <td className={td}>
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {b.guestName}
                      {g?.blocked && (
                        <span title={t.dontRent} className="flex text-[#B91C1C]">
                          <Ban />
                        </span>
                      )}
                    </span>
                    <span className="text-[12px] text-[#6B7280]">{t.guestsN(b.adults, b.children)}</span>
                  </div>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <Tile color={b.color} ini={b.ini} />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold">{b.platformName}</span>
                      <span dir="ltr" className="text-start text-[12px] text-[#6B7280]">
                        {b.code}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={td}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{b.propertyName}</span>
                    <span className="text-[12px] text-[#6B7280]">{unitLabel(t, b)}</span>
                  </div>
                </td>
                <td className={td}>
                  <div className="flex flex-col gap-0.5">
                    <span className="whitespace-nowrap font-medium">{datesText(t, b.arrival, b.departure)}</span>
                    <span className="text-[12px] text-[#6B7280]">
                      {t.nights(nightsCount(b))} · {t.stage[b.stage]}
                    </span>
                  </div>
                </td>
                <td className={td}>
                  <div className="flex flex-col items-start gap-1">
                    <Pill tone={b.status}>{t.st[b.status]}</Pill>
                    {b.changed && <Pill tone="changed">{t.changed}</Pill>}
                    {over.has(b.id) && <Pill tone="over">{t.doubleBooked}</Pill>}
                  </div>
                </td>
                <td className={td}>
                  <Pill tone={b.payState}>{payLabel(t, b)}</Pill>
                </td>
                <td className={`${td} whitespace-nowrap text-end font-semibold tabular-nums`}>{t.money(b.total, b.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-3 text-[13px] text-[#6B7280]">{t.bookingsN(rows.length)}</div>
    </div>
  );
}

function BookingCards({ ctx, rows, onOpen }: { ctx: BookingsCtx; rows: BookingView[]; onOpen: (id: string) => void }) {
  const { t, over } = ctx;
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0 min-[900px]:hidden">
      {rows.map((b) => (
        <li key={b.id}>
          <button type="button" onClick={() => onOpen(b.id)} className="flex w-full cursor-pointer flex-col gap-2.5 rounded-xl border border-[#E5E7EB] bg-white p-3.5 text-start text-[#111827]">
            <div className="flex w-full items-center gap-2.5">
              <Tile color={b.color} ini={b.ini} size={32} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-bold">{b.guestName}</span>
                <span className="text-[12px] text-[#6B7280]">
                  {b.platformName} · <span dir="ltr">{b.code}</span>
                </span>
              </div>
              <span className="whitespace-nowrap text-[14px] font-bold">{t.money(b.total, b.currency)}</span>
            </div>
            <div className="flex flex-col gap-0.5 text-[13px]">
              <span className="font-semibold">
                {b.propertyName} · {unitLabel(t, b)}
              </span>
              <span className="text-[#4B5563]">
                {datesText(t, b.arrival, b.departure)} · {t.nights(nightsCount(b))}
                {b.arrivalTime ? ` · ${t.ph.arrives(b.arrivalTime)}` : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={b.status}>{t.st[b.status]}</Pill>
              {b.payState !== "none" && <Pill tone={b.payState}>{payLabel(t, b)}</Pill>}
              {b.changed && <Pill tone="changed">{t.changed}</Pill>}
              {over.has(b.id) && <Pill tone="over">{t.doubleBooked}</Pill>}
              {b.guestRequest && <Pill tone="request">{t.ph.guestRequestTag}</Pill>}
            </div>
          </button>
        </li>
      ))}
      <li className="px-1 py-1.5 text-[13px] leading-[1.6] text-[#6B7280]">{t.ph.tapHint}</li>
    </ul>
  );
}

function RequestCard({ ctx, r, onOpen, onDecline, onOffer }: { ctx: BookingsCtx; r: RequestView; onOpen: () => void; onDecline: () => void; onOffer: () => void }) {
  const { t, data } = ctx;
  const h = hoursTo(r.expiresAt);
  const accept = useAccept(ctx);
  const declineChange = useDeclineChange(ctx);
  const nights = nightsCount(r);
  const alt = altInfo(r, data.bookings);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
      <button type="button" onClick={onOpen} className="flex cursor-pointer flex-wrap items-center gap-2.5 border-0 bg-transparent p-0 text-start text-[#111827] min-[900px]:pointer-events-none">
        <Tile color="#FF5A5F" ini="A" />
        <span className="text-[16px] font-bold">{r.guest}</span>
        <span className="text-[13px] text-[#6B7280]">
          {r.country ? `${r.country} · ` : ""}
          {t.guestsN(r.adults, r.children)}
        </span>
        <Pill tone={r.kind}>{t.reqKind[r.kind]}</Pill>
        <span className="flex-1" />
        <Pill tone={h < 6 ? "soon" : "later"}>
          <Clock />
          {t.replyWithin(h)}
        </Pill>
      </button>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
        <span>
          <span className="text-[#6B7280]">{t.stayLbl}</span> <b>{r.unitName ? `${r.propertyName} · ${r.unitName}` : r.propertyName}</b>
        </span>
        <span>
          <span className="text-[#6B7280]">{t.datesLbl}</span> <b>{`${datesText(t, r.arrival, r.departure)} · ${t.nights(nights)}`}</b>
        </span>
        <span>
          <span className="text-[#6B7280]">{t.totalLbl}</span> <b>{t.money(r.total, r.currency)}</b>
          {r.kind !== "alt" && <> · {t.yourPayout(t.money(r.payout, r.currency))}</>}
        </span>
      </div>
      {alt && (
        <div className="flex gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5 text-[13px] leading-[1.6] text-[#1E3A8A]">
          <Swap size={16} />
          <span>
            {t.v90.altTxt(
              alt.b.code,
              `${datesText(t, alt.b.arrival, alt.b.departure)} · ${t.nights(nightsCount(alt.b))}`,
              `${datesText(t, r.arrival, r.departure)} · ${t.nights(nights)}`,
              `${alt.diff > 0 ? "+" : ""}${t.money(alt.diff, r.currency)}`,
            )}
          </span>
        </div>
      )}
      {r.message && <p className="m-0 rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-[14px] leading-[1.6] text-[#374151]">«{r.message}»</p>}
      <div className="flex flex-wrap gap-2.5">
        <button type="button" disabled={ctx.busy} onClick={() => accept(r)} className={bbtn.primary}>
          <Check />
          {r.kind === "req" ? t.accept : r.kind === "alt" ? t.v90.acceptChange : t.preapprove}
        </button>
        {r.kind === "inq" && (
          <button type="button" disabled={ctx.busy} onClick={onOffer} className={bbtn.secondary}>
            {t.v90.specialOffer}
          </button>
        )}
        <button type="button" disabled={ctx.busy} onClick={() => (r.kind === "alt" ? declineChange(r) : onDecline())} className={bbtn.dangerOutline}>
          {t.decline}
        </button>
        <span className="self-center text-[12px] text-[#6B7280]">{t.replyOnAirbnb}</span>
      </div>
    </div>
  );
}
