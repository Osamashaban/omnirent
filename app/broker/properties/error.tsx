"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Refresh } from "@/components/ops/icons";
import { PROPERTY_DICTS } from "@/lib/property-i18n";

// Shown when a Properties page fails to load, inside the app frame. The
// language is taken from the frame around it.
export default function PropertiesError({ reset }: { error: Error; reset: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<"ar" | "en">("en");
  useEffect(() => {
    if (box.current?.closest("[lang]")?.getAttribute("lang") === "ar") setLang("ar");
  }, []);
  const p = PROPERTY_DICTS[lang];
  return (
    <main className="flex w-full max-w-[1280px] flex-col gap-6 px-4 py-4 min-[900px]:px-9 min-[900px]:py-8">
      <div ref={box} className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]">
          <AlertCircle size={26} />
        </span>
        <h1 className="m-0 text-[20px] font-bold">{p.errorTitle}</h1>
        <p className="m-0 text-[15px] text-[#4B5563]">{p.errorBody}</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-[18px] text-[15px] font-semibold text-[#111827]"
        >
          <Refresh />
          {p.tryAgain}
        </button>
      </div>
    </main>
  );
}
