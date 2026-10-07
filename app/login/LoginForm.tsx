"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";
import { DICTS, type Lang } from "@/lib/i18n";
import { PasswordInput } from "@/components/ops/PasswordInput";
import { AlertCircle, Spinner } from "@/components/ops/icons";
import { FieldError, inputClass, primaryButtonClass } from "@/components/ops/ui";

export function LoginForm({ t: lang, initialEmail }: { t: Lang; initialEmail: string }) {
  const t = DICTS[lang];
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, { email: initialEmail });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[28px] font-bold leading-[1.2] tracking-[-0.02em] min-[900px]:text-[32px]">{t.signIn}</h1>
        <p className="m-0 text-[15px] leading-[1.6] text-[#4B5563] min-[900px]:text-[16px]">{t.signInSubtitle}</p>
      </div>

      {state.formError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3">
          <AlertCircle className="mt-0.5 flex-none text-[#DC2626]" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#B91C1C]">
              {state.formError === "lockedOut" ? t.lockedOut : t.wrongCredentials}
            </span>
            {state.attemptsLeft !== undefined && (
              <span className="text-[13px] leading-[1.5] text-[#B91C1C]">{t.attemptsLeft(state.attemptsLeft)}</span>
            )}
          </div>
        </div>
      )}

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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[14px] font-medium">
              {t.password}
            </label>
            <Link
              href="/forgot-password"
              aria-disabled={pending}
              className={`py-1.5 text-[14px] font-medium text-[#3B6D11] no-underline hover:text-[#27500A] ${pending ? "pointer-events-none opacity-60" : ""}`}
            >
              {t.forgotPassword}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            showLabel={t.showPassword}
            hideLabel={t.hidePassword}
            disabled={pending}
            invalid={Boolean(state.passwordError || state.formError === "wrongCredentials")}
            describedBy={state.passwordError ? "password-error" : undefined}
          />
          {state.passwordError && <FieldError id="password-error">{t[state.passwordError]}</FieldError>}
        </div>
        <button type="submit" disabled={pending} className={`${primaryButtonClass} mt-1.5`}>
          {pending && <Spinner />}
          {t.signIn}
        </button>
      </form>
    </div>
  );
}
