"use client";

import { useActionState } from "react";
import { brokerAcceptInvite, type BrokerPasswordState } from "@/app/actions/broker-auth";
import { BROKER_DICTS } from "@/lib/broker-i18n";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ops/icons";
import { BrokerFieldError, brokerPrimaryButtonClass } from "@/components/broker/BrokerAuthShell";
import { PasswordFields } from "@/components/broker/PasswordFields";
import { InviteExpired } from "@/components/broker/InviteExpired";

export function SetPasswordForm({
  lang,
  token,
  firstName,
  company,
  email,
  whatsapp,
}: {
  lang: Lang;
  whatsapp: string | null;
  token: string;
  firstName: string;
  company: string;
  email: string;
}) {
  const b = BROKER_DICTS[lang];
  const [state, action, pending] = useActionState<BrokerPasswordState, FormData>(brokerAcceptInvite, {});
  // The link ran out (or was used elsewhere) while the page was open.
  if (state.expired) return <InviteExpired b={b} whatsapp={whatsapp} />;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[26px] font-bold leading-[1.25] min-[900px]:text-[30px]">
          <span className="min-[900px]:hidden">{b.setHelloPhone(firstName)}</span>
          <span className="max-[899px]:hidden">{b.setHello(firstName)}</span>
        </h1>
        <p className="m-0 text-[15px] leading-[1.7] text-[#4B5563]">
          <span className="min-[900px]:hidden">
            {b.setBodyPhoneBefore}
            <strong>{company}</strong>
            {b.setBodyPhoneAfter}.
          </span>
          <span className="max-[899px]:hidden">
            {b.setBodyBefore}
            <strong className="text-[#111827]">{company}</strong>
            {b.setBodyMiddle}
            <span dir="ltr" className="font-semibold text-[#111827]">
              {email}
            </span>
          </span>
        </p>
      </div>
      <form action={action} noValidate className="m-0 flex flex-col gap-4 min-[900px]:gap-5">
        <input type="hidden" name="token" value={token} />
        <PasswordFields b={b} label={b.password} passwordError={state.passwordError} confirmError={state.confirmError} disabled={pending} />
        <label className="flex cursor-pointer items-start gap-2.5 text-[14px] leading-[1.6]">
          <input
            type="checkbox"
            name="terms"
            aria-invalid={state.termsError || undefined}
            aria-describedby={state.termsError ? "bp_terms_error" : undefined}
            className="mt-[3px] h-[18px] w-[18px] flex-none accent-[#639922]"
          />
          <span>
            {b.agreeBefore}
            <a href="https://getomnirent.com" className="text-inherit no-underline min-[900px]:font-semibold min-[900px]:text-[#3B6D11] min-[900px]:underline">
              {b.terms}
            </a>
            {b.agreeAnd}
            <a href="https://getomnirent.com" className="text-inherit no-underline min-[900px]:font-semibold min-[900px]:text-[#3B6D11] min-[900px]:underline">
              {b.privacyPolicy}
            </a>
          </span>
        </label>
        {state.termsError && <BrokerFieldError id="bp_terms_error">{b.errTerms}</BrokerFieldError>}
        <button type="submit" disabled={pending} className={brokerPrimaryButtonClass}>
          {pending && <Spinner />}
          {pending ? b.creatingAccount : b.createAccount}
        </button>
      </form>
    </>
  );
}
