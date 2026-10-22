import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { BrokerFrame } from "@/components/broker/BrokerShell";

// The broker app frame around every Properties page. Signed-out visitors go
// to the broker sign-in.
export default async function BrokerPropertiesLayout({ children }: { children: React.ReactNode }) {
  const current = await requireBroker();
  const lang = await getLang();
  return (
    <BrokerFrame current={current} lang={lang} p={PROPERTY_DICTS[lang]}>
      {children}
    </BrokerFrame>
  );
}
