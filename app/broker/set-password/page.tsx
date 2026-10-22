import type { Metadata } from "next";
import { getBrokerDict } from "@/lib/broker-lang";
import { findUsableBrokerToken } from "@/lib/broker-tokens";
import { whatsappLink } from "@/lib/support";
import { BrokerAuthShell } from "@/components/broker/BrokerAuthShell";
import { InviteExpired } from "@/components/broker/InviteExpired";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Omnirent · Set your password" };

type Props = { searchParams: Promise<{ token?: string }> };

// Where the invite email's "Set my password" button lands.
export default async function BrokerSetPasswordPage({ searchParams }: Props) {
  const [{ lang, b }, { token }] = await Promise.all([getBrokerDict(), searchParams]);
  const secret = typeof token === "string" ? token : "";
  const found = await findUsableBrokerToken(secret, "INVITE");
  const back = `/broker/set-password?token=${encodeURIComponent(secret)}`;

  return (
    <BrokerAuthShell lang={lang} b={b} back={back}>
      {found ? (
        <SetPasswordForm
          lang={lang}
          token={secret}
          firstName={found.brokerUser.name.split(" ")[0]}
          company={found.brokerUser.broker.companyName}
          email={found.brokerUser.email}
          whatsapp={whatsappLink(b.whatsappMessage)}
        />
      ) : (
        <InviteExpired b={b} whatsapp={whatsappLink(b.whatsappMessage)} />
      )}
    </BrokerAuthShell>
  );
}
