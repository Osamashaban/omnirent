// Small pieces shared by the Calendar's desktop and phone screens.

import type { CalendarDict } from "@/lib/calendar-i18n";
import type { Night, Tri } from "@/lib/calendar-rules";
import { CheckCircle, AlertCircle } from "@/components/ops/icons";

export const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

// "3+" (min stay), kept in that order inside Arabic text.
export const plus = (n: number) => `\u2066${n}+\u2069`;

export const HATCH_BLOCKED = "repeating-linear-gradient(135deg,#E5E7EB 0 6px,#F9FAFB 6px 12px)";
export const HATCH_LINKED = "repeating-linear-gradient(135deg,#EAF3DE 0 6px,#FFFFFF 6px 12px)";

// What one night says on screen, in the design's order of precedence.
export type NightLook = {
  background?: string;
  top: string;
  topClass: string;
  sub: string;
  subClass: string;
  title: string;
};

export function gridLook(
  t: CalendarDict,
  type: { count: number; minStay: number },
  date: string,
  night: Night,
  money: (n: number) => string,
): NightLook {
  const look: NightLook = {
    top: num(night.price),
    topClass: "text-[#111827]",
    sub: "",
    subClass: "text-[#6B7280]",
    title: `${t.day(date)} · ${money(night.price)} · ${t.minStayN(night.minStay)}`,
  };
  if (night.block) {
    return { ...look, background: HATCH_BLOCKED, top: t.blocked, topClass: "text-[11px] text-[#4B5563]", title: t.blockedColon + t.reasons[night.block] };
  }
  if (night.stop) return { ...look, background: "#FEE2E2", topClass: "text-[#9CA3AF] line-through", sub: t.closed, subClass: "text-[#B91C1C]" };
  if (night.linked && !night.booked) {
    return { ...look, background: HATCH_LINKED, topClass: "text-[#9CA3AF]", sub: t.linked, subClass: "text-[#3B6D11]", title: t.linkedTitle };
  }
  if (type.count > 1) {
    const sub = t.leftOf(night.left, type.count) + (night.minStay > type.minStay ? ` · ${plus(night.minStay)}` : "");
    return { ...look, sub, subClass: night.left === 0 ? "text-[#B91C1C]" : "text-[#15803D]" };
  }
  if (!night.booked) return { ...look, sub: night.minStay > 1 ? plus(night.minStay) : "", subClass: "text-[#111827]" };
  return { ...look, topClass: "text-[#9CA3AF]" };
}

// The longer texts of the month views and the phone day list.
export function monthLook(t: CalendarDict, type: { count: number }, night: Night): { background?: string; sub: string; subClass: string } {
  if (night.block) return { background: HATCH_BLOCKED, sub: t.blockedDot + t.reasons[night.block], subClass: "text-[#6B7280]" };
  if (night.stop) return { background: "#FEE2E2", sub: t.closedForSale, subClass: "text-[#B91C1C]" };
  if (night.linked && !night.booked) return { background: HATCH_LINKED, sub: t.closedByLinked, subClass: "text-[#3B6D11]" };
  if (type.count > 1) return { sub: t.leftOfLong(night.left, type.count), subClass: night.left === 0 ? "text-[#B91C1C]" : "text-[#15803D]" };
  return { sub: "", subClass: "text-[#6B7280]" };
}

// No arrival / no departure corner marks.
export function Corners({ cta, ctd, size = 10 }: { cta: boolean; ctd: boolean; size?: number }) {
  return (
    <>
      {cta && (
        <span
          aria-hidden="true"
          className="absolute start-0 top-0 h-0 w-0"
          style={{ borderTop: `${size}px solid #F59E0B`, borderInlineEnd: `${size}px solid transparent` }}
        />
      )}
      {ctd && (
        <span
          aria-hidden="true"
          className="absolute end-0 top-0 h-0 w-0"
          style={{ borderTop: `${size}px solid #7C3AED`, borderInlineStart: `${size}px solid transparent` }}
        />
      )}
    </>
  );
}

// A row of options on a grey track, one picked.
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
  itemClass = "h-8 px-3 text-[13px]",
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  className?: string;
  itemClass?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex flex-wrap rounded-lg bg-[#F3F4F6] p-[3px] ${className}`}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`cursor-pointer rounded-md border-0 font-semibold ${itemClass} ${
            value === v ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "bg-transparent text-[#4B5563]"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function triOptions(t: CalendarDict, kind: "rule" | "sale", order: "design" | "phone" = "design"): [Tri, string][] {
  const on = kind === "rule" ? t.notAllowed : t.closed;
  const off = kind === "rule" ? t.allowed : t.open;
  return order === "design" ? [["keep", t.keep], ["on", on], ["off", off]] : [["keep", t.keep], ["off", off], ["on", on]];
}

export function chipClass(on: boolean) {
  return on ? "border-[1.5px] border-[#639922] bg-[#EAF3DE] text-[#27500A]" : "border border-[#D1D5DB] bg-white text-[#374151]";
}

export function ErrorAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3 py-2.5 text-[13px] text-[#B91C1C]">
      {children}
    </div>
  );
}

export type ToastState = { text: string; error: boolean; changeId: string | null };

export function CalendarToast({ toast, t, onUndo }: { toast: ToastState; t: CalendarDict; onUndo: () => void }) {
  return (
    <div
      role="status"
      className={`fixed z-[60] flex items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-[899px]:inset-x-3 max-[899px]:bottom-4 max-[899px]:text-[13px] min-[900px]:bottom-6 min-[900px]:start-[272px] ${
        toast.error ? "bg-[#B91C1C]" : "bg-[#111827]"
      }`}
    >
      <span className={`flex flex-none ${toast.error ? "" : "text-[#4ADE80]"}`}>{toast.error ? <AlertCircle /> : <CheckCircle />}</span>
      <span className="min-w-0 flex-1">{toast.text}</span>
      {toast.changeId && (
        <button
          type="button"
          onClick={onUndo}
          className="ms-2 cursor-pointer border-0 bg-transparent font-bold text-[#A3E635] underline max-[899px]:min-h-11"
        >
          {t.undo}
        </button>
      )}
    </div>
  );
}

export type SyncState = { kind: "live" } | { kind: "sending"; count: number } | { kind: "failed"; count: number };

export function SyncPill({ sync, t, onRetry, phone = false }: { sync: SyncState; t: CalendarDict; onRetry: () => void; phone?: boolean }) {
  const tone =
    sync.kind === "live"
      ? "bg-[#DCFCE7] text-[#15803D]"
      : sync.kind === "sending"
        ? phone
          ? "bg-[#FEF3C7] text-[#92400E]"
          : "bg-[#DBEAFE] text-[#1D4ED8]"
        : "bg-[#FEE2E2] text-[#B91C1C]";
  const text =
    sync.kind === "live"
      ? phone
        ? t.syncLivePhone
        : t.syncLive
      : sync.kind === "sending"
        ? phone
          ? t.syncSendingPhone
          : t.syncSending(sync.count)
        : phone
          ? t.syncFailedPhone(sync.count)
          : t.syncFailed(sync.count);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-none items-center gap-2 rounded-full font-semibold ${phone ? "h-7 px-2.5 text-[12px]" : "h-9 px-3 text-[13px]"} ${tone}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {text}
      {sync.kind === "failed" && !phone && (
        <button type="button" onClick={onRetry} className="cursor-pointer border-0 bg-transparent text-[13px] font-bold text-[#B91C1C] underline">
          {t.retry}
        </button>
      )}
    </div>
  );
}
