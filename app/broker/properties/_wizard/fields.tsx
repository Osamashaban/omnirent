// Form building blocks for the Add property wizard, styled from the design.

import type { ErrorCode } from "@/lib/property-rules";
import type { PropertyDict } from "@/lib/property-i18n";
import { AlertCircle } from "@/components/ops/icons";

export const fieldInput =
  "h-12 w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 text-[15px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25 disabled:bg-[#F3F4F6] disabled:text-[#4B5563] aria-[invalid=true]:border-[1.5px] aria-[invalid=true]:border-[#DC2626]";

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function Card({ title, body, children, className = "" }: { title?: string; body?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5 min-[900px]:p-6 ${className}`}>
      {(title || body) && (
        <div className="flex flex-col gap-1">
          {title && <h2 className="m-0 text-[18px] font-bold">{title}</h2>}
          {body && <p className="m-0 text-[13px] text-[#4B5563]">{body}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Grid({ cols = 2, children }: { cols?: 2 | 3 | 4; children: React.ReactNode }) {
  const c = { 2: "min-[700px]:grid-cols-2", 3: "min-[700px]:grid-cols-3", 4: "min-[700px]:grid-cols-4" }[cols];
  return <div className={`grid grid-cols-1 gap-x-3 gap-y-4 ${c}`}>{children}</div>;
}

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: ErrorCode;
  p: PropertyDict;
  children: React.ReactNode;
  className?: string;
};

export function Field({ id, label, required, hint, error, p, children, className = "" }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[14px] font-semibold text-[#111827]">
        {label}
        {required && (
          <span className="text-[#DC2626]" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="flex items-center gap-1.5 text-[13px] text-[#B91C1C]">
          <AlertCircle size={14} className="flex-none" />
          {p.errors[error]}
        </span>
      ) : (
        hint && <span className="text-[13px] text-[#6B7280]">{hint}</span>
      )}
    </div>
  );
}

const invalid = (id: string, error?: ErrorCode) =>
  error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};

export function TextInput({
  id,
  value,
  onChange,
  error,
  suffix,
  dir,
  ...rest
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: ErrorCode;
  suffix?: string;
  dir?: "ltr" | "rtl" | "auto";
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id" | "dir">) {
  const input = (
    <input
      id={id}
      value={value}
      dir={dir}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldInput} ${suffix ? "pe-14" : ""}`}
      {...invalid(id, error)}
      {...rest}
    />
  );
  if (!suffix) return input;
  return (
    <div className="relative flex items-center">
      {input}
      <span className="pointer-events-none absolute end-3.5 text-[13px] text-[#6B7280]">{suffix}</span>
    </div>
  );
}

// Numbers are typed as text so "7,800" and Arabic digits work.
export function NumberInput(props: Parameters<typeof TextInput>[0]) {
  return <TextInput inputMode="decimal" dir="ltr" autoComplete="off" {...props} />;
}

export function Select({
  id,
  value,
  onChange,
  options,
  error,
  disabled,
  lock,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: ErrorCode;
  disabled?: boolean;
  lock?: boolean;
}) {
  return (
    <div className="relative flex items-center">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldInput} cursor-pointer appearance-none bg-[length:18px] bg-[position:right_14px_center] bg-no-repeat pe-10 rtl:bg-[position:left_14px_center] ${lock ? "pe-16" : ""}`}
        style={{ backgroundImage: chevron }}
        {...invalid(id, error)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {lock && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute end-10">
          <rect width="18" height="11" x="3" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
    </div>
  );
}

// A choice drawn as a card with a radio dot, a label and an optional line.
export function RadioCard({
  name,
  checked,
  onChange,
  label,
  description,
  disabled,
  compact = false,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
  // The tighter card of the property type picker, six to a row.
  compact?: boolean;
}) {
  return (
    <label
      className={`flex min-h-[60px] min-w-0 items-center rounded-[10px] ${compact ? "gap-2.5 p-3" : "gap-3 px-3.5 py-3"} ${
        checked ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "border border-[#E5E7EB] bg-white"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
      <span
        aria-hidden="true"
        className={`${compact ? "h-[18px] w-[18px]" : "h-5 w-5"} flex-none rounded-full ${checked ? "border-[6px] border-[#639922]" : "border-[1.5px] border-[#9CA3AF]"}`}
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] font-semibold leading-[1.3] text-[#111827]">{label}</span>
        {description && <span className="text-[12px] leading-[1.4] text-[#4B5563]">{description}</span>}
      </span>
    </label>
  );
}

export function Toggle({ id, checked, onChange, label, description }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`relative h-7 w-11 flex-none rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#639922]/40 ${checked ? "bg-[#639922]" : "bg-[#D1D5DB]"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "start-5" : "start-1"}`} />
      </span>
      <span className="flex flex-col">
        <span className="text-[14px] font-semibold text-[#111827]">{label}</span>
        {description && <span className="text-[12px] text-[#4B5563]">{description}</span>}
      </span>
    </label>
  );
}
