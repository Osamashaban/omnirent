// ---------------------------------------------------------------------------
// Which Omnirent site a visitor is on.
//
// One deployment serves several addresses. ops.getomnirent.com is the
// Omnirent team's operations dashboard; app.getomnirent.com (and every other
// address, including omnirent-sooty.vercel.app and preview links) is the
// vendor dashboard for property owners, managers and brokers.
//
// Preview links have their own address, so `?site=ops` or `?site=vendor`
// lets a reviewer see either site on any deployment.
// ---------------------------------------------------------------------------

export type Site = "ops" | "vendor";

export function siteFor(host: string | null | undefined, override?: string | null): Site {
  if (override === "ops" || override === "vendor") return override;
  const hostname = (host ?? "").toLowerCase().split(":")[0];
  return hostname.startsWith("ops.") ? "ops" : "vendor";
}

export type ComingSoonCopy = {
  title: string;
  description: string;
  titleAr: string;
  descriptionAr: string;
};

export const COMING_SOON: Record<Site, ComingSoonCopy> = {
  ops: {
    title: "Omnirent Operation dashboard",
    description:
      "One place for the Omnirent team to run properties, channels, bookings and payouts.",
    titleAr: "لوحة عمليات Omnirent",
    descriptionAr: "مكان واحد لفريق Omnirent لإدارة العقارات والقنوات والحجوزات والمدفوعات.",
  },
  vendor: {
    title: "Omnirent Vendor dashboard",
    description:
      "List once. Reach everywhere. Manage your properties, calendars and bookings across Airbnb, Booking.com and more.",
    titleAr: "لوحة تحكم الشركاء من Omnirent",
    descriptionAr:
      "أضف عقارك مرة واحدة واعرضه في كل مكان. أدر عقاراتك وتقويماتك وحجوزاتك على Airbnb وBooking.com وغيرها.",
  },
};
