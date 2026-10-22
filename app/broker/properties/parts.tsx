// Small pieces shared by the Properties screens, styled from the design.

import type { ListStatus } from "@/lib/property-rules";
import { Home } from "@/components/ops/icons";

const STATUS_COLORS: Record<ListStatus, string> = {
  draft: "bg-[#F3F4F6] text-[#4B5563]",
  synced: "bg-[#DCFCE7] text-[#15803D]",
  syncing: "bg-[#DBEAFE] text-[#1D4ED8]",
  failed: "bg-[#FEE2E2] text-[#B91C1C]",
  archived: "bg-[#E5E7EB] text-[#374151]",
};

export function StatusChip({ status, label }: { status: ListStatus; label: string }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${STATUS_COLORS[status]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function TypeChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-6 items-center whitespace-nowrap rounded-md bg-[#F3F4F6] px-2 text-[12px] font-semibold text-[#374151]">{children}</span>;
}

const THUMBS = ["bg-[#CFE3F2]", "bg-[#E8EFE0]", "bg-[#F3E8D6]", "bg-[#DDE7F0]", "bg-[#EFE3E3]", "bg-[#E5E7EB]"];

// The house placeholder until photos exist. The color follows the row.
export function Thumb({ index, size = 44 }: { index: number; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`flex flex-none items-center justify-center rounded-lg text-[#6B7280] ${THUMBS[index % THUMBS.length]}`}
    >
      <Home size={size > 50 ? 20 : 18} />
    </span>
  );
}

export function InfoBox({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[#BFDBFE] bg-[#DBEAFE] px-4 py-3.5 text-[#1E3A8A]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 flex-none">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-[#1D4ED8]">{title}</span>
        {children && <span className="text-[13px] leading-[1.6] text-[#1F2937]">{children}</span>}
      </div>
    </div>
  );
}

export function EmptyBox({ icon, tone = "green", title, children, action }: {
  icon: React.ReactNode;
  tone?: "green" | "grey" | "red";
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const circle = { green: "bg-[#EAF3DE] text-[#3B6D11]", grey: "bg-[#F3F4F6] text-[#4B5563]", red: "bg-[#FEE2E2] text-[#B91C1C]" }[tone];
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
      <span className={`flex h-14 w-14 items-center justify-center rounded-full ${circle}`}>{icon}</span>
      <h2 className="m-0 text-[20px] font-bold">{title}</h2>
      <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{children}</p>
      {action}
    </div>
  );
}
