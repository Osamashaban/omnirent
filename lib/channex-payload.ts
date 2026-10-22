// ---------------------------------------------------------------------------
// What Omnirent sends to Channex when a broker publishes a property, and how
// Channex's answers are turned into words for the broker. Kept apart from the
// database and the network so tests can check it directly; the sending itself
// is in lib/channex-sync.ts.
//
// Omnirent -> Channex:
//   property        -> property (in the broker company's group)
//   unit type/room  -> room type (count = count_of_rooms)
//   standard rate   -> rate plan, sold per unit, one price for up to N guests
//   derived rate    -> rate plan following the standard one, N% or N less
//   house policies  -> hotel policy
// ---------------------------------------------------------------------------

// The parts of a publish, in the order they are sent. The broker sees one
// line for each ("Property", "Unit types", "Rates", "House policy",
// "Photos and content").
export const SYNC_STAGES = ["property", "units", "rates", "policy", "content"] as const;
export type SyncStage = (typeof SYNC_STAGES)[number];

export function isSyncStage(value: unknown): value is SyncStage {
  return typeof value === "string" && (SYNC_STAGES as readonly string[]).includes(value);
}

// How many days ahead prices and availability are opened, as Channex keeps
// them (its default inventory length).
export const SELL_DAYS = 500;

// A publish that has said nothing for this long is treated as stopped, so the
// broker can retry.
export const SYNC_STALE_MS = 3 * 60 * 1000;

export type SourceRate = {
  id: string;
  channexId: string | null;
  name: string;
  price: number;
  guests: number;
  childFee: number;
  infantFee: number;
  meals: string;
  minStay: number;
  maxStay: number;
  closedToArrival: number[];
  parentId: string | null;
  adjustment: string | null;
  adjustValue: number | null;
};

export type SourceUnit = {
  id: string;
  channexId: string | null;
  name: string;
  count: number;
  adults: number;
  children: number;
  infants: number;
  rates: SourceRate[];
};

export type SourceProperty = {
  channexId: string | null;
  nickname: string;
  titleEn: string;
  email: string;
  phone: string;
  currency: string;
  countryIso2: string;
  cityName: string;
  address: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  channexType: string;
  website: string;
  descriptionEn: string;
  importantInfo: string;
  checkInTime: string;
  checkOutTime: string;
  maxGuests: number | null;
  adultsOnly: boolean;
  internetType: string;
  internetCoverage: string;
  internetCost: number | null;
  parkingType: string;
  parkingReservation: string;
  parkingPrivate: boolean;
  petsPolicy: string;
  petFee: number;
  petDeposit: number;
  smokingPolicy: string;
  units: SourceUnit[];
};

const money = (n: number) => n.toFixed(2);
// Empty text is left out rather than sent, so Channex keeps its own default.
const text = (s: string) => (s.trim() ? s.trim() : undefined);

export function propertyPayload(p: SourceProperty, groupId: string | null) {
  return {
    title: p.titleEn.trim() || p.nickname.trim(),
    currency: p.currency,
    email: text(p.email),
    phone: text(p.phone),
    zip_code: text(p.postalCode),
    country: text(p.countryIso2),
    city: text(p.cityName),
    address: text(p.address),
    latitude: p.latitude === null ? undefined : String(p.latitude),
    longitude: p.longitude === null ? undefined : String(p.longitude),
    timezone: text(p.timezone),
    property_type: p.channexType,
    website: text(p.website),
    // Omnirent has one minimum stay, counted from the arrival day.
    min_stay_type: "arrival",
    // Only a new property is placed in a group; Channex refuses it on update.
    ...(p.channexId || !groupId ? {} : { group_id: groupId }),
  };
}

export function contentPayload(p: SourceProperty, policyId: string) {
  return {
    hotel_policy_id: policyId,
    content: {
      // Channels get the English description; the Arabic one stays in Omnirent.
      description: text(p.descriptionEn) ?? null,
      important_information: text(p.importantInfo) ?? null,
    },
  };
}

export function roomTypePayload(u: SourceUnit, propertyId: string) {
  return {
    property_id: propertyId,
    title: u.name.trim(),
    count_of_rooms: u.count,
    occ_adults: u.adults,
    occ_children: u.children,
    occ_infants: u.infants,
    default_occupancy: u.adults,
    room_kind: "room",
  };
}

