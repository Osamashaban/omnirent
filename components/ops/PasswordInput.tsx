"use client";

import { useState } from "react";
import { Eye, EyeOff } from "./icons";
import { inputClass } from "./ui";

// Password field with the show/hide eye button from the design. Passwords are
// always typed left to right, in both languages.
export function PasswordInput({
  id,
  name,
  showLabel,
  hideLabel,
  autoComplete,
  disabled,
  invalid,
  describedBy,
  value,
  onChange,
}: {
  id: string;
  name: string;
  showLabel: string;
  hideLabel: string;
  autoComplete: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative flex">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        placeholder="••••••••"
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        dir="ltr"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`${inputClass} pe-[52px] text-start [direction:ltr] rtl:text-right`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        disabled={disabled}
        className="absolute end-0.5 top-0.5 flex h-11 w-11 cursor-pointer items-center justify-center bg-transparent text-[#6B7280]"
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
