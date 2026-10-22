"use client";

import { useState } from "react";
import { MAX_TAXES, TAX_KINDS, TAX_LOGIC, blankTax, checkTax, formatMoney, parseNumber, type FormErrors, type TaxForm } from "@/lib/property-rules";
import { Drawer } from "@/components/ops/Overlay";
import { Pencil, Plus, Trash } from "@/components/ops/icons";
import { secondaryButtonClass, smallPrimaryButtonClass } from "@/components/ops/ui";
import { Receipt } from "@/components/broker/property-icons";
import { InfoBox } from "../parts";
import { Field, Grid, NumberInput, RadioCard, Select, TextInput } from "./fields";
import type { StepProps } from "./types";

// Step 6: taxes and fees, added one by one in the side drawer. The step can
// be skipped.
export function StepTaxes({ form, update, errors, p, lang }: StepProps) {
  const [editing, setEditing] = useState<{ index: number | null; tax: TaxForm } | null>(null);
  const save = (tax: TaxForm) =>
    update((f) => ({
      ...f,
      taxes: editing?.index === null || editing === null ? [...f.taxes, tax] : f.taxes.map((t, i) => (i === editing.index ? tax : t)),
    }));
  const amountText = (t: TaxForm) =>
    t.logic === "percent" ? `${t.amount}%` : formatMoney(parseNumber(t.amount) ?? 0, form.currency, lang);
  const add = () => setEditing({ index: null, tax: blankTax(p.cleaningFee) });

  return (
    <>
      {form.taxes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
            <Receipt />
          </span>
          <h2 className="m-0 text-[20px] font-bold">{p.noTaxes}</h2>
          <p className="m-0 max-w-[480px] text-[15px] leading-[1.7] text-[#4B5563]">{p.noTaxesBody}</p>
          <button type="button" onClick={add} className={secondaryButtonClass}>
            <Plus />
            {p.addTax}
          </button>
        </div>
      ) : (
        <section className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5 min-[900px]:p-6">
          <h2 className="m-0 text-[18px] font-bold">{p.taxesAndFees}</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {form.taxes.map((t, i) => {
              const bad = Object.keys(errors).some((k) => k.startsWith(`taxes.${i}.`));
              return (
                <li key={i} className={`flex items-center gap-3 rounded-[10px] border px-3.5 py-3 ${bad ? "border-[#DC2626]" : "border-[#E5E7EB]"}`}>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-semibold">{t.name}</span>
                    <span className="text-[13px] text-[#4B5563]">
                      {[p.taxKinds[t.kind], p.taxLogic[t.logic], amountText(t), t.inclusive ? p.inclusive.yes : p.inclusive.no].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <button type="button" aria-label={`${p.edit} ${t.name}`} onClick={() => setEditing({ index: i, tax: t })} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]">
                    <Pencil />
                  </button>
                  <button
                    type="button"
                    aria-label={`${p.remove} ${t.name}`}
                    onClick={() => update((f) => ({ ...f, taxes: f.taxes.filter((_, j) => j !== i) }))}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#DC2626] hover:bg-[#FEE2E2]"
                  >
                    <Trash />
                  </button>
                </li>
              );
            })}
          </ul>
          {form.taxes.length < MAX_TAXES && (
            <button type="button" onClick={add} className={`${secondaryButtonClass} self-start`}>
              <Plus />
              {p.addTax}
            </button>
          )}
        </section>
      )}
      {editing && <TaxDrawer p={p} currency={form.currency} initial={editing.tax} onClose={() => setEditing(null)} onSave={(t) => (save(t), setEditing(null))} />}
    </>
  );
}

function TaxDrawer({ p, currency, initial, onClose, onSave }: { p: StepProps["p"]; currency: string; initial: TaxForm; onClose: () => void; onSave: (t: TaxForm) => void }) {
  const [tax, setTax] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (patch: Partial<TaxForm>) => setTax((t) => ({ ...t, ...patch }));
  const submit = () => {
    const e = checkTax(tax);
    if (Object.keys(e).length) return setErrors(e);
    onSave(tax);
  };
  return (
    <Drawer
      title={p.addTax}
      description={p.taxExample}
      closeLabel={p.close}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={submit} className={`${smallPrimaryButtonClass} flex-1`}>
            {p.save}
          </button>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {p.cancel}
          </button>
        </>
      }
    >
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5 min-[900px]:p-6">
        <Field id="tax.name" label={p.name} required error={errors.name} p={p}>
          <TextInput id="tax.name" value={tax.name} onChange={(v) => set({ name: v })} error={errors.name} maxLength={80} />
        </Field>
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1.5 p-0 text-[14px] font-semibold">
            {p.type} <span className="text-[#DC2626]">*</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {TAX_KINDS.map((k) => (
              <RadioCard key={k} name="tax.kind" checked={tax.kind === k} onChange={() => set({ kind: k })} label={p.taxKinds[k]} />
            ))}
          </div>
        </fieldset>
        <Field id="tax.logic" label={p.howCalculated} required hint={p.howCalculatedHint} error={errors.logic} p={p}>
          <Select id="tax.logic" value={tax.logic} onChange={(v) => set({ logic: v })} options={TAX_LOGIC.map((l) => ({ value: l, label: p.taxLogic[l] }))} />
        </Field>
        <Grid>
          <Field id="tax.amount" label={p.amount} required error={errors.amount} p={p}>
            <NumberInput id="tax.amount" value={tax.amount} onChange={(v) => set({ amount: v })} error={errors.amount} suffix={tax.logic === "percent" ? "%" : currency} maxLength={14} />
          </Field>
          <Field id="tax.inclusive" label={p.includedInPrice} required p={p}>
            <Select
              id="tax.inclusive"
              value={tax.inclusive ? "yes" : "no"}
              onChange={(v) => set({ inclusive: v === "yes" })}
              options={[{ value: "no", label: p.inclusive.no }, { value: "yes", label: p.inclusive.yes }]}
            />
          </Field>
        </Grid>
        <details className="group rounded-[10px] border border-[#E5E7EB]" open={Boolean(tax.startsOn || tax.endsOn || tax.skipNights || tax.maxNights)}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="text-[10px] transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">▶</span>
            {p.whenApplies}
          </summary>
          <div className="px-3.5 pb-3.5">
            <Grid>
              <Field id="tax.startsOn" label={p.fromDate} error={errors.startsOn} p={p}>
                <TextInput id="tax.startsOn" type="date" dir="ltr" value={tax.startsOn} onChange={(v) => set({ startsOn: v })} error={errors.startsOn} />
              </Field>
              <Field id="tax.endsOn" label={p.toDate} error={errors.endsOn} p={p}>
                <TextInput id="tax.endsOn" type="date" dir="ltr" value={tax.endsOn} onChange={(v) => set({ endsOn: v })} error={errors.endsOn} />
              </Field>
              <Field id="tax.skipNights" label={p.skipFirstNights} error={errors.skipNights} p={p}>
                <NumberInput id="tax.skipNights" value={tax.skipNights} onChange={(v) => set({ skipNights: v })} error={errors.skipNights} inputMode="numeric" maxLength={3} />
              </Field>
              <Field id="tax.maxNights" label={p.maxNightsTaxed} error={errors.maxNights} p={p}>
                <NumberInput id="tax.maxNights" value={tax.maxNights} onChange={(v) => set({ maxNights: v })} error={errors.maxNights} inputMode="numeric" maxLength={3} />
              </Field>
            </Grid>
          </div>
        </details>
        <InfoBox title={p.onEveryRate}>{p.onEveryRateBody}</InfoBox>
      </div>
    </Drawer>
  );
}
