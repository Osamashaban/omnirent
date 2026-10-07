"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "./icons";

// Under 900px the sidebar becomes a drawer behind the menu button.
export function MobileMenu({
  openLabel,
  closeLabel,
  brand,
  footer,
  children,
}: {
  openLabel: string;
  closeLabel: string;
  brand: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={openLabel}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[#111827]"
      >
        <Menu />
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex bg-[rgba(17,24,39,0.45)]" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openLabel}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-[300px] max-w-[85%] flex-col gap-7 bg-white px-3.5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-center justify-between">
              {brand}
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[#4B5563]"
              >
                <X />
              </button>
            </div>
            {children}
            <div className="mt-auto">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}
