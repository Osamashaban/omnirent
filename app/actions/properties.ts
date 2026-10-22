"use server";

// Changes made from the broker app's Properties screens. Every action looks up
// the signed-in broker again and only ever touches that broker company's own
// properties: an id from another company is treated as not found.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentBroker } from "@/lib/broker-auth";
import { isRowId } from "@/lib/action-args";
import { defaultNames, loadPropertyInclude, stepContext } from "@/lib/property-data";
import {
  STEP_COUNT,
  blankForm,
  checkStep,
  cleanForm,
  copyNickname,
  formFromStored,
  readForm,
  type FormErrors,
  type PropertyForm,
} from "@/lib/property-rules";

export type SaveResult =
  | { ok: true; id: string; form: PropertyForm; stepsDone: number; savedAt: number }
  | { ok: false; errors: FormErrors }
  | { ok: false; error: "signedOut" | "notFound" | "failed" };

// Saves the whole form. "next" first checks the current step and refuses to
// move on while it has mistakes; "draft" saves whatever is there, as long as
// the property has a nickname to be found by.
export async function saveProperty(input: { id: string | null; step: number; mode: "next" | "draft"; form: unknown }): Promise<SaveResult> {
  const current = await getCurrentBroker();
  if (!current) return { ok: false, error: "signedOut" };
  const names = await defaultNames();
  const form = readForm(input?.form, names);
  const step = Number.isInteger(input?.step) && input.step >= 1 && input.step <= STEP_COUNT ? input.step : null;
  const mode = input?.mode === "next" ? "next" : input?.mode === "draft" ? "draft" : null;
  if (!form || !step || !mode || (input.id !== null && !isRowId(input.id))) return { ok: false, error: "failed" };

  const existing = input.id
    ? await prisma.property.findFirst({ where: { id: input.id, brokerId: current.broker.id }, include: loadPropertyInclude })
    : null;
  if (input.id && !existing) return { ok: false, error: "notFound" };

  const ctx = await stepContext(existing?.propertyTypeId ?? null);
  if (mode === "next") {
    const errors = checkStep(step, form, ctx);
    if (Object.keys(errors).length) return { ok: false, errors };
  } else if (!form.nickname.trim()) {
    return { ok: false, errors: { nickname: "required" } };
  }

  // Ids the broker can't pick are dropped rather than stored.
  const country = ctx.countries.find((c) => c.id === form.countryId);
  const safe: PropertyForm = {
    ...form,
    typeId: ctx.typeIds.includes(form.typeId) ? form.typeId : "",
    countryId: country ? form.countryId : "",
    cityId: country?.cityIds.includes(form.cityId) ? form.cityId : "",
    // Once rates are saved (step 4), their currency stays.
    currency: existing && existing.stepsDone >= 4 ? existing.currency : form.currency,
  };
  const clean = cleanForm(safe);
  const timezone = country
    ? ((await prisma.country.findUnique({ where: { id: country.id }, select: { timezone: true } }))?.timezone ?? "")
    : "";
  const stepsDone = mode === "next" ? Math.max(existing?.stepsDone ?? 0, step) : (existing?.stepsDone ?? 0);

  try {
    const id = await prisma.$transaction(async (tx) => {
      const data = { ...clean.property, timezone, stepsDone };
      const property = existing
        ? await tx.property.update({ where: { id: existing.id }, data })
        : await tx.property.create({ data: { ...data, brokerId: current.broker.id, createdById: current.user.id } });

      // Units, rates and taxes: rows that are still in the form are updated
      // by id, new ones created, and ones the broker removed are deleted
      // (nothing is published yet, so nothing else refers to them).
      const ownUnits = new Map((existing?.unitTypes ?? []).map((u) => [u.id, u]));
      const keptUnitIds = clean.units.map((u) => u.id).filter((id) => ownUnits.has(id));
      await tx.unitType.deleteMany({ where: { propertyId: property.id, id: { notIn: keptUnitIds } } });
      for (const u of clean.units) {
        const { rate, id: unitId, ...unitData } = u;
        const unit = ownUnits.has(unitId)
          ? await tx.unitType.update({ where: { id: unitId }, data: unitData })
          : await tx.unitType.create({ data: { ...unitData, propertyId: property.id } });
        const ownRates = new Map((ownUnits.get(unitId)?.rates ?? []).map((r) => [r.id, r]));
        const { derived, id: rateId, ...rateData } = rate;
        const standard = ownRates.has(rateId) && ownRates.get(rateId)!.parentId === null
          ? await tx.ratePlan.update({ where: { id: rateId }, data: rateData })
          : await tx.ratePlan.create({ data: { ...rateData, sellMode: "per_unit", unitTypeId: unit.id } });
        const keptRateIds = [standard.id];
        if (derived) {
          // A derived rate copies the standard rate's rules; only its name and
          // discount are its own.
          const derivedData = {
            ...rateData,
            name: derived.name,
            price: 0,
            adjustment: derived.adjustment,
            adjustValue: derived.adjustValue,
            parentId: standard.id,
          };
          const old = ownRates.get(derived.id);
          const row = old && old.parentId === standard.id
            ? await tx.ratePlan.update({ where: { id: old.id }, data: derivedData })
            : await tx.ratePlan.create({ data: { ...derivedData, sellMode: "per_unit", unitTypeId: unit.id } });
          keptRateIds.push(row.id);
        }
        await tx.ratePlan.deleteMany({ where: { unitTypeId: unit.id, id: { notIn: keptRateIds } } });
      }

      const ownTaxes = new Set((existing?.taxes ?? []).map((t) => t.id));
      const keptTaxIds = clean.taxes.map((t) => t.id).filter((id) => ownTaxes.has(id));
      await tx.propertyTax.deleteMany({ where: { propertyId: property.id, id: { notIn: keptTaxIds } } });
      for (const { id: taxId, startsOn, endsOn, ...t } of clean.taxes) {
        const taxData = {
          ...t,
          startsOn: startsOn ? new Date(`${startsOn}T00:00:00Z`) : null,
          endsOn: endsOn ? new Date(`${endsOn}T00:00:00Z`) : null,
        };
        if (ownTaxes.has(taxId)) await tx.propertyTax.update({ where: { id: taxId }, data: taxData });
        else await tx.propertyTax.create({ data: { ...taxData, propertyId: property.id } });
      }
      return property.id;
    });

    const saved = await prisma.property.findUniqueOrThrow({ where: { id }, include: loadPropertyInclude });
    revalidatePath("/broker/properties");
    return { ok: true, id, form: formFromStored(saved, names), stepsDone: saved.stepsDone, savedAt: Date.now() };
  } catch (err) {
    console.error("saveProperty failed", err);
    return { ok: false, error: "failed" };
  }
}

