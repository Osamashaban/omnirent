import type { Metadata } from "next";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { BOOKING_DICTS } from "@/lib/booking-i18n";
import { loadBookings } from "@/lib/booking-data";
import { BrokerMenuBar } from "@/components/broker/BrokerShell";
import { GuestsApp } from "./GuestsApp";

export const metadata: Metadata = { title: "Omnirent · Guests" };

// The broker Guests page (design App_Bookings, version 87, the Guests boards).
export default async function BrokerGuestsPage() {
  const current = await requireBroker();
  const lang = await getLang();
  const t = BOOKING_DICTS[lang];
  const data = await loadBookings(current.broker.id, { direct: t.direct, deleted: t.deletedGuest });
  return (
    <>
      <BrokerMenuBar current={current} lang={lang} p={PROPERTY_DICTS[lang]} title={t.guests} section="guests" />
      <GuestsApp lang={lang} data={data} />
    </>
  );
}
