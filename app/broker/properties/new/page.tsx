import type { Metadata } from "next";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { defaultNames, wizardOptions } from "@/lib/property-data";
import { blankForm } from "@/lib/property-rules";
import { BrokerCloseBar, BrokerMain } from "@/components/broker/BrokerShell";
import { channexConfigured } from "@/lib/channex";
import { Wizard } from "../_wizard/Wizard";

export const metadata: Metadata = { title: "Omnirent · Add property" };

// A new property starts in the broker's main city's country when it is
// visible, so the currency and cities are ready.
export default async function NewPropertyPage() {
  const current = await requireBroker();
  const lang = await getLang();
  const p = PROPERTY_DICTS[lang];
  const [options, names] = await Promise.all([wizardOptions(null), defaultNames()]);
  const mainCountry = options.countries.find((c) => c.cities.some((city) => city.id === current.broker.mainCityId)) ?? (options.countries.length === 1 ? options.countries[0] : null);
  return (
    <>
      <BrokerCloseBar userName={current.user.name} p={p} title={p.addTitle} />
      <BrokerMain>
        <Wizard
          lang={lang}
          options={options}
          id={null}
          initialForm={blankForm(names, mainCountry)}
          stepsDone={0}
          startStep={1}
          canPublish={channexConfigured()}
          ratesSaved={false}
        />
      </BrokerMain>
    </>
  );
}
