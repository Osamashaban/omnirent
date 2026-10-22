import Link from "next/link";
import type { BrokerDict } from "@/lib/broker-i18n";
import { BrokerHeading, BrokerStatusIcon, brokerPrimaryButtonClass, brokerSecondaryButtonClass } from "./BrokerAuthShell";

// "This invite link has expired": asks the Omnirent team for a new link on
// WhatsApp. Without a WhatsApp number set, only the sign-in button shows.
export function InviteExpired({ b, whatsapp }: { b: BrokerDict; whatsapp: string | null }) {
  return (
    <>
      <BrokerStatusIcon tone="amber">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </BrokerStatusIcon>
      <BrokerHeading title={b.expiredTitle}>{b.expiredBody}</BrokerHeading>
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={brokerPrimaryButtonClass}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
          {b.askOnWhatsapp}
        </a>
      )}
      <Link href="/broker/login" className={brokerSecondaryButtonClass}>
        {b.haveAccount}
      </Link>
    </>
  );
}
