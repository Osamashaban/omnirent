import type { Metadata } from "next";
import { getBrokerDict } from "@/lib/broker-lang";
import { BrokerAuthShell } from "@/components/broker/BrokerAuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Omnirent · Forgot password" };

export default async function BrokerForgotPage() {
  const { lang, b } = await getBrokerDict();
  return (
    <BrokerAuthShell lang={lang} b={b} back="/broker/forgot-password">
      <ForgotForm lang={lang} />
    </BrokerAuthShell>
  );
}