// 1 = Monday ... 7 = Sunday in Omnirent; Channex takes seven values, Monday first.
export function weekFlags(days: number[]): boolean[] {
  return [1, 2, 3, 4, 5, 6, 7].map((d) => days.includes(d));
}

function occupancy(r: SourceRate, u: SourceUnit) {
  return Math.max(1, Math.min(r.guests, u.adults));
}

export function standardRatePayload(r: SourceRate, u: SourceUnit, ids: { propertyId: string; roomTypeId: string }, currency: string) {
  return {
    property_id: ids.propertyId,
    room_type_id: ids.roomTypeId,
    title: r.name.trim(),
    currency,
    sell_mode: "per_room",
    rate_mode: "manual",
    meal_type: r.meals,
    children_fee: money(r.childFee),
    infant_fee: money(r.infantFee),
    min_stay_arrival: r.minStay,
    max_stay: r.maxStay,
    closed_to_arrival: weekFlags(r.closedToArrival),
    options: [{ occupancy: occupancy(r, u), is_primary: true, rate: money(r.price) }],
  };
}

// A derived rate follows its standard rate's price (less N% or N), minimum
// stay and closed days, so changing the standard rate is enough.
export function derivedRatePayload(
  r: SourceRate,
  u: SourceUnit,
  ids: { propertyId: string; roomTypeId: string; parentId: string },
  currency: string,
) {
  const rule = r.adjustment === "decrease_amount" ? "decrease_by_amount" : "decrease_by_percent";
  return {
    property_id: ids.propertyId,
    room_type_id: ids.roomTypeId,
    parent_rate_plan_id: ids.parentId,
    title: r.name.trim(),
    currency,
    sell_mode: "per_room",
    rate_mode: "derived",
    meal_type: r.meals,
    inherit_rate: true,
    inherit_min_stay_arrival: true,
    inherit_max_stay: true,
    inherit_closed_to_arrival: true,
    inherit_closed_to_departure: true,
    inherit_stop_sell: true,
    options: [
      {
        occupancy: occupancy(r, u),
        is_primary: true,
        derived_option: { rate: [[rule, money(r.adjustValue ?? 0)]] },
      },
    ],
  };
}

const PETS: Record<string, string> = { not_allowed: "not_allowed", allowed: "allowed", by_arrangement: "by_arrangements" };
const SMOKING: Record<string, string> = { no_smoking: "no_smoking", designated_areas: "permitted_areas_only", allowed: "allowed" };

export function policyPayload(p: SourceProperty, propertyId: string) {
  // Without a set maximum, as many guests as every unit sleeps.
  const sleeps = p.units.reduce((n, u) => n + u.adults * u.count, 0);
  const internet = p.internetType === "wifi" || p.internetType === "wired";
  const petsAllowed = p.petsPolicy !== "not_allowed";
  return {
    property_id: propertyId,
    title: "House policy",
    currency: p.currency,
    max_count_of_guests: Math.max(1, p.maxGuests ?? sleeps),
    is_adults_only: p.adultsOnly,
    checkin_from_time: p.checkInTime,
    checkin_to_time: "23:59",
    checkout_from_time: "00:00",
    checkout_to_time: p.checkOutTime,
    internet_access_type: internet ? p.internetType : "none",
    internet_access_coverage: internet ? p.internetCoverage : null,
    internet_access_cost: internet && p.internetCost !== null && p.internetCost > 0 ? money(p.internetCost) : null,
    parking_type: p.parkingType,
    parking_reservation: p.parkingType === "none" ? "not_available" : p.parkingReservation,
    parking_is_private: p.parkingType === "none" ? null : p.parkingPrivate,
    pets_policy: PETS[p.petsPolicy] ?? "not_allowed",
    pets_non_refundable_fee: petsAllowed && p.petFee > 0 ? money(p.petFee) : null,
    pets_refundable_deposit: petsAllowed && p.petDeposit > 0 ? money(p.petDeposit) : null,
    smoking_policy: SMOKING[p.smokingPolicy] ?? "no_smoking",
  };
}

