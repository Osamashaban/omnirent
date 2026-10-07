"use client";

import { useActionState, useState } from "react";
import type { SetPasswordState } from "@/app/actions/auth";
import { DICTS, type Lang } from "@/lib/i18n";
import { checkPassword } from "@/lib/login-rules";
import { PasswordInput } from "./PasswordInput";
import { AlertCircle, Check, Circle, Spinner, X } from "./icons";
import { primaryButtonClass } from "./ui";

// The new-password form used by "reset password" and "accept invite". Rules
// tick live while typing; save is enabled only when every rule passes and both
// fields match. The server checks everything again.
export function SetPasswordForm({
  lang,
  token,
  action,
  submitLabel,
  showDifferentRule,
}: {
  lang: Lang;
  token: string;
  action: (prev: SetPasswordState, form: FormData) => Promise<SetPasswordState>;
  submitLabel: string;
  showDifferentRule: boolean;
}) {
  const t = DICTS[lang];
  const [state, formAction, pending] = useActionState<SetPasswordState, FormData>(action, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const checks = checkPassword(password);
  const passed = [checks.length, checks.cases, checks.number].filter(Boolean).length;
  const allPass = passed === 3;
  const matches = confirm.length > 0 && confirm === password;
  const strength = password.length === 0 ? 0 : allPass ? (password.length >= 12 ? 4 : 3) : Math.max(1, passed);
  const strengthLabel = strength >= 3 ? t.strengthStrong : strength === 2 ? t.strengthOk : t.strengthWeak;
  const strengthColor = strength >= 3 ? "#639922" : strength === 2 ? "#D97706" : "#DC2626";

  const rules: { ok: boolean | null; label: string }[] = [
    { ok: checks.length, label: t.ruleLength },
    { ok: checks.cases, label: t.ruleCases },
    { ok: checks.number, label: t.ruleNumber },
  ];
  if (showDifferentRule) rules.push({ ok: state.error === "samePassword" ? false : null, label: t.ruleDifferent });

  return (
    <form action={formAction} className="m-0 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3 text-[14px] font-semibold text-[#B91C1C]">
          <AlertCircle className="mt-0.5 flex-none text-[#DC2626]" />
          {state.error === "expired" ? t.linkExpiredTitle : t[state.error]}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new" className="text-[14px] font-medium">
          {t.newPassword}
        </label>
        <PasswordInput
          id="new"
          name="password"
          autoComplete="new-password"
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          disabled={pending}
          value={password}
          onChange={setPassword}
          describedBy="password-rules"
        />
        {password.length > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="h-1 rounded-sm" style={{ background: i <= strength ? strengthColor : "#E5E7EB" }} />
              ))}
            </div>
            <span className="text-[12px] font-semibold" style={{ color: strengthColor }}>
              {strengthLabel}
            </span>
          </div>
        )}
      </div>
      <ul id="password-rules" className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-2 p-0 text-[13px]">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={`flex items-center gap-2 ${
              rule.ok === true ? "text-[#15803D]" : rule.ok === false && password ? "text-[#B91C1C]" : "text-[#6B7280]"
            }`}
          >
            {rule.ok === true ? <Check /> : rule.ok === false && password ? <X size={14} /> : <Circle />}
            {rule.label}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-[14px] font-medium">
          {t.confirmPassword}
        </label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          disabled={pending}
          value={confirm}
          onChange={setConfirm}
          invalid={confirm.length > 0 && !matches}
          describedBy="confirm-status"
        />
        {confirm.length > 0 && (
          <span
            id="confirm-status"
            className={`flex items-center gap-1.5 text-[13px] ${matches ? "text-[#15803D]" : "text-[#B91C1C]"}`}
          >
            {matches ? <Check /> : <X size={14} />}
            {matches ? t.passwordsMatch : t.passwordsDontMatch}
          </span>
        )}
      </div>
      <button type="submit" disabled={pending || !allPass || !matches} className={`${primaryButtonClass} mt-1`}>
        {pending && <Spinner />}
        {submitLabel}
      </button>
    </form>
  );
}
