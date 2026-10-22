import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBrokerDict } from "@/lib/broker-lang";
import { findUsableBrokerToken } from "@/lib/broker-tokens";
import { BrokerAuthShell } from "@/components/broker/BrokerAuthShell";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Omnirent · Set a new password" };

type Props = { searchParams: Promise<{ token?: string }> };

// Where the reset email's button lands. The design has no broker screen for
// an expired reset link, so an unusable link goes back to "Forgot password"
// to ask for a new one.
export default async function BrokerResetPage({ searchParams }: Props) {
  const [{ lang, b }, { token }] = await Promise.all([getBrokerDict(), searchParams]);
  const secret = typeof token === "string" ? token : "";
  const found = await findUsableBrokerToken(secret, "RESET");
  if (!found) redirect("/broker/forgot-password");
  return (
    <BrokerAuthShell lang={lang} b={b} back={`/broker/reset-password?token=${encodeURIComponent(secret)}`}>
      <ResetForm lang={lang} token={secret} email={found.brokerUser.email} />
    </BrokerAuthShell>
  );
}
