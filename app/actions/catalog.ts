"use server";

// Changes made from Settings › Countries & cities and Settings › Property
// types. Every action checks again that the signed-in person's role has the
// page's module: hiding a button is not a permission check.
//
// No property table exists yet, so nothing is "in use" and every city can be
// deleted. When properties arrive, the in-use counts must be checked here.

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import type { ModuleKey } from "@/lib/modules";
import { checkCity, checkCountry, cleanCountry, type CityErrors, type CountryErrors } from "@/lib/geo-rules";
import {
  checkPropertyType,
  cleanPropertyType,
  statusAfterSave,
  type PropertyTypeErrors,
} from "@/lib/property-type-rules";
import { CHANNELS } from "@/lib/channex-catalog";

async function requireAccess(module: ModuleKey) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.moduleKeys, module)) throw new Error("Not allowed");
  return user;
}

const isUniqueClash = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

function done() {
  revalidatePath("/settings", "layout");
}

type Names = { nameAr: string; nameEn: string };

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

export type CountryFormState = {
  done?: { at: number; iso2: string; added: boolean } & Names;
  values?: { nameAr: string; nameEn: string; iso2: string; dialCode: string; currency: string; timezone: string; visible: boolean };
  errors?: CountryErrors;
  formError?: "somethingWrong";
};

export async function saveCountry(_prev: CountryFormState, form: FormData): Promise<CountryFormState> {
  await requireAccess("countries_cities");
  const countryId = String(form.get("countryId") ?? "") || null;
  const values = {
    nameAr: String(form.get("nameAr") ?? ""),
    nameEn: String(form.get("nameEn") ?? ""),
    iso2: String(form.get("iso2") ?? ""),
    dialCode: String(form.get("dialCode") ?? ""),
    currency: String(form.get("currency") ?? ""),
    timezone: String(form.get("timezone") ?? ""),
    visible: form.get("visible") === "on",
  };
  if (countryId && !(await prisma.country.findUnique({ where: { id: countryId } }))) return { values, formError: "somethingWrong" };

  const others = await prisma.country.findMany({ select: { id: true, nameAr: true, nameEn: true, iso2: true } });
  const errors = checkCountry(values, others, countryId);
  if (Object.keys(errors).length) return { values, errors };

  const data = cleanCountry(values);
  try {
    const saved = countryId
      ? await prisma.country.update({ where: { id: countryId }, data })
      : await prisma.country.create({ data });
    done();
    return { done: { at: Date.now(), iso2: saved.iso2, added: !countryId, nameAr: saved.nameAr, nameEn: saved.nameEn } };
  } catch (e) {
    if (isUniqueClash(e)) return { values, errors: { nameEn: "countryExists" } };
    throw e;
  }
}

