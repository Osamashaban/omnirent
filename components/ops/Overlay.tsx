"use client";

import { useEffect, useRef } from "react";
import { X } from "./icons";

// Side drawer on desktop (slides in from the end side), full-screen sheet on
// phones, with the main button pinned at the bottom.
export function Drawer({
  title,
  description,
  closeLabel,
  onClose,
  footer,
  children,
}: {
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(17,24,39,0.45)]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)] min-[900px]:w-[460px]"
      >
        <div className="flex items-start gap-3 border-b border-[#E5E7EB] p-5 min-[900px]:p-6">
          <div className="flex flex-1 flex-col gap-1.5">
            <h2 className="m-0 text-[22px] font-bold">{title}</h2>
            {description && <p className="m-0 text-[14px] leading-[1.6] text-[#4B5563]">{description}</p>}
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]"
          >
            <X />
          </button>
        </div>
        {children}
        <div className="flex gap-3 border-t border-[#E5E7EB] px-5 py-4 min-[900px]:px-6 min-[900px]:py-5">{footer}</div>
      </section>
    </div>
  );
}

export function Dialog({
  title,
  icon,
  onClose,
  children,
  actions,
}: {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,39,0.45)] p-4" onClick={onClose}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-5 rounded-2xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
      >
        {icon}
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-[20px] font-bold leading-[1.35]">{title}</h2>
          <div className="text-[15px] leading-[1.6] text-[#4B5563]">{children}</div>
        </div>
        <div className="flex flex-wrap gap-3">{actions}</div>
      </section>
    </div>
  );
}

export function Toast({ children, onClose, closeLabel }: { children: React.ReactNode; onClose: () => void; closeLabel: string }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    timer.current = setTimeout(onClose, 5000);
    return () => clearTimeout(timer.current);
  }, [onClose]);
  return (
    <div
      role="status"
      className="fixed bottom-6 end-6 z-50 flex max-w-[calc(100%-32px)] items-center gap-3 rounded-xl bg-[#111827] px-4 py-3.5 text-[14px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-[899px]:inset-x-4 max-[899px]:bottom-5 max-[899px]:max-w-none"
    >
      <span className="flex text-[#4ADE80]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      <button type="button" aria-label={closeLabel} onClick={onClose} className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#D1D5DB]">
        <X size={18} />
      </button>
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
}
