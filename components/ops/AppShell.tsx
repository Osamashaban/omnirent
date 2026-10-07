// The signed-in Ops dashboard frame: sidebar on desktop, a top bar with a
// slide-out menu under 900px. The sidebar shows only the modules the signed-in
// user's role has. Today that is the Settings group (Users), which appears
// when the role has the "Users and roles" module.

import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import type { Dict, Lang } from "@/lib/i18n";
import { LogoMark, Wordmark } from "./Logo";
import { LangButton } from "./LangButton";
import { MobileMenu } from "./MobileMenu";
import { Chevron, LogOut, Settings } from "./icons";
import { Initials } from "./ui";

type Props = { user: CurrentUser; lang: Lang; t: Dict; active: "users"; back: string; title: string; children: React.ReactNode };

export function AppShell({ user, lang, t, active, back, title, children }: Props) {
  const nav = <SideNav user={user} t={t} active={active} />;
  const footer = <UserCard user={user} t={t} lang={lang} back={back} />;
  return (
    <div
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="flex min-h-screen bg-[#F9FAFB] text-[#111827] [font-family:var(--font-outfit),var(--font-plex-arabic),sans-serif] max-[899px]:flex-col"
    >
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col gap-7 border-e border-[#E5E7EB] bg-white px-3.5 py-5 min-[900px]:flex">
        <Brand t={t} />
        {nav}
        <div className="mt-auto">{footer}</div>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#E5E7EB] bg-white px-2 min-[900px]:hidden">
        <MobileMenu openLabel={t.openMenu} closeLabel={t.closeMenu} brand={<Brand t={t} />} footer={footer}>
          {nav}
        </MobileMenu>
        <span className="flex-1 text-[17px] font-bold">{title}</span>
        <Initials name={user.name} size={32} />
        <span className="w-2" />
      </header>
      <main className="flex min-w-0 max-w-[1280px] flex-1 flex-col gap-6 px-4 py-4 min-[900px]:px-10 min-[900px]:py-8">{children}</main>
    </div>
  );
}

function Brand({ t }: { t: Dict }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <LogoMark />
      <Wordmark className="text-[19px]" />
      <span className="rounded-full bg-[#EAF3DE] px-2 py-0.5 text-[11px] font-bold text-[#3B6D11]">{t.opsBadge}</span>
    </div>
  );
}

function SideNav({ user, t, active }: { user: CurrentUser; t: Dict; active: "users" }) {
  if (!canAccess(user.moduleKeys, "users_roles")) return <nav aria-label={t.mainMenu} />;
  return (
    <nav aria-label={t.mainMenu} className="flex flex-col gap-1">
      <div className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-[14px] font-semibold text-[#111827]">
        <Settings />
        {t.settings}
        <Chevron className="ms-auto text-[#6B7280]" />
      </div>
      <div className="flex flex-col gap-0.5 ps-7">
        <Link
          href="/settings/users"
          aria-current={active === "users" ? "page" : undefined}
          className="flex h-9 items-center rounded-lg px-3 text-[14px] font-semibold text-[#27500A] no-underline aria-[current=page]:bg-[#EAF3DE] hover:bg-[#F3F4F6]"
        >
          {t.usersNav}
        </Link>
      </div>
    </nav>
  );
}

function UserCard({ user, t, lang, back }: { user: CurrentUser; t: Dict; lang: Lang; back: string }) {
  return (
    <div className="flex flex-col gap-3">
      <LangButton lang={lang} t={t} back={back} />
      <div className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] p-3">
        <Initials name={user.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold">{user.name}</span>
          <span className="truncate text-[12px] text-[#6B7280]">{user.roleName}</span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            aria-label={t.signOut}
            title={t.signOut}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <LogOut className="rtl:rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
}
