import type { Metadata } from "next";
import Link from "next/link";
import { getBrokerDict } from "@/lib/broker-lang";
import { BrokerAuthShell, BrokerHeading, BrokerStatusIcon, brokerPrimaryButtonClass } from "@/components/broker/BrokerAuthShell";

export const metadata: Metadata = { title: "Omnirent · Password updated" };

export default async function BrokerResetDonePage() {
  const { lang, b } = await getBrokerDict();
  return (
    <BrokerAuthShell lang={lang} b={b} back="/broker/reset-password/done">
      <BrokerStatusIcon tone="green">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </BrokerStatusIcon>
      <BrokerHeading title={b.updatedTitle}>{b.updatedBody}</BrokerHeading>
      <Link href="/broker/login" className={brokerPrimaryButtonClass}>
        {b.signIn}
      </Link>
    </BrokerAuthShell>
  );
}
