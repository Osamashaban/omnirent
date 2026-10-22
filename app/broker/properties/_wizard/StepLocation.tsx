"use client";

import { Info } from "@/components/ops/icons";
import { Card, Field, Grid, NumberInput, Select, TextInput, fieldInput } from "./fields";
import type { StepProps } from "./types";

// Step 2: country, city, compound and address; coordinates and time zone.
// The map to drag the pin waits for the map provider to be chosen; the
// coordinates can be typed meanwhile.
export function StepLocation({ form, update, errors, p, lang, options, ratesSaved }: StepProps) {
  const set = (patch: Partial<typeof form>) => update((f) => ({ ...f, ...patch }));
  const name = (x: { nameAr: string; nameEn: string }) => (lang === "ar" ? x.nameAr : x.nameEn);
  const country = options.countries.find((c) => c.id === form.countryId);
  return (
    <>
      <Card title={p.address}>
        <Grid>
          <Field id="countryId" label={p.country} required hint={p.countryHint} error={errors.countryId} p={p}>
            <Select
              id="countryId"
              value={form.countryId}
              error={errors.countryId}
              onChange={(v) => {
                const c = options.countries.find((x) => x.id === v);
                // A new country clears the city and brings its currency, unless rates exist.
                update((f) => ({ ...f, countryId: v, cityId: "", currency: c && !ratesSaved ? c.currency : f.currency }));
              }}
              options={[{ value: "", label: p.chooseCountry }, ...options.countries.map((c) => ({ value: c.id, label: name(c) }))]}
            />
          </Field>
          <Field id="cityId" label={p.city} required hint={p.cityHint} error={errors.cityId} p={p}>
            <Select
              id="cityId"
              value={form.cityId}
              error={errors.cityId}
              disabled={!country}
              onChange={(v) => set({ cityId: v })}
              options={[{ value: "", label: country ? p.chooseCity : p.chooseCountryFirst }, ...(country?.cities ?? []).map((c) => ({ value: c.id, label: name(c) }))]}
            />
          </Field>
          <Field id="compound" label={p.compound} hint={p.compoundHint} error={errors.compound} p={p}>
            <TextInput id="compound" value={form.compound} onChange={(v) => set({ compound: v })} error={errors.compound} maxLength={120} placeholder={p.compoundPlaceholder} />
          </Field>
          <Field id="postalCode" label={p.postalCode} error={errors.postalCode} p={p}>
            <TextInput id="postalCode" dir="ltr" value={form.postalCode} onChange={(v) => set({ postalCode: v })} error={errors.postalCode} maxLength={20} />
          </Field>
          <Field id="address" label={p.street} required error={errors.address} p={p} className="min-[700px]:col-span-2">
            <TextInput id="address" value={form.address} onChange={(v) => set({ address: v })} error={errors.address} maxLength={255} />
          </Field>
        </Grid>
        <p className="m-0 flex items-center gap-2 text-[13px] text-[#4B5563]">
          <Info size={14} className="flex-none" />
          {p.geoNote}
        </p>
      </Card>

      <Card title={p.mapLocation} body={p.mapBody}>
        <Grid>
          <Field id="latitude" label={p.latitude} error={errors.latitude} p={p}>
            <NumberInput id="latitude" value={form.latitude} onChange={(v) => set({ latitude: v })} error={errors.latitude} placeholder="30.9012" />
          </Field>
          <Field id="longitude" label={p.longitude} error={errors.longitude} p={p}>
            <NumberInput id="longitude" value={form.longitude} onChange={(v) => set({ longitude: v })} error={errors.longitude} placeholder="28.6431" />
          </Field>
          <Field id="timezone" label={p.timezone} hint={p.timezoneHint} p={p} className="min-[700px]:col-span-2">
            <input id="timezone" readOnly value={country?.timezone ?? "—"} dir="ltr" className={`${fieldInput} bg-[#F9FAFB]`} />
          </Field>
        </Grid>
      </Card>
    </>
  );
}
