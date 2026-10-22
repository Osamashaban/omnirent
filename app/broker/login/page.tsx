import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentBroker } from "@/lib/broker-auth";
import { getBrokerDict } from "@/lib/broker-lang";
import { BrokerAuthShell } from "@/components/broker/BrokerAuthShell";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Omnirent · Sign in" };

type Props = { searchParams: Promise<{ email?: string }> };

export default async function BrokerLoginPage({ searchParams }: Props) {
  if (await getCurrentBroker()) redirect("/broker");
  const [{ lang, b }, { email }] = await Promise.all([getBrokerDict(), searchParams]);
  const initialEmail = typeof email === "string" ? email.slice(0, 254) : "";
  return (
    <BrokerAuthShell lang={lang} b={b} back="/broker/login">
      <SignInForm lang={lang} initialEmail={initialEmail} />
    </BrokerAuthShell>
  );
}
