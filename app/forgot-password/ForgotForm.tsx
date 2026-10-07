"use client";

import { useActionState } from "react";
import { requestReset, type ForgotState } from "@/app/actions/auth";
import { DICTS, type Lang } from "@/lib/i18n";
import { BackLink, IconBadge } from "@/components/ops/BackLink";
import { Key, Spinner } from "@/components/ops/icons";
import { FieldError, inputClass, primaryButtonClass } from "@/components/ops/ui";

export function ForgotForm({ lang, initialEmail }: { lang: Lang; initialEmail: string }) {
  const t = DICTS[lang];
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, { email: initialEmail });
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/login">{t.backToSignIn}</BackLink>
      <IconBadge>
        <Key />
      </IconBadge>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[28px] font-bold leading-[1.2] tracking-[-0.02em] min-[900px]:text-[32px]">{t.forgotTitle}</h1>
        <p className="m-0 text-[15px] leading-[1.6] text-[#4B5563] min-[900px]:text-[16px]">{t.forgotBody}</p>
      </div>
      <form action={action} noValidate className="m-0 flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[14px] font-medium">
            {t.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            defaultValue={state.email}
            key={state.email}
            disabled={pending}
            dir="ltr"
            aria-invalid={state.emailError ? true : undefined}
            aria-describedby={state.emailError ? "email-error" : undefined}
            className={`${inputClass} rtl:text-right`}
          />
          {state.emailError && <FieldError id="email-error">{t[state.emailError]}</FieldError>}
        </div>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending && <Spinner />}
          {t.sendResetLink}
        </button>
      </form>
      <p className="m-0 text-[14px] text-[#4B5563]">{t.needHelp}</p>
    </div>
  );
}
