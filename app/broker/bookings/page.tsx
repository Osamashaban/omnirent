import type { Metadata } from "next";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { BOOKING_DICTS } from "@/lib/booking-i18n";
import { loadBookings } from "@/lib/booking-data";
import { BrokerMenuBar } from "@/components/broker/BrokerShell";
import { Initials } from "@/components/ops/ui";
import { BookingsApp } from "./BookingsApp";
import { PhoneNewButton } from "./PhoneNewButton";

export const metadata: Metadata = { title: "Omnirent · Bookings" };

// The broker Bookings page (design App_Bookings, version 87). New bookings
// and Airbnb requests the webhook missed are read again once the page is
// open, so it shows straight away.
export default async function BrokerBookingsPage() {
  const current = await requireBroker();
  const lang = await getLang();
  const t = BOOKING_DICTS[lang];
  const data = await loadBookings(current.broker.id, { direct: t.direct, deleted: t.deletedGuest });
  return (
    <>
      <BrokerMenuBar
        current={current}
        lang={lang}
        p={PROPERTY_DICTS[lang]}
        title={t.bookings}
        section="bookings"
        action={
          <>
            <PhoneNewButton label={t.newBooking} />
            <Initials name={current.user.name} size={32} />
            <span className="w-1" />
          </>
        }
      />
      <BookingsApp lang={lang} data={data} />
    </>
  );
}
