import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/ops/AuthShell";
import { IconBadge } from "@/components/ops/BackLink";
import { CheckCircle } from "@/components/ops/icons";
import { primaryButtonClass } from "@/components/ops/ui";
import { getDict } from "@/lib/lang";

export const metadata: Metadata = { title: "Omnirent Ops · Password updated" };

type Props = { searchParams: Promise<{ email?: string }> };

export default async function PasswordUpdatedPage({ searchParams }: Props) {
  const [{ lang, t }, { email = "" }] = await Promise.all([getDict(), searchParams]);
  return (
    <AuthShell lang={lang} t={t} back={`/reset-password/done?email=${encodeURIComponent(email)}`}>
      <div className="flex flex-col gap-6">
        <IconBadge>
          <CheckCircle size={26} />
        </IconBadge>
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[28px] font-bold leading-[1.2] tracking-[-0.02em] min-[900px]:text-[32px]">{t.passwordUpdatedTitle}</h1>
          <p className="m-0 text-[15px] leading-[1.6] text-[#4B5563] min-[900px]:text-[16px]">{t.passwordUpdatedBody}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3.5 text-[14px] leading-[1.6] text-[#4B5563]">
          {t.passwordUpdatedNote}
        </div>
        <Link href={email ? `/login?email=${encodeURIComponent(email)}` : "/login"} className={primaryButtonClass}>
          {t.signIn}
        </Link>
      </div>
    </AuthShell>
  );
}
