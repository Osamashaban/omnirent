// Reading properties for the broker app's Properties screens. Server only.

import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getLang } from "./lang";
import { PROPERTY_DICTS } from "./property-i18n";
import type { Lang } from "./i18n";
import { formatMoney, fromPrice, listStatus, unitTotal, type DefaultNames, type ListStatus, type StepContext } from "./property-rules";

export async function defaultNames(): Promise<DefaultNames> {
  const p = PROPERTY_DICTS[await getLang()];
  return { unit: p.defaultUnit, whole: p.wholeApartment, standardRate: p.standardRateName, nonRefundable: p.nonRefundable };
}

// What a broker may pick: active apartment types (plus the property's current
// type, so a type hidden later doesn't block editing), and visible countries
// with their visible cities.
export async function stepContext(currentTypeId: string | null): Promise<StepContext> {
  const [types, countries] = await Promise.all([
    prisma.propertyType.findMany({
      where: { OR: [{ status: "ACTIVE", group: "APARTMENTS" }, ...(currentTypeId ? [{ id: currentTypeId }] : [])] },
      select: { id: true },
    }),
    prisma.country.findMany({
      where: { visible: true },
      select: { id: true, currency: true, cities: { where: { visible: true }, select: { id: true } } },
    }),
  ]);
  return {
    typeIds: types.map((t) => t.id),
    countries: countries.map((c) => ({ id: c.id, currency: c.currency, cityIds: c.cities.map((x) => x.id) })),
  };
}

export const loadPropertyInclude = {
  unitTypes: { include: { rates: { orderBy: { createdAt: "asc" } } }, orderBy: { sortOrder: "asc" } },
  taxes: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.PropertyInclude;

export type PropertyRow = {
  id: string;
  nickname: string;
  title: string;
  location: string;
  typeId: string | null;
  typeName: string;
  cityId: string | null;
  cityName: string;
  units: number;
  price: string | null;
  status: ListStatus;
  search: { nickname: string; titleEn: string; titleAr: string; compound: string };
};

// Every property of one broker company, newest first, in the viewer's language.
export async function listProperties(brokerId: string, lang: Lang): Promise<PropertyRow[]> {
  const rows = await prisma.property.findMany({
    where: { brokerId },
    orderBy: { createdAt: "desc" },
    include: {
      propertyType: { select: { nameAr: true, nameEn: true } },
      city: { select: { nameAr: true, nameEn: true } },
      unitTypes: { select: { kind: true, count: true, rates: { select: { parentId: true, price: true } } } },
    },
  });
  return rows.map((p) => {
    const price = fromPrice(p.unitTypes.flatMap((u) => u.rates));
    const cityName = p.city ? (lang === "ar" ? p.city.nameAr : p.city.nameEn) : "";
    return {
      id: p.id,
      nickname: p.nickname,
      title: (lang === "ar" && p.titleAr) || p.titleEn,
      location: [p.compound, cityName].filter(Boolean).join(" · "),
      typeId: p.propertyTypeId,
      typeName: p.propertyType ? (lang === "ar" ? p.propertyType.nameAr : p.propertyType.nameEn) : "",
      cityId: p.cityId,
      cityName,
      units: unitTotal(p.unitTypes),
      price: price === null ? null : formatMoney(price, p.currency, lang),
      status: listStatus(p),
      search: { nickname: p.nickname, titleEn: p.titleEn, titleAr: p.titleAr, compound: p.compound },
    };
  });
}

// The choices the wizard offers: active apartment types (plus the property's
// current one), the six most used of them first, and visible countries with
// their visible cities.
export async function wizardOptions(currentTypeId: string | null) {
  const [types, countries] = await Promise.all([
    prisma.propertyType.findMany({
      where: { OR: [{ status: "ACTIVE", group: "APARTMENTS" }, ...(currentTypeId ? [{ id: currentTypeId }] : [])] },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, nameAr: true, nameEn: true, _count: { select: { properties: true } } },
    }),
    prisma.country.findMany({
      where: { visible: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        currency: true,
        timezone: true,
        cities: { where: { visible: true }, orderBy: { createdAt: "asc" }, select: { id: true, nameAr: true, nameEn: true } },
      },
    }),
  ]);
  // Until properties show what brokers really use, ties follow the design's
  // picks, then the Settings order.
  const designPicks = ["Apartment", "Studio", "Duplex", "Room in apartment", "Chalet", "Villa"];
  const pick = (nameEn: string) => (designPicks.includes(nameEn) ? 0 : 1);
  const mostUsed = types
    .map((t, order) => ({ id: t.id, used: t._count.properties, pick: pick(t.nameEn), order }))
    .sort((a, b) => b.used - a.used || a.pick - b.pick || a.order - b.order)
    .slice(0, 6)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id);
  return {
    types: types.map(({ id, nameAr, nameEn }) => ({ id, nameAr, nameEn })),
    mostUsed,
    countries,
  };
}
