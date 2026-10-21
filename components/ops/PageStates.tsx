import type { Dict } from "@/lib/i18n";
import { Lock } from "./icons";

// Shown instead of a page when the signed-in role doesn't have its module.
export function NoAccess({ t, roleName }: { t: Dict; roleName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563]">
        <Lock size={26} />
      </span>
      <h2 className="m-0 text-[20px] font-bold">{t.noAccessTitle}</h2>
      <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{t.noAccessBody(roleName)}</p>
    </div>
  );
}

// Breadcrumb, title and intro at the top of a Settings page (desktop only;
// phones show the title in the top bar).
export function PageHeader({
  crumb,
  title,
  intro,
  action,
}: {
  crumb: string;
  title: string;
  intro?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="hidden flex-wrap items-end gap-4 min-[900px]:flex">
      <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
        <span className="text-[13px] text-[#6B7280]">{crumb}</span>
        <h1 className="m-0 text-[28px] font-bold leading-[1.25]">{title}</h1>
        {intro && <p className="m-0 max-w-[760px] text-[15px] leading-[1.6] text-[#4B5563]">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "green" | "grey" | "blue" | "lime"; children: React.ReactNode }) {
  const colors = {
    green: "bg-[#DCFCE7] text-[#15803D]",
    grey: "bg-[#F3F4F6] text-[#4B5563]",
    blue: "bg-[#DBEAFE] text-[#1D4ED8]",
    lime: "bg-[#EAF3DE] text-[#27500A]",
  }[tone];
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-md px-2.5 text-[12px] font-semibold ${colors}`}>{children}</span>;
}
