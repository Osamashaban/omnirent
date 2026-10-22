// Layout shared by every broker sign-in and password screen on
// app.getomnirent.com (design page App_Broker_Access): the form column next
// to the dark broker panel. Under 900px the panel and footer hide and a slim
// top bar with the language link takes their place, as in the phone designs.

import { setLanguage } from "@/app/actions/auth";
import type { Lang } from "@/lib/i18n";
import type { BrokerDict } from "@/lib/broker-i18n";
import { LogoMark, Wordmark } from "@/components/ops/Logo";

export function BrokerAuthShell({
  lang,
  b,
  back,
  toast,
  children,
}: {
  lang: Lang;
  b: BrokerDict;
  back: string;
  toast?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="relative flex min-h-screen bg-[#F9FAFB] text-[#111827] [font-family:var(--font-outfit),var(--font-plex-arabic),sans-serif] max-[899px]:flex-col"
    >
      <header className="flex h-14 items-center justify-between px-4 min-[900px]:hidden">
        <div className="flex items-center gap-2">
          <LogoMark size={30} />
          <Wordmark className="text-[19px]" />
        </div>
        <LangLink lang={lang} b={b} back={back} />
      </header>
      <section className="flex min-w-0 flex-[1_1_520px] flex-col gap-8 px-5 py-4 min-[900px]:px-12 min-[900px]:pb-7 min-[900px]:pt-7">
        <div className="hidden items-center gap-2.5 min-[900px]:flex">
          <LogoMark size={30} />
          <Wordmark className="text-[19px]" />
        </div>
        <main className="flex flex-1 items-start justify-center min-[900px]:pt-10">
          <div className="flex w-full max-w-[420px] flex-col gap-4 min-[900px]:gap-5">{children}</div>
        </main>
        <footer className="hidden gap-4 text-[13px] text-[#6B7280] min-[900px]:flex">
          <span>© 2026 Omnirent</span>
          <a href="https://getomnirent.com" className="text-[#6B7280] underline">
            {b.terms}
          </a>
          <a href="https://getomnirent.com" className="text-[#6B7280] underline">
            {b.privacy}
          </a>
          <span className="ms-auto">
            <LangLink lang={lang} b={b} back={back} />
          </span>
        </footer>
      </section>
      <aside className="m-4 hidden min-w-0 flex-[1_1_460px] flex-col justify-start gap-4 rounded-3xl bg-[#1A2E0A] bg-[radial-gradient(circle_at_80%_10%,rgba(99,153,34,0.35),transparent_55%)] px-12 pb-14 pt-[104px] text-[#F0ECE4] min-[900px]:flex">
        <span className="text-[12px] font-bold tracking-[0.08em] text-[#97C459]">{b.panelEyebrow}</span>
        <h2 className="m-0 text-[42px] font-bold leading-[1.2] text-white">
          {b.panelTitle1}
          <br />
          {b.panelTitle2}
        </h2>
        <p className="m-0 text-[16px] leading-[1.7] text-white/70">{b.panelBody}</p>
      </aside>
      {toast}
    </div>
  );
}

function LangLink({ lang, b, back }: { lang: Lang; b: BrokerDict; back: string }) {
  return (
    <form action={setLanguage} className="m-0">
      <input type="hidden" name="lang" value={lang === "ar" ? "en" : "ar"} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        lang={lang === "ar" ? "en" : "ar"}
        className="cursor-pointer border-0 bg-transparent p-0 text-[14px] font-semibold text-[#3B6D11] underline hover:text-[#27500A] min-[900px]:text-[13px]"
      >
        {b.otherLang}
      </button>
    </form>
  );
}

// Page title and intro, 30px on desktop and 26px on phones as designed.
export function BrokerHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 text-[26px] font-bold leading-[1.25] min-[900px]:text-[30px]">{title}</h1>
      {children && <p className="m-0 text-[15px] leading-[1.7] text-[#4B5563]">{children}</p>}
    </div>
  );
}

// Round status icon above "Signed in", "Check your email" and the like.
export function BrokerStatusIcon({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  return (
    <span
      className={`flex h-14 w-14 items-center justify-center rounded-full ${
        tone === "green" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
      }`}
    >
      {children}
    </span>
  );
}

export function BrokerAlert({ tone, children }: { tone: "error" | "warn"; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={`flex gap-2.5 rounded-[10px] px-3.5 py-3 text-[14px] leading-[1.6] ${
        tone === "error" ? "border border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]" : "border border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 hidden flex-none min-[900px]:block">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function BrokerFieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} role="alert" className="flex items-center gap-1.5 text-[13px] text-[#B91C1C]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      {children}
    </span>
  );
}

export const brokerInputClass =
  "h-12 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-[15px] text-[#111827] outline-none placeholder:text-[#9CA3AF] [direction:ltr] text-start focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25 aria-[invalid=true]:border-[1.5px] aria-[invalid=true]:border-[#DC2626]";

export const brokerPrimaryButtonClass =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[#639922] px-[18px] text-[15px] font-semibold text-white no-underline shadow-[0_4px_16px_rgba(99,153,34,0.30)] hover:bg-[#4E8F20] hover:text-white disabled:cursor-not-allowed disabled:opacity-70";

export const brokerSecondaryButtonClass =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-[18px] text-[15px] font-semibold text-[#111827] no-underline hover:bg-[#F9FAFB]";

export const brokerLinkButtonClass =
  "cursor-pointer self-start border-0 bg-transparent p-0 text-[14px] font-semibold text-[#3B6D11] no-underline hover:text-[#27500A]";