export async function setCountryVisible(countryId: string, visible: boolean): Promise<{ ok: boolean }> {
  await requireAccess("countries_cities");
  const found = await prisma.country.updateMany({ where: { id: countryId }, data: { visible } });
  done();
  return { ok: found.count === 1 };
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

export type CityFormState = {
  done?: { at: number; cityId: string; added: boolean } & Names;
  values?: { nameAr: string; nameEn: string; visible: boolean };
  errors?: CityErrors;
  duplicate?: Names;
  formError?: "somethingWrong";
};

export async function saveCity(_prev: CityFormState, form: FormData): Promise<CityFormState> {
  await requireAccess("countries_cities");
  const countryId = String(form.get("countryId") ?? "");
  const cityId = String(form.get("cityId") ?? "") || null;
  const values = {
    nameAr: String(form.get("nameAr") ?? ""),
    nameEn: String(form.get("nameEn") ?? ""),
    visible: form.get("visible") === "on",
  };
  const country = await prisma.country.findUnique({ where: { id: countryId }, include: { cities: true } });
  if (!country || (cityId && !country.cities.some((c) => c.id === cityId))) return { values, formError: "somethingWrong" };

  const { errors, duplicate } = checkCity(values, country.cities, cityId);
  if (Object.keys(errors).length) {
    return { values, errors, duplicate: duplicate && { nameAr: duplicate.nameAr, nameEn: duplicate.nameEn } };
  }

  const data = { nameAr: values.nameAr.trim().slice(0, 80), nameEn: values.nameEn.trim().slice(0, 80), visible: values.visible };
  try {
    const saved = cityId
      ? await prisma.city.update({ where: { id: cityId }, data })
      : await prisma.city.create({ data: { ...data, countryId } });
    done();
    return { done: { at: Date.now(), cityId: saved.id, added: !cityId, nameAr: saved.nameAr, nameEn: saved.nameEn } };
  } catch (e) {
    if (isUniqueClash(e)) return { values, errors: { nameEn: "cityExists" }, duplicate: { nameAr: data.nameAr, nameEn: data.nameEn } };
    throw e;
  }
}

export async function setCityVisible(cityId: string, visible: boolean): Promise<{ ok: boolean }> {
  await requireAccess("countries_cities");
  const found = await prisma.city.updateMany({ where: { id: cityId }, data: { visible } });
  done();
  return { ok: found.count === 1 };
}

export async function deleteCity(cityId: string): Promise<{ ok: boolean }> {
  await requireAccess("countries_cities");
  const found = await prisma.city.deleteMany({ where: { id: cityId } });
  done();
  return { ok: found.count === 1 };
}

// ---------------------------------------------------------------------------
// Property types
// ---------------------------------------------------------------------------

export type PropertyTypeFormState = {
  done?: { at: number; id: string; added: boolean; status: "ACTIVE" | "HIDDEN" | "ARCHIVED" } & Names;
  errors?: PropertyTypeErrors;
  duplicateAr?: string;
  duplicateEn?: string;
  formError?: "somethingWrong";
  // Bumped on every failed save, so the form can show the error banner again.
  failedAt?: number;
};

export async function savePropertyType(_prev: PropertyTypeFormState, form: FormData): Promise<PropertyTypeFormState> {
  await requireAccess("property_types");
  const typeId = String(form.get("typeId") ?? "") || null;
  const channelNames: Record<string, string> = {};
  for (const channel of CHANNELS) {
    const value = form.get(`channel_${channel.id}`);
    if (typeof value === "string") channelNames[channel.id] = value;
  }
  const input = {
    nameAr: String(form.get("nameAr") ?? ""),
    nameEn: String(form.get("nameEn") ?? ""),
    group: String(form.get("group") ?? ""),
    channexType: String(form.get("channexType") ?? ""),
    rentMode: String(form.get("rentMode") ?? ""),
    visible: form.get("visible") === "on",
    channelNames,
  };
  const current = typeId ? await prisma.propertyType.findUnique({ where: { id: typeId } }) : null;
  if (typeId && !current) return { formError: "somethingWrong", failedAt: Date.now() };

  const others = await prisma.propertyType.findMany({ select: { id: true, nameAr: true, nameEn: true } });
  const { errors, duplicateAr, duplicateEn } = checkPropertyType(input, others, typeId);
  if (Object.keys(errors).length) {
    return { errors, duplicateAr: duplicateAr?.nameAr, duplicateEn: duplicateEn?.nameEn, failedAt: Date.now() };
  }

  const data = { ...cleanPropertyType(input), status: statusAfterSave(current?.status ?? null, input.visible) };
  try {
    let saved;
    if (typeId) {
      saved = await prisma.propertyType.update({ where: { id: typeId }, data });
    } else {
      // New types go to the top of the list, as in the design.
      const first = await prisma.propertyType.aggregate({ _min: { sortOrder: true } });
      saved = await prisma.propertyType.create({ data: { ...data, sortOrder: (first._min.sortOrder ?? 10) - 10 } });
    }
    done();
    return { done: { at: Date.now(), id: saved.id, added: !typeId, status: saved.status, nameAr: saved.nameAr, nameEn: saved.nameEn } };
  } catch (e) {
    if (isUniqueClash(e)) return { errors: { nameEn: "typeExists" }, duplicateEn: data.nameEn, failedAt: Date.now() };
    throw e;
  }
}

// Archive, or restore an archived type to Active.
export async function setPropertyTypeArchived(typeId: string, archived: boolean): Promise<{ ok: boolean }> {
  await requireAccess("property_types");
  const found = await prisma.propertyType.updateMany({
    where: { id: typeId, status: archived ? { not: "ARCHIVED" } : "ARCHIVED" },
    data: { status: archived ? "ARCHIVED" : "ACTIVE" },
  });
  done();
  return { ok: found.count === 1 };
}
