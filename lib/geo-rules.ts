// ---------------------------------------------------------------------------
// The rules for Settings › Countries & cities, kept apart from the database so
// tests can check them directly.
//
// Names are unique ignoring case (and surrounding spaces): "egypt" clashes with
// "Egypt". A city's name only has to be unique inside its own country.
// ---------------------------------------------------------------------------

// The choices the design offers in the country form.
export const CURRENCIES = ["EGP", "SAR", "AED", "MAD", "USD"] as const;
export const TIMEZONES = ["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Africa/Casablanca"] as const;

export type CountryInput = {
  nameAr: string;
  nameEn: string;
  iso2: string;
  dialCode: string;
  currency: string;
  timezone: string;
  visible: boolean;
};

export type CountryErrors = {
  nameAr?: "enterArabicName" | "countryExists";
  nameEn?: "enterEnglishName" | "countryExists";
  iso2?: "enterIso" | "isoTaken";
  dialCode?: "enterDialCode";
  currency?: "chooseCurrency";
  timezone?: "chooseTimezone";
};

type Named = { id: string; nameAr: string; nameEn: string };
type ExistingCountry = Named & { iso2: string };

export const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Trims the form values and puts codes in their stored form.
export function cleanCountry(input: CountryInput): CountryInput {
  return {
    nameAr: input.nameAr.trim().slice(0, 80),
    nameEn: input.nameEn.trim().slice(0, 80),
    iso2: input.iso2.trim().toUpperCase(),
    dialCode: input.dialCode.trim(),
    currency: input.currency,
    timezone: input.timezone,
    visible: input.visible,
  };
}

export function checkCountry(input: CountryInput, others: readonly ExistingCountry[], editingId: string | null): CountryErrors {
  const c = cleanCountry(input);
  const rest = others.filter((o) => o.id !== editingId);
  const e: CountryErrors = {};
  if (!c.nameAr) e.nameAr = "enterArabicName";
  else if (rest.some((o) => same(o.nameAr, c.nameAr))) e.nameAr = "countryExists";
  if (!c.nameEn) e.nameEn = "enterEnglishName";
  else if (rest.some((o) => same(o.nameEn, c.nameEn))) e.nameEn = "countryExists";
  if (!/^[A-Z]{2}$/.test(c.iso2)) e.iso2 = "enterIso";
  else if (rest.some((o) => o.iso2 === c.iso2)) e.iso2 = "isoTaken";
  if (!/^\+\d{1,4}$/.test(c.dialCode)) e.dialCode = "enterDialCode";
  if (!(CURRENCIES as readonly string[]).includes(c.currency)) e.currency = "chooseCurrency";
  if (!(TIMEZONES as readonly string[]).includes(c.timezone)) e.timezone = "chooseTimezone";
  return e;
}

export type CityInput = { nameAr: string; nameEn: string; visible: boolean };

export type CityErrors = {
  nameAr?: "enterArabicName";
  nameEn?: "enterEnglishName" | "cityExists";
};

// The duplicate is reported on the English name, as the design does, and
// named so the message can say which city already exists.
export function checkCity(
  input: CityInput,
  citiesInCountry: readonly Named[],
  editingId: string | null,
): { errors: CityErrors; duplicate?: Named } {
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  const errors: CityErrors = {};
  if (!nameAr) errors.nameAr = "enterArabicName";
  if (!nameEn) errors.nameEn = "enterEnglishName";
  if (errors.nameAr || errors.nameEn) return { errors };
  const duplicate = citiesInCountry.find((c) => c.id !== editingId && (same(c.nameAr, nameAr) || same(c.nameEn, nameEn)));
  if (duplicate) errors.nameEn = "cityExists";
  return { errors, duplicate };
}

// What happens when someone clicks Hide, Show or Delete on a city or country.
// "confirm" opens a dialog first, "blocked" explains why it can't be done.
export function hideNeedsConfirm(visible: boolean, propertyCount: number): boolean {
  return visible && propertyCount > 0;
}

export function cityDeleteCheck(propertyCount: number): "confirm" | "blocked" {
  return propertyCount > 0 ? "blocked" : "confirm";
}
