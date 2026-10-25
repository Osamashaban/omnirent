"use server";

// Changes made from the broker app's Properties screens. Every action looks up
// the signed-in broker again and only ever touches that broker company's own
// properties: an id from another company is treated as not found.

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { channexConfigured } from "@/lib/channex";
import { pushRestrictions } from "@/lib/channex-ari";
import { unitHasUpcomingBookings } from "@/lib/channel-data";
import { SYNC_STALE_MS, isSyncStage, readSyncError, sellWindow, type SyncError, type SyncStage } from "@/lib/channex-payload";
import { runPublish } from "@/lib/channex-sync";
import { getCurrentBroker } from "@/lib/broker-auth";
import { isRowId } from "@/lib/action-args";
import { defaultNames, loadPropertyInclude, stepContext } from "@/lib/property-data";
import {
  STEP_COUNT,
  blankForm,
  checkStep,
  cleanForm,
  copyNickname,
  firstIncompleteStep,
  formFromStored,
  readForm,
  type FormErrors,
  type PropertyForm,
} from "@/lib/property-rules";

export type SaveResult =
  | { ok: true; id: string; form: PropertyForm; stepsDone: number; savedAt: number }
  | { ok: false; errors: FormErrors }
  | { ok: false; error: "signedOut" | "notFound" | "failed" | "unitBooked" };

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

  // A unit type with upcoming bookings from a platform can't be removed.
  const keptIds = new Set(clean.units.map((u) => u.id));
  for (const u of existing?.unitTypes ?? []) {
    if (!keptIds.has(u.id) && (await unitHasUpcomingBookings(u.id))) return { ok: false, error: "unitBooked" };
  }

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

export type SyncState = {
  status: "DRAFT" | "SYNCING" | "SYNCED" | "SYNC_FAILED";
  stage: SyncStage | null;
  error: SyncError | null;
};

// "Save and publish": sends the property to Channex in the background. The
// broker can stay and watch (syncState), or leave. A property is only
// published once every step is complete, and one publish runs at a time.
export async function publishProperty(propertyId: string): Promise<{ ok: true } | { ok: false; error: "signedOut" | "notFound" | "incomplete" | "busy" | "unavailable" }> {
  const current = await getCurrentBroker();
  if (!current) return { ok: false, error: "signedOut" };
  if (!isRowId(propertyId)) return { ok: false, error: "notFound" };
  if (!channexConfigured()) return { ok: false, error: "unavailable" };
  const property = await prisma.property.findFirst({ where: { id: propertyId, brokerId: current.broker.id, archivedAt: null }, include: loadPropertyInclude });
  if (!property) return { ok: false, error: "notFound" };
  const names = await defaultNames();
  if (firstIncompleteStep(formFromStored(property, names), await stepContext(property.propertyTypeId)) !== null) return { ok: false, error: "incomplete" };

  // Only one publish at a time; one that went quiet long ago may be replaced.
  const now = new Date();
  const claimed = await prisma.property.updateMany({
    where: {
      id: property.id,
      OR: [{ status: { not: "SYNCING" } }, { syncStartedAt: null }, { syncStartedAt: { lt: new Date(now.getTime() - SYNC_STALE_MS) } }],
    },
    data: { status: "SYNCING", syncStage: "property", syncStartedAt: now, stepsDone: 8 },
  });
  if (claimed.count !== 1) return { ok: false, error: "busy" };
  // No page refresh here: the progress dialog follows the publish and opens
  // the property page when it ends.
  after(() => runPublish(property.id));
  return { ok: true };
}

// Where a publish has got to, for the progress list.
export async function syncState(propertyId: string): Promise<SyncState | null> {
  const current = await getCurrentBroker();
  if (!current || !isRowId(propertyId)) return null;
  const p = await prisma.property.findFirst({
    where: { id: propertyId, brokerId: current.broker.id },
    select: { status: true, syncStage: true, syncError: true, syncStartedAt: true },
  });
  if (!p) return null;
  // A publish that stopped without a word (the server was restarted) counts
  // as failed, so the broker can retry.
  if (p.status === "SYNCING" && (!p.syncStartedAt || Date.now() - p.syncStartedAt.getTime() > SYNC_STALE_MS)) {
    const error: SyncError = { kind: "unreachable" };
    await prisma.property.updateMany({ where: { id: propertyId, status: "SYNCING" }, data: { status: "SYNC_FAILED", syncError: error } });
    return { status: "SYNC_FAILED", stage: isSyncStage(p.syncStage) ? p.syncStage : "property", error };
  }
  return { status: p.status, stage: isSyncStage(p.syncStage) ? p.syncStage : null, error: readSyncError(p.syncError) };
}

// Archived properties stay in the list with the "Archived" status and keep all
// their data. A published property first stops selling on every channel:
// all its rates are closed for the days Channex keeps open.
export async function archiveProperty(propertyId: string): Promise<RowResult> {
  const current = await getCurrentBroker();
  if (!current || !isRowId(propertyId)) return { ok: false };
  const property = await prisma.property.findFirst({
    where: { id: propertyId, brokerId: current.broker.id, archivedAt: null },
    select: { channexId: true, unitTypes: { select: { rates: { where: { parentId: null }, select: { channexId: true } } } } },
  });
  if (!property) return { ok: false };
  if (property.channexId) {
    // Rates that follow a standard rate close with it.
    const rates = property.unitTypes.flatMap((u) => u.rates.map((r) => r.channexId)).filter((id): id is string => Boolean(id));
    const window = sellWindow(new Date());
    try {
      await pushRestrictions(rates.map((id) => ({ property_id: property.channexId!, rate_plan_id: id, ...window, stop_sell: true })));
    } catch (err) {
      console.error("Closing the property on Channex failed", err);
      return { ok: false };
    }
  }
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
