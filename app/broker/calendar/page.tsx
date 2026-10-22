import type { Metadata } from "next";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { CALENDAR_DICTS } from "@/lib/calendar-i18n";
import { loadCalendar } from "@/lib/calendar-data";
import { BrokerMenuBar } from "@/components/broker/BrokerShell";
import { CalendarApp } from "./CalendarApp";

export const metadata: Metadata = { title: "Omnirent · Calendar" };

// The broker Calendar (design App_Calendar, version 64): prices, units open
// and stay rules for every night of every unit type, edited one range at a
// time or in bulk, and sent to the channels.
export default async function BrokerCalendarPage() {
  const current = await requireBroker();
  const lang = await getLang();
  const data = await loadCalendar(current.broker.id, lang);
  const t = CALENDAR_DICTS[lang];
  return (
    <>
      <BrokerMenuBar current={current} lang={lang} p={PROPERTY_DICTS[lang]} title={t.calendar} section="calendar" />
      <CalendarApp lang={lang} data={data} />
    </>
  );
}
