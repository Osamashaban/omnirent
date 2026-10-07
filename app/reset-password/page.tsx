import type { Metadata } from "next";
import { AuthShell } from "@/components/ops/AuthShell";
import { LinkExpired } from "@/components/ops/LinkExpired";
import { SetPasswordForm } from "@/components/ops/SetPasswordForm";
import { resetPassword } from "@/app/actions/auth";
import { findUsableToken } from "@/lib/auth-tokens";
import { getDict } from "@/lib/lang";

export const metadata: Metadata = { title: "Omnirent Ops · Set a new password" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const [{ lang, t }, { token = "" }] = await Promise.all([getDict(), searchParams]);
  const found = await findUsableToken(token, "RESET");
  const back = `/reset-password?token=${encodeURIComponent(token)}`;

  return (
    <AuthShell lang={lang} t={t} back={back}>
      {found ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px] font-bold leading-[1.2] tracking-[-0.02em] min-[900px]:text-[32px]">{t.resetTitle}</h1>
            <p className="m-0 text-[15px] leading-[1.6] text-[#4B5563]">
              {t.forAccount}
              <span dir="ltr" className="font-semibold text-[#111827]">
                {found.user.email}
              </span>
            </p>
          </div>
          <SetPasswordForm lang={lang} token={token} action={resetPassword} submitLabel={t.savePassword} showDifferentRule />
        </div>
      ) : (
        <LinkExpired
          title={t.linkExpiredTitle}
          body={t.linkExpiredBody}
          action={{ href: "/forgot-password", label: t.sendNewLink }}
          backLabel={t.backToSignIn}
          help={t.needHelp}
        />
      )}
    </AuthShell>
  );
}