// Prices and availability for the next SELL_DAYS days, sent once when a unit
// type or rate is first published. Later changes go through the calendar.
export function sellWindow(today: Date): { date_from: string; date_to: string } {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const last = new Date(today.getTime() + (SELL_DAYS - 1) * 24 * 60 * 60 * 1000);
  return { date_from: day(today), date_to: day(last) };
}

// ---------------------------------------------------------------------------
// Why a publish failed, in words the broker can act on.
// ---------------------------------------------------------------------------

export type SyncError = {
  // The Omnirent field Channex refused, when it named one.
  field?: SyncField;
  // What the broker had typed there.
  value?: string;
  // Channex's own words (English), kept for the support team.
  message?: string;
  // Nothing was refused: Channex didn't answer, or answered with an error.
  kind?: "unreachable" | "refused";
};

export const SYNC_FIELDS = ["title", "email", "phone", "postalCode", "address", "city", "country", "timezone", "website", "unitName", "rateName", "price", "guests"] as const;
export type SyncField = (typeof SYNC_FIELDS)[number];

// Channex field name -> Omnirent field, for each part.
const FIELD_MAP: Record<SyncStage, Record<string, SyncField>> = {
  property: {
    title: "title",
    email: "email",
    phone: "phone",
    zip_code: "postalCode",
    address: "address",
    city: "city",
    country: "country",
    timezone: "timezone",
    website: "website",
  },
  units: { title: "unitName", occ_adults: "guests" },
  rates: { title: "rateName", rate: "price", options: "price", occupancy: "guests" },
  policy: { max_count_of_guests: "guests" },
  content: {},
};

// The value the broker typed for a field, to quote back to them.
function typedValue(field: SyncField, p: SourceProperty): string | undefined {
  const values: Partial<Record<SyncField, string>> = {
    title: p.titleEn,
    email: p.email,
    phone: p.phone,
    postalCode: p.postalCode,
    address: p.address,
    city: p.cityName,
    website: p.website,
  };
  return values[field];
}

// Turns a Channex error answer into a SyncError. `status` is the HTTP status;
// `body` is the parsed answer, if any.
export function describeFailure(stage: SyncStage, status: number, body: unknown, p: SourceProperty): SyncError {
  if (status === 0 || status === 429 || status >= 500) return { kind: "unreachable" };
  const details = (body as { errors?: { details?: unknown } } | null)?.errors?.details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    for (const [key, messages] of Object.entries(details as Record<string, unknown>)) {
      const message = Array.isArray(messages) ? messages.map(String).join("; ") : String(messages);
      // Nested keys look like "options.0.rate" or "property.phone".
      const parts = key.split(".");
      const field = parts.map((k) => FIELD_MAP[stage][k]).find(Boolean);
      if (field) return { field, value: typedValue(field, p), message };
      return { kind: "refused", message: `${key}: ${message}` };
    }
  }
  const title = (body as { errors?: { title?: unknown; details?: unknown } } | null)?.errors;
  const message = typeof title?.details === "string" ? title.details : typeof title?.title === "string" ? title.title : undefined;
  return { kind: "refused", message };
}

export function readSyncError(value: unknown): SyncError | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const field = (SYNC_FIELDS as readonly string[]).includes(String(v.field)) ? (v.field as SyncField) : undefined;
  const kind = v.kind === "unreachable" || v.kind === "refused" ? v.kind : undefined;
  return {
    field,
    kind,
    value: typeof v.value === "string" ? v.value : undefined,
    message: typeof v.message === "string" ? v.message : undefined,
  };
}

// What each line of the "Channel sync" list shows, from the property's state.
export type StageState = "done" | "sending" | "waiting" | "failed" | "notSynced";

export function stageStates(status: string, stage: string | null): Record<SyncStage, StageState> {
  const at = isSyncStage(stage) ? SYNC_STAGES.indexOf(stage) : -1;
  const out = {} as Record<SyncStage, StageState>;
  SYNC_STAGES.forEach((s, i) => {
    if (status === "SYNCED") out[s] = "done";
    else if (status === "SYNCING") out[s] = i < at ? "done" : i === at ? "sending" : "waiting";
    else if (status === "SYNC_FAILED") out[s] = i < at ? "done" : i === at ? "failed" : "waiting";
    else out[s] = "notSynced";
  });
  return out;
}
