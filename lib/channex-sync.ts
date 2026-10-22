// Publishing a property to Channex: the property, its unit types, rates,
// house policy and content, in that order. The broker watches the progress
// line by line, so each part is recorded on the property as it starts. The
// ids Channex gives back are stored, so publishing again updates the same
// records instead of making new ones.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { channex, answerId, answerIds, ChannexError } from "@/lib/channex";
import { pushAvailability, pushRestrictions } from "@/lib/channex-ari";
import {
  contentPayload,
  derivedRatePayload,
  describeFailure,
  policyPayload,
  propertyPayload,
  roomTypePayload,
  sellWindow,
  standardRatePayload,
  type SourceProperty,
  type SyncError,
  type SyncStage,
} from "@/lib/channex-payload";

const num = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? null : Number(v.toString()));

async function loadSource(propertyId: string) {
  const p = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: {
      broker: true,
      propertyType: true,
      country: true,
      city: true,
      unitTypes: { include: { rates: { orderBy: { createdAt: "asc" } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  const source: SourceProperty = {
    channexId: p.channexId,
    nickname: p.nickname,
    titleEn: p.titleEn,
    email: p.email,
    phone: p.phone,
    currency: p.currency,
    countryIso2: p.country?.iso2 ?? "",
    cityName: p.city?.nameEn ?? "",
    address: p.address,
    postalCode: p.postalCode,
    latitude: num(p.latitude),
    longitude: num(p.longitude),
    timezone: p.timezone,
    channexType: p.propertyType?.channexType ?? "apartment",
    website: p.website,
    descriptionEn: p.descriptionEn,
    importantInfo: p.importantInfo,
    checkInTime: p.checkInTime,
    checkOutTime: p.checkOutTime,
    maxGuests: p.maxGuests,
    adultsOnly: p.adultsOnly,
    internetType: p.internetType,
    internetCoverage: p.internetCoverage,
    internetCost: num(p.internetCost),
    parkingType: p.parkingType,
    parkingReservation: p.parkingReservation,
    parkingPrivate: p.parkingPrivate,
    petsPolicy: p.petsPolicy,
    petFee: num(p.petFee) ?? 0,
    petDeposit: num(p.petDeposit) ?? 0,
    smokingPolicy: p.smokingPolicy,
    units: p.unitTypes.map((u) => ({
      id: u.id,
      channexId: u.channexId,
      name: u.name,
      count: u.count,
      adults: u.adults,
      children: u.children,
      infants: u.infants,
      rates: u.rates.map((r) => ({
        id: r.id,
        channexId: r.channexId,
        name: r.name,
        price: num(r.price) ?? 0,
        guests: r.guests,
        childFee: num(r.childFee) ?? 0,
        infantFee: num(r.infantFee) ?? 0,
        meals: r.meals,
        minStay: r.minStay,
        maxStay: r.maxStay,
        closedToArrival: r.closedToArrival,
        parentId: r.parentId,
        adjustment: r.adjustment,
        adjustValue: num(r.adjustValue),
      })),
    })),
  };
  return { row: p, source };
}

async function startStage(propertyId: string, stage: SyncStage) {
  await prisma.property.update({ where: { id: propertyId }, data: { syncStage: stage, syncStartedAt: new Date() } });
}

// Sends the whole property. Never throws: the outcome is written on the
// property (SYNCED, or SYNC_FAILED with the reason).
export async function runPublish(propertyId: string): Promise<void> {
  let stage: SyncStage = "property";
  let source: SourceProperty | null = null;
  try {
    const loaded = await loadSource(propertyId);
    const { row } = loaded;
    source = loaded.source;
    const p = source;
    const window = sellWindow(new Date());

    // 1. The property, in the broker company's group.
    await startStage(propertyId, "property");
    let groupId = row.broker.channexGroupId;
    if (!groupId && !row.channexId) {
      groupId = answerId(await channex("POST", "/groups", { group: { title: row.broker.companyName } }));
      await prisma.broker.update({ where: { id: row.brokerId }, data: { channexGroupId: groupId } });
    }
    let channexPropertyId = row.channexId;
    if (channexPropertyId) {
      await channex("PUT", `/properties/${channexPropertyId}`, { property: propertyPayload(p, null) });
    } else {
      channexPropertyId = answerId(await channex("POST", "/properties", { property: propertyPayload(p, groupId) }));
      await prisma.property.update({ where: { id: propertyId }, data: { channexId: channexPropertyId } });
      p.channexId = channexPropertyId;
    }
    const pid = channexPropertyId;

    // 2. Unit types. Ones the broker removed since the last publish go first
    // (with their rates), so a new unit type can take a freed name.
    stage = "units";
    await startStage(propertyId, "units");
    const keepRooms = new Set(p.units.map((u) => u.channexId).filter(Boolean));
    const keepRates = new Set(p.units.flatMap((u) => u.rates.map((r) => r.channexId)).filter(Boolean));
    const listed = (path: string) => channex("GET", `${path}?filter[property_id]=${pid}&pagination[limit]=100`).then(answerIds);
    // Deleting a standard rate can take the rate that follows it along, so a
    // record that is already gone is fine.
    const remove = (path: string) =>
      channex("DELETE", path).catch((err) => {
        if (!(err instanceof ChannexError && err.status === 404)) throw err;
      });
    for (const id of await listed("/rate_plans")) if (!keepRates.has(id)) await remove(`/rate_plans/${id}`);
    for (const id of await listed("/room_types")) if (!keepRooms.has(id)) await remove(`/room_types/${id}`);

    const newRooms: { id: string; count: number }[] = [];
    for (const u of p.units) {
      if (u.channexId) {
        await channex("PUT", `/room_types/${u.channexId}`, { room_type: roomTypePayload(u, pid) });
      } else {
        u.channexId = answerId(await channex("POST", "/room_types", { room_type: roomTypePayload(u, pid) }));
        await prisma.unitType.update({ where: { id: u.id }, data: { channexId: u.channexId } });
        newRooms.push({ id: u.channexId, count: u.count });
      }
    }
    // A new unit type opens all its units for sale. Later changes to how many
    // are open on a date are made in the calendar.
    await pushAvailability(newRooms.map((r) => ({ property_id: pid, room_type_id: r.id, ...window, availability: r.count })));

    // 3. Rates: each standard rate, then the rate that follows it.
    stage = "rates";
    await startStage(propertyId, "rates");
    const repriced: { id: string; rate: string }[] = [];
    for (const u of p.units) {
      const roomTypeId = u.channexId!;
      const standard = u.rates.filter((r) => r.parentId === null);
      for (const r of standard) {
        const body = standardRatePayload(r, u, { propertyId: pid, roomTypeId }, p.currency);
        if (r.channexId) {
          // A rate plan's default price only fills days opened later; when the
          // broker changed it, the days already open get the new price too.
          const before = await channex("GET", `/rate_plans/${r.channexId}`);
          const options = (before.body as { data?: { attributes?: { options?: { rate?: unknown }[] } } } | null)?.data?.attributes?.options;
          const oldRate = Number(options?.[0]?.rate ?? NaN);
          await channex("PUT", `/rate_plans/${r.channexId}`, { rate_plan: body });
          if (oldRate !== r.price) repriced.push({ id: r.channexId, rate: body.options[0].rate });
        } else {
          r.channexId = answerId(await channex("POST", "/rate_plans", { rate_plan: body }));
          await prisma.ratePlan.update({ where: { id: r.id }, data: { channexId: r.channexId } });
        }
        for (const d of u.rates.filter((x) => x.parentId === r.id)) {
          const dBody = derivedRatePayload(d, u, { propertyId: pid, roomTypeId, parentId: r.channexId }, p.currency);
          if (d.channexId) await channex("PUT", `/rate_plans/${d.channexId}`, { rate_plan: dBody });
          else {
            d.channexId = answerId(await channex("POST", "/rate_plans", { rate_plan: dBody }));
            await prisma.ratePlan.update({ where: { id: d.id }, data: { channexId: d.channexId } });
          }
        }
      }
    }
    await pushRestrictions(repriced.map((r) => ({ property_id: pid, rate_plan_id: r.id, ...window, rate: r.rate })));

    // 4. House policy, kept on the property.
    stage = "policy";
    await startStage(propertyId, "policy");
    let policyId = row.channexPolicyId;
    if (policyId) await channex("PUT", `/hotel_policies/${policyId}`, { hotel_policy: policyPayload(p, pid) });
    else {
      policyId = answerId(await channex("POST", "/hotel_policies", { hotel_policy: policyPayload(p, pid) }));
      await prisma.property.update({ where: { id: propertyId }, data: { channexPolicyId: policyId } });
    }

    // 5. Description and important information. Photos come with the photo
    // upload, which isn't built yet.
    stage = "content";
    await startStage(propertyId, "content");
    await channex("PUT", `/properties/${pid}`, { property: contentPayload(p, policyId) });

    await prisma.property.update({
      where: { id: propertyId },
      data: { status: "SYNCED", syncStage: null, syncError: Prisma.DbNull, syncedAt: new Date() },
    });
  } catch (err) {
    let reason: SyncError = { kind: "unreachable" };
    if (err instanceof ChannexError && source) reason = describeFailure(stage, err.status, err.body, source);
    else console.error("Channex publish failed", err);
    if (err instanceof ChannexError) console.error(`Channex publish failed at ${stage}: ${err.status}`, JSON.stringify(err.body)?.slice(0, 2000));
    await prisma.property
      .update({ where: { id: propertyId }, data: { status: "SYNC_FAILED", syncStage: stage, syncError: reason } })
      .catch((e) => console.error("Couldn't record the failed publish", e));
  }
}
