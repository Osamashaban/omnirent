"use client";

// Bookings on the Calendar (design App_Calendar v1.1): the coloured bars on
// the grid, the small chips of the month and phone views, and the booking
// details (side drawer on desktop, bottom sheet on phones) with the apartment
// picker.

import type { CalBooking, CalTypeView } from "@/lib/calendar-data";
import type { CalendarDict } from "@/lib/calendar-i18n";
import { BAR_COLORS, barState, daysBetween, weekday } from "@/lib/calendar-rules";
import { aptStatus } from "@/lib/booking-rules";
import { formatMoney } from "@/lib/property-rules";
import type { Lang } from "@/lib/i18n";
import { Info, X } from "@/components/ops/icons";
import { ErrorAlert } from "./parts";

// The platform's initials on its own colour, outlined in white.
export function PlatformBadge({ b, size = 18 }: { b: Pick<CalBooking, "color" | "ini">; size?: 18 | 15 | 14 }) {
  const cls =
    size === 18
      ? "h-[18px] min-w-[18px] rounded px-[3px] text-[10px] shadow-[0_0_0_1.5px_#FFFFFF]"
      : size === 15
        ? "h-[15px] min-w-[15px] rounded-[3px] px-0.5 text-[8px] shadow-[0_0_0_1px_#FFFFFF]"
        : "h-[14px] min-w-[14px] rounded-[3px] px-0.5 text-[8px] shadow-[0_0_0_1px_#FFFFFF]";
  return (
    <span aria-hidden="true" className={`inline-flex flex-none items-center justify-center font-bold text-white ${cls}`} style={{ background: b.color }}>
      {b.ini}
    </span>
  );
}

export function barStyle(b: CalBooking, today: string, dim: boolean): React.CSSProperties {
  if (dim) return { background: "#F3F4F6", color: "#6B7280", boxShadow: "inset 0 0 0 1px #D1D5DB" };
  const c = BAR_COLORS[barState(b, today)];
  return { background: c.bg, color: c.fg };
}

export function barTitle(t: CalendarDict, b: CalBooking, today: string) {
  return t.barTitle(b.platformName, t.barStates[barState(b, today)], b.guest, t.day(b.arrival), t.day(b.departure));
}

