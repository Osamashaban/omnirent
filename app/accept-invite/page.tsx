import type { Metadata } from "next";
import { AuthShell } from "@/components/ops/AuthShell";
import { LinkExpired } from "@/components/ops/LinkExpired";
import { SetPasswordForm } from "@/components/ops/SetPasswordForm";
import { acceptInvite } from "@/app/actions/auth";
import { findUsableToken } from "@/lib/auth-tokens";
import { getDict } from "@/lib/lang";

export const metadata: Metadata = { title: "Omnirent Ops · Accept invite" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function AcceptInvitePage({ searchParams }: Props) {
  const [{ lang, t }, { token = "" }] = await Promise.all([getDict(), searchParams]);
  const found = await findUsableToken(token, "INVITE");
  const back = `/accept-invite?token=${encodeURIComponent(token)}`;

  return (
    <AuthShell lang={lang} t={t} back={back}>
      {found ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px] font-bold leading-[1.2] tracking-[-0.02em] min-[900px]:text-[32px]">
              {t.inviteHello(found.user.name.split(" ")[0])}
            </h1>
            <p className="m-0 text-[15px] leading-[1.6] text-[#4B5563]">
              {t.inviteJoinedBefore}
              <span className="font-semibold text-[#111827]">{found.user.role.name}</span>
              {t.inviteJoinedAfter}
              <span dir="ltr" className="font-semibold text-[#111827]">
                {found.user.email}
              </span>
            </p>
          </div>
          <SetPasswordForm lang={lang} token={token} action={acceptInvite} submitLabel={t.createAccount} showDifferentRule={false} />
        </div>
      ) : (
        <LinkExpired title={t.inviteExpiredTitle} body={t.inviteExpiredBody} backLabel={t.backToSignIn} help={t.needHelp} />
      )}
    </AuthShell>
  );
}
