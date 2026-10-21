import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { getDict } from "@/lib/lang";
import { AppShell } from "@/components/ops/AppShell";
import { NoAccess } from "@/components/ops/PageStates";
import { PropertyTypesView, type TypeRow } from "./PropertyTypesView";

export const metadata: Metadata = { title: "Omnirent Ops · Property types" };

export default async function PropertyTypesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { lang, t } = await getDict();
  const shell = { user: me, lang, t, active: "property_types" as const, back: "/settings/property-types", title: t.propertyTypesNav };

  if (!canAccess(me.moduleKeys, "property_types")) {
    return (
      <AppShell {...shell}>
        <NoAccess t={t} roleName={me.roleName} />
      </AppShell>
    );
  }

  const types = await prisma.propertyType.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  // No property table exists yet, so nothing is in use until properties ship.
  const rows: TypeRow[] = types.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    group: p.group,
    channexType: p.channexType,
    rentMode: p.rentMode,
    status: p.status,
    channelNames: (p.channelNames ?? {}) as Record<string, string>,
    inUse: 0,
  }));

  return (
    <AppShell {...shell}>
      <PropertyTypesView lang={lang} types={rows} />
    </AppShell>
  );
}
