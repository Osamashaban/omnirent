import { setLanguage } from "@/app/actions/auth";
import type { Dict, Lang } from "@/lib/i18n";
import { Globe } from "./icons";

// Switches the whole dashboard between Arabic and English, staying on the
// same page. The choice is remembered on this device.
export function LangButton({ lang, t, back }: { lang: Lang; t: Dict; back: string }) {
  return (
    <form action={setLanguage}>
      <input type="hidden" name="lang" value={lang === "ar" ? "en" : "ar"} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        lang={lang === "ar" ? "en" : "ar"}
        className="flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] font-medium text-[#4B5563] hover:bg-[#F9FAFB]"
      >
        <Globe />
        {t.otherLang}
      </button>
    </form>
  );
}
