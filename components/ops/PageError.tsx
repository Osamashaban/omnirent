"use client";

import { AlertCircle, Refresh } from "./icons";

// Retry card when a Settings page fails to load. Shown in both languages
// because the language cookie can't be read from here.
export function PageError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-4 [font-family:var(--font-outfit),var(--font-plex-arabic),sans-serif]">
      <div className="flex w-full max-w-[460px] flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]">
          <AlertCircle size={26} />
        </span>
        <p dir="rtl" className="m-0 text-[20px] font-bold">تعذّر تحميل الصفحة</p>
        <p className="m-0 text-[20px] font-bold">Couldn&apos;t load this page</p>
        <p dir="rtl" className="m-0 text-[15px] text-[#4B5563]">تحقق من اتصالك ثم حاول مرة أخرى.</p>
        <p className="m-0 text-[15px] text-[#4B5563]">Check your connection and try again.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-[18px] text-[15px] font-semibold text-[#111827]"
        >
          <Refresh />
          إعادة المحاولة · Try again
        </button>
      </div>
    </div>
  );
}
