import type { Metadata } from "next";
import Link from "next/link";
import { getBrokerDict } from "@/lib/broker-lang";
import { BrokerAuthShell, BrokerHeading, BrokerStatusIcon, brokerLinkButtonClass } from "@/components/broker/BrokerAuthShell";

export const metadata: Metadata = { title: "Omnirent · Check your email" };

type Props = { searchParams: Promise<{ email?: string }> };

// Same screen whether or not the email has an account.
export default async function BrokerResetSentPage({ searchParams }: Props) {
  const [{ lang, b }, { email }] = await Promise.all([getBrokerDict(), searchParams]);
  const shown = typeof email === "string" && email ? email.slice(0, 254) : "—";
  return (
    <BrokerAuthShell lang={lang} b={b} back={`/broker/forgot-password/sent?email=${encodeURIComponent(shown)}`}>
      <BrokerStatusIcon tone="green">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </BrokerStatusIcon>
      <BrokerHeading title={b.sentTitle}>{b.sentBody(shown)}</BrokerHeading>
      <div className="rounded-lg bg-[#F3F4F6] px-3.5 py-3 text-[14px] text-[#4B5563]">{b.sentNote}</div>
      <Link href="/broker/login" className={`${brokerLinkButtonClass} self-center`}>
        {b.backToSignIn}
      </Link>
    </BrokerAuthShell>
  );
}
