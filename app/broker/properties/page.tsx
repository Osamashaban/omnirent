import type { Metadata } from "next";
import { requireBroker } from "@/lib/broker-auth";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Omnirent · Properties" };

// Placeholder until the properties release (thread "Add property wizard")
// replaces this file with the properties list. Shows the vendor dashboard's
// existing coming-soon card.
export default async function BrokerPropertiesPlaceholder() {
  await requireBroker();
  return <ComingSoon />;
}
