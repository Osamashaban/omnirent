import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { getDict } from "@/lib/lang";
import { AppShell } from "@/components/ops/AppShell";
import { NoAccess } from "@/components/ops/PageStates";
import { CountriesView, type CountryRow } from "./CountriesView";

export const metadata: Metadata = { title: "Omnirent Ops · Countries & cities" };

type Props = { searchParams: Promise<{ country?: string }> };

export default async function CountriesPage({ searchParams }: Props) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const [{ lang, t }, params] = await Promise.all([getDict(), searchParams]);
  const shell = { user: me, lang, t, active: "countries" as const, back: "/settings/countries", title: t.countriesNav };

  if (!canAccess(me.moduleKeys, "countries_cities")) {
    return (
      <AppShell {...shell}>
        <NoAccess t={t} roleName={me.roleName} />
      </AppShell>
    );
  }

  const countries = await prisma.country.findMany({
    orderBy: { createdAt: "asc" },
    include: { cities: { orderBy: { createdAt: "asc" } } },
  });

  // No property table exists yet, so every count is 0 until properties ship.
  const rows: CountryRow[] = countries.map((c) => ({
    id: c.id,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    iso2: c.iso2,
    dialCode: c.dialCode,
    currency: c.currency,
    timezone: c.timezone,
    visible: c.visible,
    cities: c.cities.map((city) => ({ id: city.id, nameAr: city.nameAr, nameEn: city.nameEn, visible: city.visible, propertyCount: 0 })),
  }));

  return (
    <AppShell {...shell}>
      <CountriesView lang={lang} countries={rows} initialIso={(params.country ?? "").toUpperCase()} />
    </AppShell>
  );
}
