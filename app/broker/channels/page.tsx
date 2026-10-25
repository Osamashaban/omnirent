import type { Metadata } from "next";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { CHANNEL_DICTS } from "@/lib/channel-i18n";
import { loadChannels, pullFeed, recheckWaiting } from "@/lib/channel-data";
import { BrokerMenuBar } from "@/components/broker/BrokerShell";
import { ChannelsApp, PhoneBell, type Start } from "./ChannelsApp";

export const metadata: Metadata = { title: "Omnirent · Channels" };

// The broker Channels page (design App_Channels, version 80). Before showing
// it, properties waiting for a platform to accept are checked again and any
// booking changes the webhook missed are read (both throttled).
export default async function BrokerChannelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await requireBroker();
  const lang = await getLang();
  const brokerId = current.broker.id;
  await Promise.all([recheckWaiting(brokerId).catch(() => undefined), pullFeed(brokerId).catch(() => undefined)]);
  const data = await loadChannels(brokerId, current.user.name, current.broker.companyName);
  const t = CHANNEL_DICTS[lang];
  const q = await searchParams;
  const start: Start = {
    connected: q.connected === "abb" ? "abb" : undefined,
    abb: q.abb === "failed" || q.abb === "reconnected" ? q.abb : undefined,
  };
  const unread = data.notices.filter((n) => !n.read).length;
  return (
    <>
      <BrokerMenuBar
        current={current}
        lang={lang}
        p={PROPERTY_DICTS[lang]}
        title={t.channels}
        section="channels"
        action={<PhoneBell label={t.bellLabel(unread)} count={unread} />}
      />
      <ChannelsApp lang={lang} data={data} start={start} />
    </>
  );
}
