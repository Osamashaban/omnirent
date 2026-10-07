import Link from "next/link";
import type { Dict } from "@/lib/i18n";

// Title and the Users / Roles tabs, each with its count.
export function SettingsHeader({
  t,
  active,
  userCount,
  roleCount,
}: {
  t: Dict;
  active: "users" | "roles";
  userCount: number | null;
  roleCount: number | null;
}) {
  const tab = (href: string, label: string, count: number | null, current: boolean) => (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex h-11 items-center gap-2 border-b-2 px-1 text-[15px] no-underline ${
        current ? "border-[#639922] font-semibold text-[#27500A]" : "border-transparent font-medium text-[#4B5563] hover:text-[#111827]"
      }`}
    >
      {label}
      <span className="rounded-full bg-[#F3F4F6] px-2 py-px text-[12px] font-semibold text-[#4B5563]">{count ?? "–"}</span>
    </Link>
  );
  return (
    <>
      <div className="hidden flex-col gap-1.5 min-[900px]:flex">
        <span className="text-[13px] text-[#6B7280]">{t.settings}</span>
        <h1 className="m-0 text-[28px] font-bold leading-[1.25] tracking-[-0.01em]">{t.usersAndRoles}</h1>
        <p className="m-0 text-[15px] text-[#4B5563]">{t.usersAndRolesBody}</p>
      </div>
      <nav aria-label={t.usersAndRoles} className="-mx-4 -mt-4 flex gap-6 border-b border-[#E5E7EB] bg-white px-4 min-[900px]:mx-0 min-[900px]:mt-0 min-[900px]:bg-transparent min-[900px]:px-0">
        {tab("/settings/users", t.usersTab, userCount, active === "users")}
        {tab("/settings/roles", t.rolesTab, roleCount, active === "roles")}
      </nav>
    </>
  );
}
