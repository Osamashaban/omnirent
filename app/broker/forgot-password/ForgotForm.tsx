"use client";

import Link from "next/link";
import { useActionState } from "react";
import { brokerRequestReset, type BrokerForgotState } from "@/app/actions/broker-auth";
import { BROKER_DICTS } from "@/lib/broker-i18n";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ops/icons";
import {
  BrokerFieldError,
  BrokerHeading,
  brokerInputClass,
  brokerLinkButtonClass,
  brokerPrimaryButtonClass,
} from "@/components/broker/BrokerAuthShell";

export function ForgotForm({ lang }: { lang: Lang }) {
  const b = BROKER_DICTS[lang];
  const [state, action, pending] = useActionState<BrokerForgotState, FormData>(brokerRequestReset, {});
  return (
    <>
      <Link href="/broker/login" className={brokerLinkButtonClass}>
        {b.backToSignInArrow}
      </Link>
      <BrokerHeading title={b.forgotTitle}>{b.forgotBody}</BrokerHeading>
      <form action={action} noValidate className="m-0 flex flex-col gap-4 min-[900px]:gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bf_email" className="text-[14px] font-medium">
            {b.email}
          </label>
          <input
            id="bf_email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            defaultValue={state.email}
            key={state.email}
            aria-invalid={state.emailError || undefined}
            aria-describedby={state.emailError ? "bf_email_error" : undefined}
            className={brokerInputClass}
          />
          {state.emailError && <BrokerFieldError id="bf_email_error">{b.errEmail}</BrokerFieldError>}
        </div>
        <button type="submit" disabled={pending} className={brokerPrimaryButtonClass}>
          {pending && <Spinner />}
          {b.sendLink}
        </button>
      </form>
    </>
  );
}
