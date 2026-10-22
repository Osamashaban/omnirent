import type { Metadata } from "next";
import Link from "next/link";
import { requireBroker } from "@/lib/broker-auth";
import { getBrokerDict } from "@/lib/broker-lang";
import { BrokerAuthShell, BrokerHeading, BrokerStatusIcon, brokerPrimaryButtonClass } from "@/components/broker/BrokerAuthShell";

export const metadata: Metadata = { title: "Omnirent · Broker dashboard" };

// The broker dashboard's front page (app.getomnirent.com). Signed-out
// visitors go to sign in. The broker menu and properties list come with the
// properties release; until then a signed-in broker sees "Signed in".
export default async function BrokerHome() {
  const { user } = await requireBroker();
  const { lang, b } = await getBrokerDict();
  return (
    <BrokerAuthShell lang={lang} b={b} back="/broker">
      <BrokerStatusIcon tone="green">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </BrokerStatusIcon>
      <BrokerHeading title={b.signedInTitle}>{b.signedInBody(user.name.split(" ")[0])}</BrokerHeading>
      <Link href="/broker/properties" className={brokerPrimaryButtonClass}>
        {b.goToProperties}
      </Link>
    </BrokerAuthShell>
  );
}
