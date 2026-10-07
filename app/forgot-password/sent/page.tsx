import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/ops/AuthShell";
import { BackLink, IconBadge } from "@/components/ops/BackLink";
import { getDict } from "@/lib/lang";
import { ResendButton } from "./ResendButton";

export const metadata: Metadata = { title: "Omnirent Ops · Check your email" };

type Props = { searchParams: Promise<{ email?: string }> };

export default async function ResetSentPage({ searchParams }: Props) {
  const [{ lang, t }, { email = "" }] = await Promise.all([getDict(), searchParams]);
  return (
    <AuthShell lang={lang} t={t} back={`/forgot-password/sent?email=${encodeURIComponent(email)}`}>
      <div className="flex flex-col gap-6">
        <BackLink href="/login">{t.backToSignIn}</BackLink>
        <IconBadge>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </IconBadge>
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[28px] font-bold leading-[1.2] tracking-[-0.02em] min-[900px]:text-[32px]">{t.checkEmailTitle}</h1>
          <p className="m-0 text-[15px] leading-[1.6] text-[#4B5563] min-[900px]:text-[16px]">
            {t.checkEmailBefore}
            <span dir="ltr" className="font-semibold text-[#111827]">
              {email}
            </span>
            {t.checkEmailAfter}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3.5 text-[14px] text-[#4B5563]">
          <span>{t.linkValid60}</span>
          <span>{t.notReceived}</span>
        </div>
        <ResendButton lang={lang} email={email} />
        <Link
          href="/forgot-password"
          className="self-center py-2 text-[14px] font-medium text-[#3B6D11] no-underline hover:text-[#27500A]"
        >
          {t.useAnotherEmail}
        </Link>
      </div>
    </AuthShell>
  );
}
