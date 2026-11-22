"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/broker/booking-icons";
import { BOOKING_DICTS } from "@/lib/booking-i18n";

// Shown when Bookings or Guests fails to load, inside the app frame. The
// language is taken from the frame around it.
export default function BookingsError({ reset }: { error: Error; reset: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<"ar" | "en">("en");
  useEffect(() => {
    if (box.current?.closest("[lang]")?.getAttribute("lang") === "ar") setLang("ar");
  }, []);
  const t = BOOKING_DICTS[lang];
  return (
    <main className="flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4 min-[900px]:px-9 min-[900px]:py-6">
      <div
        ref={box}
        className="flex flex-col items-center gap-3 px-2 py-12 text-center min-[900px]:rounded-xl min-[900px]:border min-[900px]:border-dashed min-[900px]:border-[#E5E7EB] min-[900px]:bg-white min-[900px]:px-6 min-[900px]:py-14"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]">
          <Alert size={26} />
        </span>
        <h1 className="m-0 text-[20px] font-bold">{t.errorTitle}</h1>
        <p className="m-0 max-w-[460px] text-[15px] text-[#4B5563]">{t.errorBody}</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 text-[15px] font-semibold text-[#111827] min-[900px]:h-11 min-[900px]:w-auto"
        >
          {t.retry}
        </button>
      </div>
    </main>
  );
}
