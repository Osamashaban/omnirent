"use client";

// Small pieces of the Channels page, styled as the design (App_Channels,
// version 80): platform tiles, status pills, buttons, the switch, and the
// dialog frame (a centred window or side panel on desktop, a bottom sheet
// on phones).

import { useEffect } from "react";
import { X } from "@/components/ops/icons";
import { initials, type Platform } from "@/lib/channel-catalog";
import type { St } from "@/lib/channel-rules";

export const ST_STYLE: Record<St, string> = {
  on: "bg-[#DCFCE7] text-[#15803D]",
  wait: "bg-[#FEF3C7] text-[#92400E]",
  attn: "bg-[#FEE2E2] text-[#B91C1C]",
  off: "bg-[#F3F4F6] text-[#4B5563]",
  rej: "bg-[#FEE2E2] text-[#B91C1C]",
  na: "bg-[#F3F4F6] text-[#9CA3AF]",
};
export const ST_TEXT: Record<St, string> = {
  on: "text-[#15803D]",
  wait: "text-[#92400E]",
  attn: "text-[#B91C1C]",
  off: "text-[#4B5563]",
  rej: "text-[#B91C1C]",
  na: "text-[#9CA3AF]",
};

export function Tile({ p, size = 40, radius = 10, font = 16, round = false, className = "" }: { p: Pick<Platform, "name" | "color"> | null; size?: number; radius?: number; font?: number; round?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center font-bold text-white ${className}`}
      style={{ width: size, height: size, borderRadius: round ? "50%" : radius, fontSize: font, background: p?.color ?? "#4B5563" }}
    >
      {p ? initials(p.name) : ""}
    </span>
  );
}

export function Pill({ st, label }: { st: St; label: string }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${ST_STYLE[st]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

const btnBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-60";
export const btn = {
  primary: `${btnBase} h-11 px-[18px] text-[15px] bg-[#639922] text-white border-0`,
  secondary: `${btnBase} h-11 px-[18px] text-[15px] bg-white text-[#111827] border border-[#D1D5DB]`,
  danger: `${btnBase} h-11 px-[18px] text-[15px] bg-[#DC2626] text-white border-0`,
  dangerOutline: `${btnBase} h-11 px-[18px] text-[15px] bg-white text-[#B91C1C] border border-[#FCA5A5]`,
  smallPrimary: `${btnBase} h-9 px-3 text-[13px] bg-[#639922] text-white border-0`,
  smallSecondary: `${btnBase} h-9 px-3 text-[13px] bg-white text-[#374151] border border-[#D1D5DB]`,
  link: "cursor-pointer border-0 bg-transparent p-0 font-semibold text-[#3B6D11]",
};

export const fieldClass =
  "h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-[15px] text-[#111827] placeholder:text-[#9CA3AF]";

export function Switch({ on, label, onClick, disabled, size = "lg" }: { on: boolean; label?: string; onClick: () => void; disabled?: boolean; size?: "lg" | "sm" }) {
  const w = size === "lg" ? 44 : 40;
  const h = size === "lg" ? 24 : 22;
  const k = size === "lg" ? 20 : 18;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ? undefined : "switch"}
      disabled={disabled}
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[12px] font-semibold text-[#374151] disabled:cursor-wait"
    >
      <span className="relative flex-none rounded-full" style={{ width: w, height: h, background: on ? "#639922" : "#D1D5DB" }}>
        <span
          className="absolute top-[2px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          style={{ width: k, height: k, insetInlineStart: on ? w - k - 2 : 2 }}
        />
      </span>
      {label}
    </button>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

// A dialog. Desktop: a window in the middle (center) or a panel on the end
// side (side). Phones: a bottom sheet with a handle, the main button full
// width. Secondary footer buttons can be hidden on phones, as the phone
// boards show only the main one.
export function Modal({
  title,
  onClose,
  closeLabel,
  side = false,
  width = 520,
  footer,
  head,
  children,
  z = 50,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  side?: boolean;
  width?: number;
  footer?: React.ReactNode;
  head?: React.ReactNode;
  children: React.ReactNode;
  z?: number;
}) {
  useEscape(onClose);
  return (
    <div
      className={`fixed inset-0 flex bg-[rgba(17,24,39,0.45)] max-[899px]:items-end min-[900px]:bg-[rgba(17,24,39,0.35)] ${side ? "min-[900px]:justify-end" : "min-[900px]:items-center min-[900px]:justify-center"}`}
      style={{ zIndex: z }}
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{ ["--w" as string]: `${width}px` }}
        className={`flex w-full flex-col overflow-hidden bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)] max-[899px]:max-h-[92%] max-[899px]:gap-3 max-[899px]:rounded-t-2xl max-[899px]:px-4 max-[899px]:pb-5 max-[899px]:pt-3 ${
          side ? "min-[900px]:h-full min-[900px]:w-[var(--w)] min-[900px]:max-w-full" : "min-[900px]:max-h-[90%] min-[900px]:w-[var(--w)] min-[900px]:max-w-[calc(100%-32px)] min-[900px]:rounded-2xl"
        }`}
      >
        <span aria-hidden="true" className="h-1 w-10 flex-none self-center rounded-sm bg-[#D1D5DB] min-[900px]:hidden" />
        <div className="flex flex-none items-start gap-3 min-[900px]:border-b min-[900px]:border-[#E5E7EB] min-[900px]:px-6 min-[900px]:py-5">
          {head}
          <h2 className="m-0 flex-1 text-[18px] font-bold leading-[1.4] min-[900px]:text-[20px]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#4B5563] max-[899px]:-me-2 max-[899px]:-mt-2"
          >
            <X />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto min-[900px]:gap-4 min-[900px]:px-6 min-[900px]:py-5">{children}</div>
        {footer && (
          <div className="flex flex-none flex-col gap-2 min-[900px]:flex-row min-[900px]:gap-3 min-[900px]:border-t min-[900px]:border-[#E5E7EB] min-[900px]:px-6 min-[900px]:py-4 [&>button]:max-[899px]:h-12 [&>button]:max-[899px]:w-full">
            {footer}
          </div>
        )}
      </section>
    </div>
  );
}

export function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function LinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

export function ExternalIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function ShieldIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}
