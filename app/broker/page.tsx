import { redirect } from "next/navigation";
import { requireBroker } from "@/lib/broker-auth";

// The broker dashboard's front page (app.getomnirent.com). Signed-out
// visitors go to sign in; a signed-in broker lands straight on Properties.
export default async function BrokerHome() {
  await requireBroker();
  redirect("/broker/properties");
}
