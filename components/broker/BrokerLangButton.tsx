"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { setLanguage } from "@/app/actions/auth";
import { Globe } from "@/components/ops/icons";
import type { Lang } from "@/lib/i18n";

// Switches the broker app between Arabic and English, staying on the same
// page (with its search and filters). The choice is remembered on this device.
export function BrokerLangButton({ lang, label }: { lang: Lang; label: string }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return (
    <form action={setLanguage}>
      <input type="hidden" name="lang" value={lang === "ar" ? "en" : "ar"} />
      <input type="hidden" name="back" value={query ? `${pathname}?${query}` : pathname} />
      <button
        type="submit"
        lang={lang === "ar" ? "en" : "ar"}
        className="flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] font-medium text-[#4B5563] hover:bg-[#F9FAFB]"
      >
        <Globe />
        {label}
      </button>
    </form>
  );
}
