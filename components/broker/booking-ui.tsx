"use client";

// Small pieces the Bookings and Guests pages share, styled as the design
// (App_Bookings, version 87): pills, platform tiles, buttons, fields, the
// side panel (full screen on phones), the centred dialog (a bottom sheet on
// phones), and the search box.

import { useEffect } from "react";
import { Close, Search } from "./booking-icons";

const btnBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold no-underline disabled:cursor-not-allowed disabled:opacity-60";
export const bbtn = {
  primary: `${btnBase} h-11 px-4 text-[15px] bg-[#639922] text-white border-0`,
  secondary: `${btnBase} h-11 px-4 text-[15px] bg-white text-[#111827] border border-[#D1D5DB]`,
  dangerSolid: `${btnBase} h-11 px-4 text-[15px] bg-[#DC2626] text-white border-0`,
  dangerOutline: `${btnBase} h-11 px-4 text-[15px] bg-white text-[#B91C1C] border border-[#FECACA]`,
  sPrimary: `${btnBase} h-9 px-3 text-[13px] bg-[#639922] text-white border-0`,
  sSecondary: `${btnBase} h-9 px-3 text-[13px] bg-white text-[#111827] border border-[#D1D5DB]`,
  sWhatsapp: `${btnBase} h-9 px-3 text-[13px] bg-white text-[#15803D] border border-[#BBF7D0]`,
  sDanger: `${btnBase} h-9 px-3 text-[13px] bg-white text-[#B91C1C] border border-[#FECACA]`,
  sDangerSolid: `${btnBase} h-9 px-3 text-[13px] bg-[#DC2626] text-white border-0`,
  sPurple: `${btnBase} h-9 px-3 text-[13px] bg-white text-[#6B21A8] border border-[#D8B4FE]`,
  link: "inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] font-semibold text-[#3B6D11]",
};

export const fieldBase = "h-11 w-full rounded-lg bg-white px-3 text-[15px] text-[#111827] placeholder:text-[#9CA3AF]";
export const fieldBorder = (bad: boolean) => (bad ? "border-[1.5px] border-[#DC2626]" : "border border-[#D1D5DB]");
export const textareaClass = "min-h-[72px] w-full resize-y rounded-lg border border-[#D1D5DB] bg-white px-3 py-2.5 text-[14px] leading-[1.6] text-[#111827] placeholder:text-[#9CA3AF]";

