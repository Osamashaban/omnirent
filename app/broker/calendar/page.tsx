import type { Metadata } from "next";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { CALENDAR_DICTS } from "@/lib/calendar-i18n";
import { loadCalendar } from "@/lib/calendar-data";
import { BrokerMenuBar } from "@/components/broker/BrokerShell";
import { CalendarApp } from "./CalendarApp";

export const metadata: Metadata = { title: "Omnirent · Calendar" };

// The broker Calendar (design App_Calendar, version 64, bookings as in v1.1):
// prices, units open and stay rules for every night of every unit type,
// edited one range at a time or in bulk, and sent to the channels; bookings
// as bars on their apartments.
export default async function BrokerCalendarPage({ searchParams }: { searchParams: Promise<{ booking?: string | string[] }> }) {
  const current = await requireBroker();
  const lang = await getLang();
  const data = await loadCalendar(current.broker.id, lang);
  const t = CALENDAR_DICTS[lang];
  // "In Calendar" on a booking opens the Calendar on that booking.
  const booking = (await searchParams).booking;
  const focus = typeof booking === "string" ? booking : null;
  return (
    <>
      <BrokerMenuBar current={current} lang={lang} p={PROPERTY_DICTS[lang]} title={t.calendar} section="calendar" />
      <CalendarApp key={focus ?? ""} lang={lang} data={data} focus={focus} />
    </>
  );
}
