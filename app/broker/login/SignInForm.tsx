"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { brokerSignIn, type BrokerSignInState } from "@/app/actions/broker-auth";
import { BROKER_DICTS } from "@/lib/broker-i18n";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ops/icons";
import {
  BrokerAlert,
  BrokerFieldError,
  BrokerHeading,
  brokerInputClass,
  brokerLinkButtonClass,
  brokerPrimaryButtonClass,
} from "@/components/broker/BrokerAuthShell";
import { EyeButton } from "@/components/broker/PasswordFields";

export function SignInForm({ lang, initialEmail }: { lang: Lang; initialEmail: string }) {
  const b = BROKER_DICTS[lang];
  const [state, action, pending] = useActionState<BrokerSignInState, FormData>(brokerSignIn, { email: initialEmail, keep: true });
  const [visible, setVisible] = useState(false);
  const alert = state.alert;
  const alertText = !alert
    ? null
    : alert.kind === "wrong"
      ? b.wrongCredentials(alert.attemptsLeft)
      : alert.kind === "locked"
        ? b.lockedOut
        : alert.kind === "deactivated"
          ? b.deactivated
          : b.notActivated;

  return (
    <>
      <BrokerHeading title={b.signIn}>{b.signInBody}</BrokerHeading>
      {alertText && <BrokerAlert tone={alert?.kind === "notActivated" ? "warn" : "error"}>{alertText}</BrokerAlert>}
      <form action={action} noValidate className="m-0 flex flex-col gap-4 min-[900px]:gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bs_email" className="text-[14px] font-medium">
            {b.email}
          </label>
          <input
            id="bs_email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            defaultValue={state.email}
            key={state.email}
            aria-invalid={state.emailError || undefined}
            aria-describedby={state.emailError ? "bs_email_error" : undefined}
            className={brokerInputClass}
          />
          {state.emailError && <BrokerFieldError id="bs_email_error">{b.errEmail}</BrokerFieldError>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bs_password" className="text-[14px] font-medium">
            {b.password}
          </label>
          <div className="relative flex items-center">
            <input
              id="bs_password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={state.passwordError || alert?.kind === "wrong" || undefined}
              aria-describedby={state.passwordError ? "bs_password_error" : undefined}
              className={`${brokerInputClass} pr-12 rtl:pl-12 rtl:pr-3`}
            />
            <EyeButton b={b} visible={visible} onToggle={() => setVisible((v) => !v)} />
          </div>
          {state.passwordError && <BrokerFieldError id="bs_password_error">{b.errPassword}</BrokerFieldError>}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-2 text-[14px]">
            <input type="checkbox" name="keep" defaultChecked={state.keep ?? true} key={String(state.keep)} className="h-[18px] w-[18px] accent-[#639922]" />
            {b.keepSignedIn}
          </label>
          <Link href="/broker/forgot-password" className={`${brokerLinkButtonClass} max-[899px]:underline`}>
            {b.forgotPassword}
          </Link>
        </div>
        <button type="submit" disabled={pending} className={brokerPrimaryButtonClass}>
          {pending && <Spinner />}
          {pending ? b.signingIn : b.signIn}
        </button>
      </form>
      <p className="m-0 hidden text-[14px] text-[#4B5563] min-[900px]:block">{b.noAccount}</p>
    </>
  );
}
