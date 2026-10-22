import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { prisma } from "@/lib/db";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { defaultNames, loadPropertyInclude, wizardOptions } from "@/lib/property-data";
import { STEP_COUNT, formFromStored } from "@/lib/property-rules";
import { BrokerCloseBar, BrokerMain } from "@/components/broker/BrokerShell";
import { channexConfigured } from "@/lib/channex";
import { Wizard } from "../../_wizard/Wizard";

export const metadata: Metadata = { title: "Omnirent · Edit property" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> };

// Reopens the wizard on a saved property: at the step in the address (from
// the review's Edit links), or the first step not yet completed.
export default async function EditPropertyPage({ params, searchParams }: Props) {
  const current = await requireBroker();
  const [{ id }, query, lang] = await Promise.all([params, searchParams, getLang()]);
  const property = await prisma.property.findFirst({ where: { id, brokerId: current.broker.id }, include: loadPropertyInclude });
  if (!property) notFound();
  // An archived property can't be edited: show its page instead.
  if (property.archivedAt) redirect(`/broker/properties/${property.id}`);
  const p = PROPERTY_DICTS[lang];
  const [options, names] = await Promise.all([wizardOptions(property.propertyTypeId), defaultNames()]);
  const reachable = Math.min(STEP_COUNT, property.stepsDone + 1);
  const asked = Number(query.step);
  const startStep = Number.isInteger(asked) && asked >= 1 && asked <= reachable ? asked : property.stepsDone >= STEP_COUNT - 1 ? 1 : reachable;
  return (
    <>
      <BrokerCloseBar userName={current.user.name} p={p} title={p.editTitle} href={`/broker/properties/${property.id}`} />
      <BrokerMain>
        <Wizard
          lang={lang}
          options={options}
          id={property.id}
          initialForm={formFromStored(property, names)}
          stepsDone={property.stepsDone}
          startStep={startStep}
          canPublish={channexConfigured()}
          ratesSaved={property.stepsDone >= 4}
        />
      </BrokerMain>
    </>
  );
}