// Pill colours from the design.
export const PILL = {
  conf: "bg-[#DCFCE7] text-[#15803D]",
  pend: "bg-[#FEF3C7] text-[#92400E]",
  canc: "bg-[#F3F4F6] text-[#4B5563]",
  unpaid: "bg-[#FEE2E2] text-[#B91C1C]",
  part: "bg-[#FEF3C7] text-[#92400E]",
  paid: "bg-[#DCFCE7] text-[#15803D]",
  ota: "bg-[#EFF6FF] text-[#1D4ED8]",
  none: "bg-transparent text-[#9CA3AF]",
  changed: "bg-[#DBEAFE] text-[#1D4ED8]",
  over: "bg-[#DC2626] text-white",
  stage: "bg-[#F3F4F6] text-[#374151]",
  vip: "bg-[#FEF3C7] text-[#92400E]",
  repeat: "bg-[#DBEAFE] text-[#1D4ED8]",
  blocked: "bg-[#FEE2E2] text-[#B91C1C]",
  dup: "bg-[#F3E8FF] text-[#6B21A8]",
  req: "bg-[#FFE4E6] text-[#BE123C]",
  inq: "bg-[#F3F4F6] text-[#374151]",
  alt: "bg-[#DBEAFE] text-[#1D4ED8]",
  soon: "bg-[#FEE2E2] text-[#B91C1C]",
  later: "bg-[#FEF3C7] text-[#92400E]",
  request: "bg-[#FEF3C7] text-[#92400E]",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof PILL; children: React.ReactNode }) {
  return <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${PILL[tone]}`}>{children}</span>;
}

export function Tile({ color, ini, size = 28, radius = 7, font = 11 }: { color: string; ini: string; size?: number; radius?: number; font?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex flex-none items-center justify-center font-bold text-white"
      style={{ width: size, height: size, borderRadius: radius, fontSize: font, background: color }}
    >
      {ini}
    </span>
  );
}

export function GuestAvatar({ ini, size = 36 }: { ini: string; size?: number }) {
  return (
    <span aria-hidden="true" className="flex flex-none items-center justify-center rounded-full bg-[#E8EFE0] text-[13px] font-bold text-[#27500A]" style={{ width: size, height: size }}>
      {ini}
    </span>
  );
}

export function SearchBox({ value, onChange, label, className = "" }: { value: string; onChange: (v: string) => void; label: string; className?: string }) {
  return (
    <label className={`relative flex items-center ${className}`}>
      <span className="pointer-events-none absolute start-3 flex text-[#6B7280]">
        <Search />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={label}
        className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pe-3 ps-10 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] min-[900px]:h-10"
      />
    </label>
  );
}

export function Field({ id, label, error, children, className = "" }: { id?: string; label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-1 basis-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-medium min-[900px]:text-[14px]">
        {label}
      </label>
      {children}
      {error && (
        <span role="alert" className="text-[13px] text-[#B91C1C]">
          {error}
        </span>
      )}
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button type="button" onClick={onClose} aria-label={label} className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#4B5563]">
      <Close />
    </button>
  );
}

// The detail panel on the end side (booking, guest profile, new booking).
// Phones: full screen with a back arrow in the top bar, and an optional bar
// of buttons pinned to the bottom.
export function SidePanel({
  label,
  width,
  head,
  phoneTitle,
  onClose,
  closeLabel,
  backLabel,
  footer,
  phoneFooter,
  z = 40,
  children,
}: {
  label: string;
  width: number;
  head: React.ReactNode;
  phoneTitle: string;
  onClose: () => void;
  closeLabel: string;
  backLabel: string;
  footer?: React.ReactNode;
  phoneFooter?: React.ReactNode;
  z?: number;
  children: React.ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 flex justify-end bg-[rgba(17,24,39,0.30)] max-[899px]:bg-[#F9FAFB]" style={{ zIndex: z }} onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        style={{ ["--w" as string]: `${width}px` }}
        className="flex h-full w-full flex-col bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)] max-[899px]:bg-[#F9FAFB] max-[899px]:shadow-none min-[900px]:w-[var(--w)] min-[900px]:max-w-full"
      >
        <header className="flex h-14 flex-none items-center gap-2 border-b border-[#E5E7EB] bg-white px-2 min-[900px]:hidden">
          <button type="button" onClick={onClose} aria-label={backLabel} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#111827]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ltr:-scale-x-100">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <span className="min-w-0 flex-1 truncate text-[17px] font-bold">{phoneTitle}</span>
        </header>
        <div className="hidden flex-none items-start gap-3 border-b border-[#E5E7EB] px-6 py-5 min-[900px]:flex">
          {head}
          <CloseButton onClose={onClose} label={closeLabel} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto p-4 min-[900px]:gap-[18px] min-[900px]:px-6 min-[900px]:py-5">{children}</div>
        {footer && <div className="hidden flex-none gap-2.5 border-t border-[#E5E7EB] px-6 py-4 min-[900px]:flex">{footer}</div>}
        {phoneFooter && <div className="flex flex-none gap-2.5 border-t border-[#E5E7EB] bg-white px-4 py-3 min-[900px]:hidden [&>*]:h-12">{phoneFooter}</div>}
      </section>
    </div>
  );
}

// A small dialog: a window near the top on desktop, a bottom sheet on phones.
export function Dialog({
  title,
  onClose,
  closeLabel,
  footer,
  children,
  z = 60,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  footer: React.ReactNode;
  children: React.ReactNode;
  z?: number;
}) {
  useEscape(onClose);
  return (
    <div
      className="fixed inset-0 flex bg-[rgba(17,24,39,0.45)] max-[899px]:items-end min-[900px]:items-start min-[900px]:justify-center min-[900px]:pt-[140px]"
      style={{ zIndex: z }}
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col overflow-hidden bg-white max-[899px]:max-h-[92%] max-[899px]:gap-3.5 max-[899px]:rounded-t-2xl max-[899px]:px-4 max-[899px]:pb-5 max-[899px]:pt-2 min-[900px]:max-h-[calc(100%-160px)] min-[900px]:w-[480px] min-[900px]:max-w-[calc(100%-32px)] min-[900px]:rounded-2xl min-[900px]:shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
      >
        <span aria-hidden="true" className="h-1 w-10 flex-none self-center rounded-sm bg-[#D1D5DB] min-[900px]:hidden" />
        <div className="flex flex-none items-start gap-3 min-[900px]:border-b min-[900px]:border-[#E5E7EB] min-[900px]:px-5 min-[900px]:py-[18px]">
          <h2 className="m-0 flex-1 text-[18px] font-bold leading-[1.4]">{title}</h2>
          <span className="max-[899px]:hidden">
            <CloseButton onClose={onClose} label={closeLabel} />
          </span>
        </div>
        <div className="flex min-h-0 flex-col gap-3.5 overflow-auto min-[900px]:p-5">{children}</div>
        <div className="flex flex-none gap-2.5 max-[899px]:flex-row-reverse min-[900px]:border-t min-[900px]:border-[#E5E7EB] min-[900px]:px-5 min-[900px]:py-4 [&>button]:max-[899px]:h-12">
          {footer}
        </div>
      </section>
    </div>
  );
}

export function Banner({ tone, icon, children, role }: { tone: "red" | "redSoft" | "blue" | "grey" | "purple" | "rose" | "amber"; icon?: React.ReactNode; children: React.ReactNode; role?: "alert" }) {
  const cls = {
    red: "bg-[#FEF2F2] border border-[#FCA5A5] text-[#7F1D1D]",
    redSoft: "bg-[#FEF2F2] border border-[#FECACA] text-[#7F1D1D]",
    blue: "bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A]",
    grey: "bg-[#F3F4F6] text-[#374151]",
    purple: "bg-[#FAF5FF] border border-[#E9D5FF] text-[#581C87]",
    rose: "bg-[#FFF1F2] border border-[#FECDD3] text-[#881337]",
    amber: "bg-[#FFFBEB] border border-[#FDE68A] text-[#111827]",
  }[tone];
  return (
    <div role={role} className={`flex gap-2.5 rounded-[10px] px-3.5 py-3 text-[14px] leading-[1.6] max-[899px]:px-3 max-[899px]:text-[13px] ${cls}`}>
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
