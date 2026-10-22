"use client";

import { useState } from "react";
import { checkPassword } from "@/lib/login-rules";
import type { BrokerDict } from "@/lib/broker-i18n";
import { Eye, EyeOff } from "@/components/ops/icons";
import { BrokerFieldError, brokerInputClass } from "./BrokerAuthShell";

// Password + confirm with the live rules list from the design: each rule turns
// green with a tick as it is met. One eye button shows or hides both fields.
export function PasswordFields({
  b,
  label,
  passwordError,
  confirmError,
  disabled,
}: {
  b: BrokerDict;
  label: string;
  passwordError?: boolean;
  confirmError?: boolean;
  disabled?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const checks = checkPassword(password);
  const rules: [boolean, string][] = [
    [checks.length, b.ruleLength],
    [checks.cases, b.ruleCases],
    [checks.number, b.ruleNumber],
  ];
  const type = visible ? "text" : "password";

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bp_password" className="text-[14px] font-medium">
          {label}
        </label>
        <div className="relative flex items-center">
          <input
            id="bp_password"
            name="password"
            type={type}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled}
            aria-invalid={passwordError || undefined}
            aria-describedby={passwordError ? "bp_password_error" : "bp_rules"}
            className={`${brokerInputClass} pr-12 rtl:pl-12 rtl:pr-3`}
          />
          <EyeButton b={b} visible={visible} onToggle={() => setVisible((v) => !v)} />
        </div>
        {passwordError && <BrokerFieldError id="bp_password_error">{b.errPasswordRules}</BrokerFieldError>}
      </div>
      <ul id="bp_rules" className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
        {rules.map(([ok, text]) => (
          <li key={text} className={`flex items-center gap-2 ${ok ? "text-[#15803D]" : "text-[#6B7280]"}`}>
            <span aria-hidden="true" className="w-4 text-center font-bold">
              {ok ? "✓" : "○"}
            </span>
            {text}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bp_confirm" className="text-[14px] font-medium">
          {b.confirmPassword}
        </label>
        <input
          id="bp_confirm"
          name="confirm"
          type={type}
          autoComplete="new-password"
          disabled={disabled}
          aria-invalid={confirmError || undefined}
          aria-describedby={confirmError ? "bp_confirm_error" : undefined}
          className={brokerInputClass}
        />
        {confirmError && <BrokerFieldError id="bp_confirm_error">{b.errPasswordsDontMatch}</BrokerFieldError>}
      </div>
    </>
  );
}

export function EyeButton({ b, visible, onToggle }: { b: BrokerDict; visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? b.hidePassword : b.showPassword}
      className="absolute end-1 flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent text-[#6B7280]"
    >
      {visible ? <EyeOff /> : <Eye />}
    </button>
  );
}
