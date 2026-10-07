// Small building blocks repeated across the Ops screens, styled from the design.

export const inputClass =
  "h-12 w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 text-[15px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25 disabled:bg-[#F3F4F6] aria-[invalid=true]:border-[1.5px] aria-[invalid=true]:border-[#DC2626]";

export const primaryButtonClass =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#639922] px-5 text-[16px] font-semibold text-white no-underline shadow-[0_4px_16px_rgba(99,153,34,0.30)] hover:bg-[#4E8F20] disabled:cursor-not-allowed disabled:opacity-70";

export const smallPrimaryButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#639922] px-[18px] text-[15px] font-semibold text-white no-underline shadow-[0_4px_16px_rgba(99,153,34,0.30)] hover:bg-[#4E8F20] disabled:cursor-not-allowed disabled:opacity-70";

export const secondaryButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-[18px] text-[15px] font-semibold text-[#111827] no-underline hover:bg-[#F9FAFB]";

export const dangerButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#DC2626] px-[18px] text-[15px] font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-70";

export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} className="text-[13px] text-[#B91C1C]">
      {children}
    </span>
  );
}

export function Initials({ name, muted = false, size = 36 }: { name: string; muted?: boolean; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join(" ");
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`flex flex-none items-center justify-center rounded-full text-[13px] font-bold ${
        muted ? "bg-[#E5E7EB] text-[#374151]" : "bg-[#C0DD97] text-[#27500A]"
      }`}
    >
      {initials}
    </span>
  );
}
