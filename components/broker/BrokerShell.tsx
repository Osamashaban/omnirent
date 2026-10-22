// The signed-in broker app frame (app.getomnirent.com): sidebar on desktop
// with the company card, the Properties link and the user card; under 900px
// a top bar instead. As in Ops, the language button sits
// above the user card. The design's Calendar link is left out until the
// calendar exists.

import Link from "next/link";
import { brokerSignOut } from "@/app/actions/broker-auth";
import type { CurrentBroker } from "@/lib/broker-auth";
import type { Lang } from "@/lib/i18n";
import type { PropertyDict } from "@/lib/property-i18n";
import { LogoMark, Wordmark } from "@/components/ops/Logo";
import { MobileMenu } from "@/components/ops/MobileMenu";
import { LogOut, X } from "@/components/ops/icons";
import { Initials } from "@/components/ops/ui";
import { Building } from "./property-icons";
import { BrokerLangButton } from "./BrokerLangButton";

// The frame is the layout of every Properties page, so the sidebar stays put
// while pages load. Each page draws its own phone top bar: the list has the
// menu button, the wizard and property page a close (X) back to the list.
export function BrokerFrame({ current, lang, p, children }: { current: CurrentBroker; lang: Lang; p: PropertyDict; children: React.ReactNode }) {
  return (
    <div
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="flex min-h-screen bg-[#F9FAFB] text-[#111827] [font-family:var(--font-outfit),var(--font-plex-arabic),sans-serif] max-[899px]:flex-col"
    >
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col gap-5 border-e border-[#E5E7EB] bg-white px-3.5 py-5 min-[900px]:flex">
        <Brand />
        <CompanyCard current={current} p={p} />
        <SideNav p={p} />
        <div className="mt-auto">
          <UserCard current={current} p={p} lang={lang} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

// The page body inside the frame.
export function BrokerMain({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={`flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-6 px-4 py-4 min-[900px]:px-9 min-[900px]:py-8 ${className}`}>
      {children}
    </main>
  );
}

const phoneBarClass = "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#E5E7EB] bg-white px-2 min-[900px]:hidden";

// Phone top bar with the slide-out menu (the properties list).
export function BrokerMenuBar({ current, lang, p, title }: { current: CurrentBroker; lang: Lang; p: PropertyDict; title: string }) {
  return (
    <header className={phoneBarClass}>
      <MobileMenu openLabel={p.openMenu} closeLabel={p.closeMenu} brand={<Brand />} footer={<UserCard current={current} p={p} lang={lang} />}>
        <CompanyCard current={current} p={p} />
        <SideNav p={p} />
      </MobileMenu>
      <span className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</span>
      <Initials name={current.user.name} size={32} />
      <span className="w-2" />
    </header>
  );
}

// Phone top bar with a close (X) back to the list (wizard, property page).
export function BrokerCloseBar({ userName, p, title, href = "/broker/properties" }: { userName: string; p: PropertyDict; title: string; href?: string }) {
  return (
    <header className={phoneBarClass}>
      <Link href={href} aria-label={p.close} className="flex h-11 w-11 items-center justify-center rounded-lg text-[#111827]">
        <X />
      </Link>
      <span className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</span>
      <Initials name={userName} size={32} />
      <span className="w-2" />
    </header>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <LogoMark />
      <Wordmark className="text-[19px]" />
    </div>
  );
}

function CompanyCard({ current, p }: { current: CurrentBroker; p: PropertyDict }) {
  const initials = current.broker.companyName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
      <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#173404] text-[12px] font-bold text-white">
        {initials}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[14px] font-semibold">{current.broker.companyName}</span>
        <span className="truncate text-[12px] text-[#6B7280]">{p.brokerAccount}</span>
      </span>
    </div>
  );
}

function SideNav({ p }: { p: PropertyDict }) {
  return (
    <nav aria-label={p.mainMenu} className="flex flex-col gap-1">
      <Link
        href="/broker/properties"
        aria-current="page"
        className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium text-[#4B5563] no-underline aria-[current=page]:bg-[#EAF3DE] aria-[current=page]:font-semibold aria-[current=page]:text-[#27500A] hover:bg-[#F3F4F6]"
      >
        <Building />
        {p.properties}
      </Link>
    </nav>
  );
}

function UserCard({ current, p, lang }: { current: CurrentBroker; p: PropertyDict; lang: Lang }) {
  return (
    <div className="flex flex-col gap-3">
      <BrokerLangButton lang={lang} label={p.otherLang} />
      <div className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] p-3">
        <Initials name={current.user.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold">{current.user.name}</span>
          <span className="truncate text-[12px] text-[#6B7280]">{p.accountAdmin}</span>
        </div>
        <form action={brokerSignOut}>
          <button
            type="submit"
            aria-label={p.signOut}
            title={p.signOut}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <LogOut className="rtl:rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
}