// A small chip with the guest's name (month cells and the phone day list).
export function BookingChip({
  t,
  b,
  today,
  dim,
  phone = false,
  onOpen,
}: {
  t: CalendarDict;
  b: CalBooking;
  today: string;
  dim: boolean;
  phone?: boolean;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <PlatformBadge b={b} size={phone ? 15 : 14} />
      <span className="truncate">
        <bdi>{b.guest}</bdi>
      </span>
    </>
  );
  if (phone) {
    return (
      <span
        data-booking={b.id}
        title={barTitle(t, b, today)}
        className="inline-flex h-[22px] max-w-full cursor-pointer items-center gap-1 rounded py-0 ps-[3px] pe-1.5 text-[11px] font-semibold"
        style={barStyle(b, today, dim)}
      >
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      title={barTitle(t, b, today)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center gap-1 overflow-hidden whitespace-nowrap rounded border-0 px-1 py-0.5 text-start text-[11px] font-semibold"
      style={barStyle(b, today, dim)}
    >
      {body}
    </button>
  );
}

const field =
  "h-11 w-full cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3 text-[15px] font-medium text-[#111827] outline-none focus:border-[#639922] disabled:cursor-not-allowed disabled:opacity-60";

// The booking's details and the apartment it's assigned to.
export function BookingDetails({
  t,
  lang,
  b,
  type,
  propertyName,
  today,
  all,
  busy,
  error,
  onMove,
  onClose,
}: {
  t: CalendarDict;
  lang: Lang;
  b: CalBooking;
  type: CalTypeView | undefined;
  propertyName: string;
  today: string;
  all: CalBooking[];
  busy: boolean;
  error: string;
  onMove: (apt: number) => void;
  onClose: () => void;
}) {
  const state = barState(b, today);
  const color = BAR_COLORS[state];
  const count = type?.count ?? 1;
  const multi = count > 1;
  const nights = daysBetween(b.arrival, b.departure);
  const long = (iso: string) => (lang === "ar" ? `${t.weekdayLong[weekday(iso)]}، ${t.day(iso)}` : `${t.weekdayShort[weekday(iso)]}, ${t.day(iso)}`);
  const facts: [string, string][] = [
    [t.factProperty, `${propertyName} · ${type?.name ?? "-"}`],
    [t.factCheckIn, long(b.arrival)],
    [t.factCheckOut, long(b.departure)],
    [t.factNights, String(nights)],
    [t.factGuests, String(b.guests)],
    [t.factTotal, formatMoney(b.total, b.currency, lang)],
  ];
  if (multi) facts.push([t.factApartment, t.apartment(b.apt)]);
  const slots = all.map((x) => ({ id: x.id, unitTypeId: x.unitTypeId, apt: x.apt, arrival: x.arrival, departure: x.departure, cancelled: false }));
  const apts = multi ? aptStatus(slots, b.unitTypeId, count, b, b.id) : [];
  const picker = multi && b.movable;
  const note = b.platform !== "direct";

  const head = (phone: boolean) => (
    <div className={`flex items-start ${phone ? "gap-2.5" : "gap-3 border-b border-[#E5E7EB] px-6 py-5"}`}>
      <div className={`flex flex-1 flex-col ${phone ? "gap-1.5" : "gap-2"}`}>
        <span className="inline-flex h-6 self-start items-center rounded-full px-2.5 text-[12px] font-bold text-white" style={{ background: b.color }}>
          {b.platformName}
        </span>
        <h2 className="m-0 text-[20px] font-bold">
          <bdi>{b.guest}</bdi>
        </h2>
        {b.code && (
          <span className={`${phone ? "text-[13px]" : "text-[14px]"} text-[#4B5563]`}>
            {lang === "ar" ? (
              <>
                {t.bookingCode("")}
                <span dir="ltr">{b.code}</span>
              </>
            ) : (
              t.bookingCode(b.code)
            )}
          </span>
        )}
        <span className="inline-flex h-6 self-start items-center rounded-full px-2.5 text-[12px] font-bold" style={{ background: color.bg, color: color.fg }}>
          {t.barStates[state]}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className={`flex ${phone ? "h-11 w-11" : "h-10 w-10"} cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#4B5563] hover:bg-[#F3F4F6]`}
      >
        <X />
      </button>
    </div>
  );

  const factList = (phone: boolean) => (
    <ul className={`m-0 flex list-none flex-col p-0 text-[14px] ${phone ? "gap-2" : "gap-2.5"}`}>
      {facts.map(([k, v]) => (
        <li key={k} className="flex gap-2">
          <span className={`text-[#6B7280] ${phone ? "flex-[0_0_96px]" : "min-w-[130px]"}`}>{k}</span>
          <span className="font-semibold">
            <bdi>{v}</bdi>
          </span>
        </li>
      ))}
    </ul>
  );

  const channelNote = (phone: boolean) =>
    note && (
      <div
        className={`flex rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] leading-[1.6] text-[#374151] ${
          phone ? "gap-2 px-3 py-2.5 text-[12px]" : "gap-2.5 px-3.5 py-3 text-[13px]"
        }`}
      >
        <Info size={16} />
        <span>{t.fromChannel}</span>
      </div>
    );

  return (
    <>
      {/* Desktop: side drawer */}
      <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(17,24,39,0.35)] max-[899px]:hidden" onClick={onClose}>
        <section
          role="dialog"
          aria-modal="true"
          aria-label={b.guest}
          onClick={(e) => e.stopPropagation()}
          className="flex h-full w-[420px] max-w-full flex-col bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
        >
          {head(false)}
          <div className="flex flex-1 flex-col gap-4 overflow-auto px-6 py-5">
            {error && <ErrorAlert>{error}</ErrorAlert>}
            {factList(false)}
            {picker && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cal_unit" className="text-[14px] font-medium">
                  {t.assignedApartment}
                </label>
                <select id="cal_unit" value={String(b.apt)} disabled={busy} onChange={(e) => onMove(Number(e.target.value))} className={field}>
                  {apts.map((a) => (
                    <option key={a.apt} value={a.apt}>
                      {t.apartment(a.apt) + (a.apt !== b.apt && a.busy ? t.busySuffix : "")}
                    </option>
                  ))}
                </select>
                <span className="text-[13px] text-[#6B7280]">{t.assignedHint}</span>
              </div>
            )}
            {channelNote(false)}
          </div>
        </section>
      </div>

      {/* Phone: bottom sheet */}
      <div className="fixed inset-0 z-50 flex items-end bg-[rgba(17,24,39,0.45)] min-[900px]:hidden" onClick={onClose}>
        <section
          role="dialog"
          aria-modal="true"
          aria-label={b.guest}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92%] w-full flex-col gap-3.5 overflow-auto rounded-t-2xl bg-white px-4 pt-3 pb-5"
        >
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-[#D1D5DB]" />
          {head(true)}
          {error && <ErrorAlert>{error}</ErrorAlert>}
          {factList(true)}
          {picker && (
            <div className="flex flex-col gap-2">
              <span id="cal_unit_ph" className="text-[14px] font-bold">
                {t.assignedApartment}
              </span>
              <ul role="radiogroup" aria-labelledby="cal_unit_ph" className="m-0 flex list-none flex-col gap-1.5 p-0">
                {apts.map((a) => {
                  const current = a.apt === b.apt;
                  const taken = !current && !!a.busy;
                  return (
                    <li key={a.apt}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={current}
                        disabled={taken || busy}
                        onClick={() => !current && onMove(a.apt)}
                        className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-start ${
                          current
                            ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]"
                            : taken
                              ? "cursor-not-allowed border border-[#E5E7EB] bg-[#F9FAFB] text-[#9CA3AF]"
                              : "cursor-pointer border border-[#D1D5DB] bg-white text-[#111827]"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-[18px] w-[18px] flex-none rounded-full ${
                            current ? "border-[5px] border-[#639922]" : taken ? "border-[1.5px] border-[#D1D5DB]" : "border-[1.5px] border-[#9CA3AF]"
                          }`}
                        />
                        <span className="flex-1 text-[14px] font-semibold">{t.apartment(a.apt)}</span>
                        <span
                          className={`text-[12px] font-semibold ${current ? "text-[#27500A]" : taken ? "text-[#B91C1C]" : "text-[#15803D]"}`}
                        >
                          {current ? t.aptCurrent : a.busy ? t.aptBusy(t.day(a.busy.arrival), t.day(a.busy.departure)) : t.aptFree}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <span className="text-[12px] text-[#6B7280]">{t.assignedHint}</span>
            </div>
          )}
          {channelNote(true)}
        </section>
      </div>
    </>
  );
}
