"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { brokerResetPassword, type BrokerPasswordState } from "@/app/actions/broker-auth";
import { BROKER_DICTS } from "@/lib/broker-i18n";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ops/icons";
import { BrokerHeading, brokerPrimaryButtonClass } from "@/components/broker/BrokerAuthShell";
import { PasswordFields } from "@/components/broker/PasswordFields";
import { submitKeepingValues } from "@/lib/form-submit";

export function ResetForm({ lang, token, email }: { lang: Lang; token: string; email: string }) {
  const b = BROKER_DICTS[lang];
  const router = useRouter();
  const [state, action, pending] = useActionState<BrokerPasswordState, FormData>(brokerResetPassword, {});
  // The link ran out while the page was open: ask for a new one.
  useEffect(() => {
    if (state.expired) router.replace("/broker/forgot-password");
  }, [state.expired, router]);

  return (
    <>
      <BrokerHeading title={b.resetTitle}>
        <span dir="ltr">{b.resetFor(email)}</span>
      </BrokerHeading>
      <form onSubmit={submitKeepingValues(action)} noValidate className="m-0 flex flex-col gap-4 min-[900px]:gap-5">
        <input type="hidden" name="token" value={token} />
        <PasswordFields b={b} label={b.newPassword} passwordError={state.passwordError} confirmError={state.confirmError} disabled={pending} />
        <button type="submit" disabled={pending} className={brokerPrimaryButtonClass}>
          {pending && <Spinner />}
          {b.savePassword}
        </button>
      </form>
    </>
  );
}
