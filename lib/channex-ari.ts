// Prices, restrictions and availability ("ARI") sent to Channex for chosen
// dates. Channex allows 20 of these calls a minute in total and 10 a minute per
// property for each kind, so callers send many dates in one call, and a
// "slow down" answer (429) is waited out and tried again.

import { channex, ChannexError } from "@/lib/channex";

export type RestrictionValue = {
  property_id: string;
  rate_plan_id: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  days?: ("mo" | "tu" | "we" | "th" | "fr" | "sa" | "su")[];
  rate?: string;
  min_stay_arrival?: number;
  max_stay?: number;
  closed_to_arrival?: boolean;
  closed_to_departure?: boolean;
  stop_sell?: boolean;
};

export type AvailabilityValue = {
  property_id: string;
  room_type_id: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  days?: ("mo" | "tu" | "we" | "th" | "fr" | "sa" | "su")[];
  availability: number;
};

const RETRIES = 3;

async function post(path: string, values: unknown[]): Promise<void> {
  if (!values.length) return;
  for (let attempt = 0; ; attempt++) {
    try {
      await channex("POST", path, { values });
      return;
    } catch (err) {
      if (err instanceof ChannexError && err.status === 429 && attempt < RETRIES) {
        // Channex counts per minute; wait a little longer each time.
        await new Promise((r) => setTimeout(r, 5_000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export function pushRestrictions(values: RestrictionValue[]): Promise<void> {
  return post("/restrictions", values);
}

export function pushAvailability(values: AvailabilityValue[]): Promise<void> {
  return post("/availability", values);
}

// Both kinds for one property (its Channex id), availability first.
export async function pushAri(
  channexPropertyId: string,
  changes: { restrictions?: Omit<RestrictionValue, "property_id">[]; availability?: Omit<AvailabilityValue, "property_id">[] },
): Promise<void> {
  await pushAvailability((changes.availability ?? []).map((v) => ({ ...v, property_id: channexPropertyId })));
  await pushRestrictions((changes.restrictions ?? []).map((v) => ({ ...v, property_id: channexPropertyId })));
}