export type RowResult = { ok: true; id?: string } | { ok: false };

// Archived properties stay in the list with the "Archived" status and keep all
// their data. Nothing is published yet, so no channel needs closing.
export async function archiveProperty(propertyId: string): Promise<RowResult> {
  const current = await getCurrentBroker();
  if (!current || !isRowId(propertyId)) return { ok: false };
  const done = await prisma.property.updateMany({
    where: { id: propertyId, brokerId: current.broker.id, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/broker/properties");
  return { ok: done.count === 1 };
}

export type CopyParts = { units: boolean; rates: boolean; policies: boolean; taxes: boolean; content: boolean };

// Creates a draft copy with the parts the broker ticked. Rates can't be
// copied without the units they belong to.
export async function duplicateProperty(propertyId: string, nickname: unknown, parts: unknown): Promise<RowResult | { ok: false; error: "nickname" }> {
  const current = await getCurrentBroker();
  if (!current || !isRowId(propertyId) || typeof parts !== "object" || parts === null) return { ok: false };
  const name = typeof nickname === "string" ? nickname.trim().slice(0, 80) : "";
  if (!name) return { ok: false, error: "nickname" };
  const want = parts as Record<string, unknown>;
  const pick = (k: keyof CopyParts) => want[k] === true;

  const source = await prisma.property.findFirst({ where: { id: propertyId, brokerId: current.broker.id }, include: loadPropertyInclude });
  if (!source) return { ok: false };
  const names = await defaultNames();
  const form = formFromStored(source, names);
  const blank = blankForm(names, null);

  const copy: PropertyForm = { ...form, nickname: name };
  if (!pick("units")) Object.assign(copy, { rentMode: "WHOLE", units: blank.units, whole: blank.whole });
  else if (!pick("rates")) {
    const noRate = (u: PropertyForm["units"][number]) => ({ ...u, rate: blank.units[0].rate });
    Object.assign(copy, { units: copy.units.map(noRate), whole: noRate(copy.whole) });
  }
  if (!pick("policies")) {
    const policyKeys = [
      "cancellationPolicy", "checkInTime", "checkOutTime", "maxGuests", "adultsOnly", "internetType", "internetCoverage",
      "internetCost", "parkingType", "parkingReservation", "parkingPrivate", "petsPolicy", "petFee", "petDeposit", "smokingPolicy",
    ] as const;
    for (const k of policyKeys) Object.assign(copy, { [k]: blank[k] });
  }
  if (!pick("taxes")) copy.taxes = [];
  if (!pick("content")) Object.assign(copy, { descriptionEn: "", descriptionAr: "", importantInfo: "", website: "", facilities: blank.facilities });

  // Everything is new: no ids carry over.
  const fresh = (u: PropertyForm["units"][number]) => ({ ...u, id: "", rate: { ...u.rate, id: "", derivedId: "" } });
  const clean = cleanForm({ ...copy, units: copy.units.map(fresh), whole: fresh(copy.whole), taxes: copy.taxes.map((t) => ({ ...t, id: "" })) });

  const created = await prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        ...clean.property,
        timezone: source.timezone,
        brokerId: current.broker.id,
        createdById: current.user.id,
        // A copy reopens the wizard at the first step, so the broker reviews it.
        stepsDone: 0,
      },
    });
    for (const { rate, ...u } of clean.units) {
      const unit = await tx.unitType.create({ data: { ...withoutId(u), propertyId: property.id } });
      const { derived, ...r } = withoutId(rate);
      const standard = await tx.ratePlan.create({ data: { ...r, sellMode: "per_unit", unitTypeId: unit.id } });
      if (derived) {
        await tx.ratePlan.create({
          data: { ...r, name: derived.name, price: 0, adjustment: derived.adjustment, adjustValue: derived.adjustValue, parentId: standard.id, unitTypeId: unit.id },
        });
      }
    }
    for (const { startsOn, endsOn, ...t } of clean.taxes) {
      await tx.propertyTax.create({
        data: { ...withoutId(t), propertyId: property.id, startsOn: startsOn ? new Date(`${startsOn}T00:00:00Z`) : null, endsOn: endsOn ? new Date(`${endsOn}T00:00:00Z`) : null },
      });
    }
    return property;
  });
  revalidatePath("/broker/properties");
  return { ok: true, id: created.id };
}

// The nickname offered in the Duplicate dialog.
export async function suggestCopyName(propertyId: string): Promise<string> {
  const current = await getCurrentBroker();
  if (!current || !isRowId(propertyId)) return "";
  const own = await prisma.property.findMany({ where: { brokerId: current.broker.id }, select: { id: true, nickname: true } });
  const source = own.find((p) => p.id === propertyId);
  return source ? copyNickname(source.nickname, own.map((p) => p.nickname)) : "";
}

// Copies get new rows, so the source's ids are left out.
function withoutId<T extends { id: string }>(row: T): Omit<T, "id"> {
  const copy: Partial<T> = { ...row };
  delete copy.id;
  return copy as Omit<T, "id">;
}
