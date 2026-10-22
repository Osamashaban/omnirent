"use client";

import {
  CANCELLATION_POLICIES,
  INTERNET_COVERAGE,
  INTERNET_TYPES,
  PARKING_RESERVATION,
  PARKING_TYPES,
  PETS_POLICIES,
  SMOKING_POLICIES,
} from "@/lib/property-rules";
import { Card, Field, Grid, NumberInput, RadioCard, Select, TextInput, Toggle } from "./fields";
import type { StepProps } from "./types";

// Step 5: the default cancellation policy, check-in and guests, internet,
// parking, pets and smoking. "Create a custom policy" isn't designed yet.
export function StepPolicies({ form, update, errors, p }: StepProps) {
  const set = (patch: Partial<typeof form>) => update((f) => ({ ...f, ...patch }));
  const opts = (list: readonly string[], names: Record<string, string>) => list.map((v) => ({ value: v, label: names[v] }));
  return (
    <>
      <Card title={p.defaultCancellation} body={p.defaultCancellationBody}>
        <div role="radiogroup" aria-label={p.defaultCancellation} className="grid grid-cols-1 gap-2 min-[700px]:grid-cols-4">
          {CANCELLATION_POLICIES.map((c) => (
            <RadioCard
              key={c}
              name="cancellationPolicy"
              checked={form.cancellationPolicy === c}
              onChange={() => set({ cancellationPolicy: c })}
              label={p.policies[c][0]}
              description={p.policies[c][1]}
            />
          ))}
        </div>
      </Card>

      <Card title={p.checkInGuests}>
        <Grid cols={3}>
          <Field id="checkInTime" label={p.checkIn} required error={errors.checkInTime} p={p}>
            <TextInput id="checkInTime" type="time" dir="ltr" value={form.checkInTime} onChange={(v) => set({ checkInTime: v })} error={errors.checkInTime} />
          </Field>
          <Field id="checkOutTime" label={p.checkOut} required error={errors.checkOutTime} p={p}>
            <TextInput id="checkOutTime" type="time" dir="ltr" value={form.checkOutTime} onChange={(v) => set({ checkOutTime: v })} error={errors.checkOutTime} />
          </Field>
          <Field id="maxGuests" label={p.maxGuests} required error={errors.maxGuests} p={p}>
            <NumberInput id="maxGuests" value={form.maxGuests} onChange={(v) => set({ maxGuests: v })} error={errors.maxGuests} inputMode="numeric" maxLength={4} />
          </Field>
        </Grid>
        <Toggle id="adultsOnly" checked={form.adultsOnly} onChange={(v) => set({ adultsOnly: v })} label={p.adultsOnly} />
      </Card>

      <Card title={p.internet}>
        <Grid cols={3}>
          <Field id="internetType" label={p.type} required error={errors.internetType} p={p}>
            <Select id="internetType" value={form.internetType} onChange={(v) => set({ internetType: v })} error={errors.internetType} options={opts(INTERNET_TYPES, p.internetTypes)} />
          </Field>
          <Field id="internetCoverage" label={p.coverage} required error={errors.internetCoverage} p={p}>
            <Select id="internetCoverage" value={form.internetCoverage} onChange={(v) => set({ internetCoverage: v })} error={errors.internetCoverage} options={opts(INTERNET_COVERAGE, p.internetCoverage)} />
          </Field>
          <Field id="internetCost" label={p.cost} hint={p.costHint} error={errors.internetCost} p={p}>
            <NumberInput id="internetCost" value={form.internetCost} onChange={(v) => set({ internetCost: v })} error={errors.internetCost} placeholder={p.free} suffix={form.internetCost ? form.currency : undefined} maxLength={14} />
          </Field>
        </Grid>
      </Card>

      <Card title={p.parking}>
        <Grid cols={3}>
          <Field id="parkingType" label={p.type} required error={errors.parkingType} p={p}>
            <Select id="parkingType" value={form.parkingType} onChange={(v) => set({ parkingType: v })} error={errors.parkingType} options={opts(PARKING_TYPES, p.parkingTypes)} />
          </Field>
          <Field id="parkingReservation" label={p.reservation} required error={errors.parkingReservation} p={p}>
            <Select id="parkingReservation" value={form.parkingReservation} onChange={(v) => set({ parkingReservation: v })} error={errors.parkingReservation} options={opts(PARKING_RESERVATION, p.parkingReservation)} />
          </Field>
          <Field id="parkingPrivate" label={p.privateParking} required p={p}>
            <Select
              id="parkingPrivate"
              value={form.parkingPrivate ? "yes" : "no"}
              onChange={(v) => set({ parkingPrivate: v === "yes" })}
              options={[{ value: "yes", label: p.yes }, { value: "no", label: p.no }]}
            />
          </Field>
        </Grid>
      </Card>

      <Card title={p.petsSmoking}>
        <Grid cols={4}>
          <Field id="petsPolicy" label={p.pets} required error={errors.petsPolicy} p={p}>
            <Select id="petsPolicy" value={form.petsPolicy} onChange={(v) => set({ petsPolicy: v })} error={errors.petsPolicy} options={opts(PETS_POLICIES, p.petsPolicies)} />
          </Field>
          <Field id="petFee" label={p.petFee} required error={errors.petFee} p={p}>
            <NumberInput id="petFee" value={form.petFee} onChange={(v) => set({ petFee: v })} error={errors.petFee} suffix={form.currency} maxLength={14} />
          </Field>
          <Field id="petDeposit" label={p.petDeposit} required error={errors.petDeposit} p={p}>
            <NumberInput id="petDeposit" value={form.petDeposit} onChange={(v) => set({ petDeposit: v })} error={errors.petDeposit} suffix={form.currency} maxLength={14} />
          </Field>
          <Field id="smokingPolicy" label={p.smoking} required error={errors.smokingPolicy} p={p}>
            <Select id="smokingPolicy" value={form.smokingPolicy} onChange={(v) => set({ smokingPolicy: v })} error={errors.smokingPolicy} options={opts(SMOKING_POLICIES, p.smokingPolicies)} />
          </Field>
        </Grid>
      </Card>
    </>
  );
}
