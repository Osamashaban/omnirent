import type { Lang } from "@/lib/i18n";
import type { PropertyDict } from "@/lib/property-i18n";
import type { FormErrors, PropertyForm } from "@/lib/property-rules";

// What the wizard can offer, loaded on the server.
export type WizardOptions = {
  types: { id: string; nameAr: string; nameEn: string }[];
  mostUsed: string[]; // type ids, most used first
  countries: { id: string; nameAr: string; nameEn: string; currency: string; timezone: string; cities: { id: string; nameAr: string; nameEn: string }[] }[];
};

export type StepProps = {
  form: PropertyForm;
  update: (change: (f: PropertyForm) => PropertyForm) => void;
  errors: FormErrors;
  p: PropertyDict;
  lang: Lang;
  options: WizardOptions;
  // Rates are saved: the currency can't change any more.
  ratesSaved: boolean;
  goTo: (step: number) => void;
};
