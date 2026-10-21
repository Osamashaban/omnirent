"use client";

// Pieces shared by the Settings › Countries & cities and Property types pages.

import type { Dict } from "@/lib/i18n";
import { Dialog } from "./Overlay";
import { AlertCircle, Search } from "./icons";
import { inputClass, secondaryButtonClass } from "./ui";

// The design's inputs on these pages are 44px tall.
export const fieldClass = inputClass.replace("h-12", "h-11");

export function SearchBox({
  value,
  onChange,
  label,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
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
        placeholder={placeholder ?? label}
        className={`${fieldClass} ps-10 text-[14px]`}
      />
    </label>
  );
}

export function ConfirmDialog({
  t,
  tone,
  title,
  body,
  goLabel,
  closeLabel,
  pending,
  icon,
  onGo,
  onClose,
}: {
  t: Dict;
  tone: "amber" | "red" | "grey";
  title: string;
  body: string;
  goLabel: string;
  closeLabel?: string;
  pending: boolean;
  icon?: React.ReactNode;
  onGo: () => void;
  onClose: () => void;
}) {
  const iconTone = {
    amber: "bg-[#FEF3C7] text-[#B45309]",
    red: "bg-[#FEE2E2] text-[#B91C1C]",
    grey: "bg-[#F3F4F6] text-[#4B5563]",
  }[tone];
  return (
    <Dialog
      title={title}
      onClose={onClose}
      icon={<span className={`flex h-12 w-12 items-center justify-center rounded-full ${iconTone}`}>{icon ?? <AlertCircle size={24} />}</span>}
      actions={
        <>
          <button
            type="button"
            disabled={pending}
            onClick={onGo}
            className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-[18px] text-[15px] font-semibold text-white ${
              tone === "red" ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#639922] hover:bg-[#4E8F20]"
            }`}
          >
            {goLabel}
          </button>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {closeLabel ?? t.cancel}
          </button>
        </>
      }
    >
      <p className="m-0">{body}</p>
    </Dialog>
  );
}

export function FormAlert({ text }: { text: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3 text-[14px] font-semibold text-[#B91C1C]">
      <AlertCircle className="mt-0.5 flex-none text-[#DC2626]" />
      {text}
    </div>
  );
}
