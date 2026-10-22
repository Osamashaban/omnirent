"use client";

import { useEffect } from "react";
import {
  ADJUSTMENTS,
  CANCELLATION_POLICIES,
  MEALS,
  capacityOf,
  derivedPrice,
  formatMoney,
  parseNumber,
  pricedUnits,
  type PropertyForm,
  type RateForm,
} from "@/lib/property-rules";
import { Lock } from "@/components/ops/icons";
import { Card, Field, Grid, NumberInput, RadioCard, Select, TextInput, Toggle } from "./fields";
import type { StepProps } from "./types";

// Step 4: one standard rate per unit type (and the whole apartment in "Both"
// mode), with an optional non-refundable rate that follows it. Pricing per
// guest count isn't designed yet, so only "Price per unit" can be picked.
export function StepPricing({ form, update, errors, p, lang }: StepProps) {
  const units = pricedUnits(form);

  // "Guests for this price" starts at what the unit sleeps.
  useEffect(() => {
    update((f) => fillGuests(f));
  }, [update]);

  const setRate = (key: string, patch: Partial<RateForm>) =>
    update((f) => {
      if (key === "whole") return { ...f, whole: { ...f.whole, rate: { ...f.whole.rate, ...patch } } };
      const i = Number(key.split(".")[1]);
      return { ...f, units: f.units.map((u, j) => (j === i ? { ...u, rate: { ...u.rate, ...patch } } : u)) };
    });
  const policyName = p.policies[form.cancellationPolicy]?.[0] ?? "";

  return (
    <>
      {units.map(({ key, unit }) => {
        const r = unit.rate;
        const k = `${key}.rate`;
        const e = (f: string) => errors[`${k}.${f}`];
        const heading = key === "whole" ? p.wholeApartment : form.rentMode === "WHOLE" ? `${unit.name} × ${unit.count || 1}` : unit.name;
        const price = parseNumber(r.price) ?? 0;
        const value = parseNumber(r.adjustValue) ?? 0;
        const percent = r.adjustment !== "decrease_amount";
        return (
          <Card key={key} title={heading}>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[13px]">
                <span className="font-semibold">{p.pricingMethod}</span>
                <span className="flex items-center gap-1 text-[#6B7280]">
                  <Lock size={13} />
                  {p.cantChange}
                </span>
              </span>
              <div className="grid grid-cols-1 gap-2 min-[700px]:grid-cols-2">
                <RadioCard name={`${k}.method`} checked onChange={() => {}} label={p.perUnit[0]} description={p.perUnit[1]} />
                <RadioCard name={`${k}.method`} checked={false} disabled onChange={() => {}} label={p.perGuest[0]} description={p.perGuest[1]} />
              </div>
            </div>
            <Grid cols={3}>
              <Field id={`${k}.name`} label={p.rateName} required error={e("name")} p={p}>
                <TextInput id={`${k}.name`} value={r.name} onChange={(v) => setRate(key, { name: v })} error={e("name")} maxLength={80} />
              </Field>
              <Field id={`${k}.price`} label={p.pricePerNight} required error={e("price")} p={p}>
                <NumberInput id={`${k}.price`} value={r.price} onChange={(v) => setRate(key, { price: v })} error={e("price")} suffix={form.currency} maxLength={14} />
              </Field>
              <Field id={`${k}.guests`} label={p.guestsForPrice} required hint={p.upToCapacity(capacityOf(unit))} error={e("guests")} p={p}>
                <NumberInput id={`${k}.guests`} value={r.guests} onChange={(v) => setRate(key, { guests: v })} error={e("guests")} inputMode="numeric" maxLength={4} />
              </Field>
              <Field id={`${k}.childFee`} label={p.childFee} error={e("childFee")} p={p}>
                <NumberInput id={`${k}.childFee`} value={r.childFee} onChange={(v) => setRate(key, { childFee: v })} error={e("childFee")} suffix={form.currency} maxLength={14} />
              </Field>
              <Field id={`${k}.infantFee`} label={p.infantFee} error={e("infantFee")} p={p}>
                <NumberInput id={`${k}.infantFee`} value={r.infantFee} onChange={(v) => setRate(key, { infantFee: v })} error={e("infantFee")} suffix={form.currency} maxLength={14} />
              </Field>
              <Field id={`${k}.meals`} label={p.meals} error={e("meals")} p={p}>
                <Select id={`${k}.meals`} value={r.meals} onChange={(v) => setRate(key, { meals: v })} options={MEALS.map((m) => ({ value: m, label: p.mealOptions[m] }))} />
              </Field>
              <Field id={`${k}.minStay`} label={p.minStay} required hint={p.minStayHint} error={e("minStay")} p={p}>
                <NumberInput id={`${k}.minStay`} value={r.minStay} onChange={(v) => setRate(key, { minStay: v })} error={e("minStay")} suffix={p.nightsUnit} inputMode="numeric" maxLength={4} />
              </Field>
              <Field id={`${k}.maxStay`} label={p.maxStay} hint={p.maxStayHint} error={e("maxStay")} p={p}>
                <NumberInput id={`${k}.maxStay`} value={r.maxStay} onChange={(v) => setRate(key, { maxStay: v })} error={e("maxStay")} suffix={p.nightsUnit} inputMode="numeric" maxLength={4} />
              </Field>
              <Field id={`${k}.cancellationPolicy`} label={p.cancellationPolicy} error={e("cancellationPolicy")} p={p}>
                <Select
                  id={`${k}.cancellationPolicy`}
                  value={r.cancellationPolicy}
                  onChange={(v) => setRate(key, { cancellationPolicy: v })}
                  options={[{ value: "", label: p.sameAsProperty(policyName) }, ...CANCELLATION_POLICIES.map((c) => ({ value: c, label: p.policies[c][0] }))]}
                />
              </Field>
            </Grid>

            <details className="group rounded-[10px] border border-[#E5E7EB] bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="text-[10px] transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">▶</span>
                {p.weekdayRestrictions}
              </summary>
              <div className="flex flex-col gap-2.5 px-3.5 pb-3.5">
                <span className="text-[13px] text-[#374151]">{p.closedToArrival}</span>
                <div className="flex flex-wrap gap-2">
                  {p.weekdays.map((label, d) => {
                    const day = d + 1;
                    const on = r.closedToArrival.includes(day);
                    return (
                      <label
                        key={day}
                        className={`flex h-9 min-w-11 cursor-pointer items-center justify-center rounded-lg px-2 text-[13px] font-semibold ${
                          on ? "border-[1.5px] border-[#639922] bg-[#EAF3DE] text-[#27500A]" : "border border-[#D1D5DB] bg-white text-[#374151]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={() =>
                            setRate(key, { closedToArrival: on ? r.closedToArrival.filter((x) => x !== day) : [...r.closedToArrival, day].sort() })
                          }
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </details>

            {key !== "whole" && (
              <div className="flex flex-col gap-4 rounded-[10px] bg-[#F9FAFB] p-4">
                <Toggle id={`${k}.derived`} checked={r.derived} onChange={(v) => setRate(key, { derived: v })} label={p.addNonRefundable} description={p.addNonRefundableBody} />
                {r.derived && (
                  <>
                    <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-[1.1fr_1fr_0.5fr]">
                      <Field id={`${k}.derivedName`} label={p.rateName} error={e("derivedName")} p={p}>
                        <TextInput id={`${k}.derivedName`} value={r.derivedName} onChange={(v) => setRate(key, { derivedName: v })} error={e("derivedName")} maxLength={80} />
                      </Field>
                      <Field id={`${k}.adjustment`} label={p.adjustment} error={e("adjustment")} p={p}>
                        <Select id={`${k}.adjustment`} value={r.adjustment} onChange={(v) => setRate(key, { adjustment: v })} options={ADJUSTMENTS.map((a) => ({ value: a, label: p.adjustments[a] }))} />
                      </Field>
                      <Field id={`${k}.adjustValue`} label={p.value} error={e("adjustValue")} p={p}>
                        <NumberInput id={`${k}.adjustValue`} value={r.adjustValue} onChange={(v) => setRate(key, { adjustValue: v })} error={e("adjustValue")} suffix={percent ? "%" : form.currency} maxLength={14} />
                      </Field>
                    </div>
                    <span className="text-[13px] text-[#4B5563]">{p.derivedLine(formatMoney(derivedPrice(price, r.adjustment, value), form.currency, lang))}</span>
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </>
  );
}

function fillGuests(f: PropertyForm): PropertyForm {
  // Until a price is entered the rate hasn't been filled in, so the guest
  // count follows the unit's size (earlier steps may have saved a default).
  const fill = <U extends PropertyForm["whole"]>(u: U): U => {
    const cap = capacityOf(u);
    if (!cap || (u.rate.guests.trim() && u.rate.price.trim()) || u.rate.guests.trim() === String(cap)) return u;
    return { ...u, rate: { ...u.rate, guests: String(cap) } };
  };
  const units = f.units.map(fill);
  const whole = f.rentMode === "BOTH" ? fill(f.whole) : f.whole;
  return units.every((u, i) => u === f.units[i]) && whole === f.whole ? f : { ...f, units, whole };
}
