import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { getDict } from "@/lib/lang";
import { formatLastLogin } from "@/lib/dates";
import { BROKER_DICTS, ago } from "@/lib/broker-i18n";
import { brokerActions, brokerListStatus, companyInitials, formatMobile, type ListStatus } from "@/lib/broker-rules";
import { AppShell } from "@/components/ops/AppShell";
import { NoAccess } from "@/components/ops/PageStates";
import { BrokersView, type BrokerRow, type CityOption } from "./BrokersView";

export const metadata: Metadata = { title: "Omnirent Ops · Brokers" };

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

const FILTERS = ["ACTIVE", "INVITED", "EXPIRED", "DEACTIVATED"] as const;

export default async function BrokersPage({ searchParams }: Props) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const [{ lang, t }, params] = await Promise.all([getDict(), searchParams]);
  const b = BROKER_DICTS[lang];
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const status = (FILTERS as readonly string[]).includes(params.status ?? "") ? (params.status as ListStatus) : "";
  const query = new URLSearchParams(Object.entries({ q, status }).filter(([, v]) => v));
  const shell = { user: me, lang, t, active: "brokers" as const, back: `/brokers${query.size ? `?${query}` : ""}`, title: b.brokersTitle };

  if (!canAccess(me.moduleKeys, "brokers")) {
    return (
      <AppShell {...shell}>
        <NoAccess t={t} roleName={me.roleName} />
      </AppShell>
    );
  }

  const now = new Date();
  const [brokers, countries] = await Promise.all([
    prisma.broker.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        mainCity: true,
        users: {
          orderBy: { createdAt: "asc" },
          take: 1,
          include: { tokens: { where: { type: "INVITE" }, orderBy: { expiresAt: "desc" }, take: 1 } },
        },
      },
    }),
    prisma.country.findMany({
      where: { visible: true },
      orderBy: { createdAt: "asc" },
      include: { cities: { where: { visible: true }, orderBy: { createdAt: "asc" } } },
    }),
  ]);

  const all: BrokerRow[] = brokers.map((broker) => {
    const user = broker.users[0] ?? null;
    const invite = user?.tokens[0] ?? null;
    // A used invite link no longer counts as waiting.
    const inviteExpiresAt = invite && !invite.usedAt ? invite.expiresAt : null;
    const listStatus = brokerListStatus(broker, user, inviteExpiresAt, now);
    const last =
      listStatus === "INVITED" && user?.invitedAt
        ? b.invitedAgo(ago(b, user.invitedAt, now))
        : listStatus === "EXPIRED" && invite
          ? b.expiredAgo(ago(b, invite.expiresAt, now))
          : user?.lastLoginAt
            ? formatLastLogin(user.lastLoginAt, lang, t, now)
            : "—";
    return {
      id: broker.id,
      company: broker.companyName,
      initials: companyInitials(broker.companyName),
      cityId: broker.mainCityId,
      city: lang === "ar" ? broker.mainCity.nameAr : broker.mainCity.nameEn,
      approxUnits: broker.approxUnits,
      notes: broker.notes ?? "",
      contact: user?.name ?? "",
      email: user?.email ?? "",
      mobile: user?.mobile ?? "",
      mobileShown: user ? formatMobile(user.mobile) : "",
      status: listStatus,
      last,
      actions: brokerActions(listStatus),
    };
  });

  const counts = { ALL: all.length, ACTIVE: 0, INVITED: 0, EXPIRED: 0, DEACTIVATED: 0 };
  for (const row of all) counts[row.status] += 1;

  const needle = q.trim().toLowerCase();
  const rows = all.filter(
    (row) =>
      (!status || row.status === status) &&
      (!needle ||
        [row.company, row.contact, row.email, row.mobile, row.mobileShown].some((v) => v.toLowerCase().includes(needle))),
  );

  // Cities of every visible country; an edited broker keeps a city that has
  // since been hidden.
  const cities: CityOption[] = countries.flatMap((c) =>
    c.cities.map((city) => ({ id: city.id, name: lang === "ar" ? city.nameAr : city.nameEn, country: lang === "ar" ? c.nameAr : c.nameEn })),
  );
  for (const broker of brokers) {
    if (!cities.some((c) => c.id === broker.mainCityId)) {
      cities.push({ id: broker.mainCityId, name: lang === "ar" ? broker.mainCity.nameAr : broker.mainCity.nameEn, country: "", hidden: true });
    }
  }

  return (
    <AppShell {...shell}>
      <BrokersView lang={lang} rows={rows} counts={counts} cities={cities} filters={{ q, status }} />
    </AppShell>
  );
}
