// Dates as the design shows them: "Today, 9:42 AM" / "اليوم، 9:42 ص",
// "Yesterday, …", otherwise "Oct 3" / "3 أكتوبر". Times are shown in Cairo
// time, where the Ops team works (an assumption to revisit if that changes).

import type { Dict, Lang } from "./i18n";

export const OPS_TIME_ZONE = "Africa/Cairo";

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: OPS_TIME_ZONE }).format(date);
}

export function formatLastLogin(date: Date | null, lang: Lang, t: Dict, now = new Date()): string {
  if (!date) return "—";
  const locale = lang === "ar" ? "ar-EG-u-nu-latn" : "en-US";
  const time = new Intl.DateTimeFormat(locale, { timeZone: OPS_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(date);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sep = lang === "ar" ? "، " : ", ";
  if (dayKey(date) === dayKey(now)) return `${t.today}${sep}${time}`;
  if (dayKey(date) === dayKey(yesterday)) return `${t.yesterday}${sep}${time}`;
  const sameYear = dayKey(date).slice(0, 4) === dayKey(now).slice(0, 4);
  return new Intl.DateTimeFormat(locale, {
    timeZone: OPS_TIME_ZONE,
    day: "numeric",
    month: lang === "ar" ? "long" : "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

export function formatDateTime(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    timeZone: OPS_TIME_ZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}
