// Layout shared by every sign-in and password screen: the form column next to
// the dark Ops panel. Under 900px the panel hides and the form sits in a white
// card, as in the phone designs.

import type { Dict, Lang } from "@/lib/i18n";
import { LogoMark, Wordmark } from "./Logo";
import { LangButton } from "./LangButton";

export function AuthShell({
  lang,
  t,
  back,
  children,
}: {
  lang: Lang;
  t: Dict;
  back: string;
  children: React.ReactNode;
}) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div
      lang={lang}
      dir={dir}
      className="flex min-h-screen bg-[#F9FAFB] font-[family-name:var(--font-outfit)] text-[#111827] [font-family:var(--font-outfit),var(--font-plex-arabic),sans-serif]"
    >
      <section className="flex min-w-0 flex-1 flex-col gap-8 px-5 pb-6 pt-5 min-[900px]:px-12 min-[900px]:py-7">
        <header className="flex h-11 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </div>
          <LangButton lang={lang} t={t} back={back} />
        </header>
        <main className="flex flex-1 items-start justify-center min-[900px]:items-center">
          <div className="w-full max-w-[400px] rounded-xl border border-[#E5E7EB] bg-white px-5 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.05)] min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:shadow-none">
            {children}
          </div>
        </main>
        <footer className="flex justify-center gap-4 text-[13px] text-[#6B7280] min-[900px]:justify-start">
          <span>© 2026 Omnirent</span>
          <span>·</span>
          <a href="https://getomnirent.com" className="text-[#6B7280] hover:text-[#111827]">
            {t.help}
          </a>
          <span>·</span>
          <a href="https://getomnirent.com" className="text-[#6B7280] hover:text-[#111827]">
            {t.privacy}
          </a>
        </footer>
      </section>
      <OpsPanel t={t} />
    </div>
  );
}

function OpsPanel({ t }: { t: Dict }) {
  const channels = [
    { mark: "A", name: "Airbnb", color: "#FF5A5F" },
    { mark: "B.", name: "Booking.com", color: "#003580" },
    { mark: "HW", name: "Hostelworld", color: "#F57C00" },
  ];
  return (
    <aside className="m-4 hidden min-w-0 flex-1 flex-col justify-center gap-8 rounded-3xl bg-[#1A2E0A] bg-[radial-gradient(circle_at_20%_15%,rgba(99,153,34,0.35),transparent_55%),radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:auto,28px_28px] px-8 py-14 text-[#F0ECE4] min-[900px]:flex min-[1100px]:px-12">
      <div className="flex flex-col gap-4">
        <span className="text-[12px] font-bold tracking-[0.08em] text-[#97C459]">{t.panelEyebrow}</span>
        <h2 className="m-0 text-[36px] font-bold leading-[1.2] tracking-[-0.01em] text-white min-[1100px]:text-[44px]">
          {t.panelTitle1}
          <br />
          {t.panelTitle2}
        </h2>
        <p className="m-0 text-[16px] leading-[1.7] text-white/70">{t.panelBody}</p>
      </div>
      <div className="flex max-w-[420px] flex-col gap-2.5 rounded-2xl border border-white/10 bg-[#1F3510] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-semibold text-white">{t.panelProperty}</span>
          <span className="text-[12px] text-white/60">{t.panelSynced}</span>
        </div>
        {channels.map((c) => (
          <div key={c.name} className="flex items-center gap-2.5 rounded-[10px] bg-white/[0.06] px-3 py-2.5">
            <span
              dir="ltr"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-bold text-white"
              style={{ background: c.color }}
            >
              {c.mark}
            </span>
            <span className="flex-1 text-[14px]">{c.name}</span>
            <span className="flex items-center gap-1.5 text-[13px] text-[#C0DD97]">
              <span className="h-2 w-2 rounded-full bg-[#97C459]" />
              {t.panelConnected}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
