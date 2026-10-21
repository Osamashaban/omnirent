// ---------------------------------------------------------------------------
// The rules for Settings › Property types, kept apart from the database so
// tests can check them directly.
// ---------------------------------------------------------------------------

import { billingFor, editedChannelNames, isChannexType } from "./channex-catalog.ts";

export const GROUPS = ["APARTMENTS", "HOTELS"] as const;
export const RENT_MODES = ["WHOLE", "ROOMS", "BOTH"] as const;
export const STATUSES = ["ACTIVE", "HIDDEN", "ARCHIVED"] as const;

export type Group = (typeof GROUPS)[number];
export type RentMode = (typeof RENT_MODES)[number];
export type Status = (typeof STATUSES)[number];

export type PropertyTypeInput = {
  nameAr: string;
  nameEn: string;
  group: string;
  channexType: string;
  rentMode: string;
  visible: boolean;
  channelNames: Record<string, string>;
};

export type PropertyTypeErrors = {
  nameAr?: "enterArabicName" | "typeExists";
  nameEn?: "enterEnglishName" | "typeExists";
  channexType?: "chooseChannexType";
};

type Existing = { id: string; nameAr: string; nameEn: string };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function checkPropertyType(
  input: PropertyTypeInput,
  others: readonly Existing[],
  editingId: string | null,
): { errors: PropertyTypeErrors; duplicateAr?: Existing; duplicateEn?: Existing } {
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  const rest = others.filter((o) => o.id !== editingId);
  const errors: PropertyTypeErrors = {};
  const duplicateAr = nameAr ? rest.find((o) => same(o.nameAr, nameAr)) : undefined;
  const duplicateEn = nameEn ? rest.find((o) => same(o.nameEn, nameEn)) : undefined;
  if (!nameAr) errors.nameAr = "enterArabicName";
  else if (duplicateAr) errors.nameAr = "typeExists";
  if (!nameEn) errors.nameEn = "enterEnglishName";
  else if (duplicateEn) errors.nameEn = "typeExists";
  if (!isChannexType(input.channexType)) errors.channexType = "chooseChannexType";
  return { errors, duplicateAr, duplicateEn };
}

// Hotel-type Channex values are billed per property and can't be rented as a
// whole unit, so picking one moves "Whole unit" to "Rooms" (as the design does).
export function rentModeFor(channexType: string, mode: RentMode): RentMode {
  return billingFor(channexType) === "property" && mode === "WHOLE" ? "ROOMS" : mode;
}

// What gets stored, from a valid form.
export function cleanPropertyType(input: PropertyTypeInput) {
  const group: Group = (GROUPS as readonly string[]).includes(input.group) ? (input.group as Group) : "APARTMENTS";
  const mode: RentMode = (RENT_MODES as readonly string[]).includes(input.rentMode) ? (input.rentMode as RentMode) : "WHOLE";
  return {
    nameAr: input.nameAr.trim().slice(0, 80),
    nameEn: input.nameEn.trim().slice(0, 80),
    group,
    channexType: input.channexType,
    rentMode: rentModeFor(input.channexType, mode),
    channelNames: editedChannelNames(input.channexType, input.channelNames),
  };
}

// Saving keeps an archived type archived; otherwise the switch decides.
export function statusAfterSave(current: Status | null, visible: boolean): Status {
  if (current === "ARCHIVED") return "ARCHIVED";
  return visible ? "ACTIVE" : "HIDDEN";
}

// Monthly Channex cost for one listing of this type, for the cost card.
export function costExamples(channexType: string) {
  return billingFor(channexType) === "property"
    ? { billing: "property" as const, examples: [7, 21] }
    : { billing: "unit" as const, examples: [0.5, 2] };
}
