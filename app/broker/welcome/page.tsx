import type { Metadata } from "next";
import Link from "next/link";
import { requireBroker } from "@/lib/broker-auth";
import { getBrokerDict } from "@/lib/broker-lang";
import { BrokerAuthShell, BrokerHeading, BrokerStatusIcon, brokerPrimaryButtonClass } from "@/components/broker/BrokerAuthShell";
import { BrokerToast } from "@/components/broker/BrokerToast";

export const metadata: Metadata = { title: "Omnirent · Welcome" };

type Props = { searchParams: Promise<{ new?: string }> };

// Shown right after a broker sets their password: three first steps.
export default async function BrokerWelcomePage({ searchParams }: Props) {
  const { user } = await requireBroker();
  const [{ lang, b }, params] = await Promise.all([getBrokerDict(), searchParams]);
  const firstName = user.name.split(" ")[0];
  const stepClass = "flex items-center gap-3.5 rounded-xl border border-[#E5E7EB] bg-white p-3.5 text-[#111827] no-underline";
  const iconClass = "flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[#F3F4F6] text-[#374151]";

  return (
    <BrokerAuthShell
      lang={lang}
      b={b}
      back="/broker/welcome"
      toast={params.new === "1" ? <BrokerToast closeLabel={b.close}>{b.accountReady}</BrokerToast> : undefined}
    >
      <BrokerStatusIcon tone="green">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </BrokerStatusIcon>
      <BrokerHeading title={b.welcomeTitle(firstName)}>{b.welcomeBody}</BrokerHeading>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        <li>
          <Link href="/broker/properties" className={`${stepClass} border-[1.5px] border-[#639922] bg-[#F7FBF1]`}>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[#639922] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{b.step1}</span>
              <span className="text-[13px] text-[#4B5563]">{b.step1Body}</span>
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none text-[#3B6D11] rtl:-scale-x-100">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Link>
        </li>
        <li>
          <Link href="/broker/calendar" className={stepClass}>
            <span className={iconClass}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{b.step2}</span>
              <span className="text-[13px] text-[#4B5563]">{b.step2Body}</span>
            </span>
          </Link>
        </li>
        <li>
          <div className={stepClass}>
            <span className={iconClass}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22v-5" />
                <path d="M9 8V2" />
                <path d="M15 8V2" />
                <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
              </svg>
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{b.step3}</span>
              <span className="text-[13px] text-[#4B5563]">{b.step3Body}</span>
            </span>
          </div>
        </li>
      </ol>
      <Link href="/broker/properties" className={brokerPrimaryButtonClass}>
        {b.addFirstProperty}
      </Link>
    </BrokerAuthShell>
  );
}
