"use client";

import { useEffect, useRef, useState } from "react";
import { currenciesFor } from "@/lib/property-rules";
import { Check, Chevron, Home, Search, X } from "@/components/ops/icons";
import { Card, Field, Grid, RadioCard, Select, TextInput } from "./fields";
import type { StepProps } from "./types";

// Step 1: property type, names, contact and currency.
export function StepBasics({ form, update, errors, p, lang, options, ratesSaved }: StepProps) {
  const set = (patch: Partial<typeof form>) => update((f) => ({ ...f, ...patch }));
  const typeName = (t: { nameAr: string; nameEn: string }) => (lang === "ar" ? t.nameAr : t.nameEn);
  const selected = options.types.find((t) => t.id === form.typeId);
  const mostUsed = options.mostUsed.map((id) => options.types.find((t) => t.id === id)).filter((t) => t !== undefined);
  const [picker, setPicker] = useState(false);
  const country = options.countries.find((c) => c.id === form.countryId);
  const currencies = currenciesFor(country?.currency);

  return (
    <>
      <Card title={p.propertyType} body={p.propertyTypeBody}>
        <div className="flex flex-col gap-1.5">
          <span id="typeId-label" className="text-[14px] font-semibold max-[899px]:hidden">
            {p.propertyType} <span className="text-[#DC2626]">*</span>
          </span>
          <div className="relative max-[899px]:hidden">
            <button
              type="button"
              id="typeId"
              aria-haspopup="listbox"
              aria-expanded={picker}
              aria-labelledby="typeId-label typeId"
              onClick={() => setPicker((v) => !v)}
              className={`flex h-[50px] w-full cursor-pointer items-center gap-2.5 rounded-lg bg-white px-3.5 text-start ${
                picker ? "border-[1.5px] border-[#639922]" : errors.typeId ? "border-[1.5px] border-[#DC2626]" : "border border-[#D1D5DB]"
              }`}
            >
              <Home size={18} className="text-[#3B6D11]" />
              <span className="flex-1 text-[15px] font-semibold">{selected ? typeName(selected) : <span className="font-normal text-[#9CA3AF]">{p.chooseType}</span>}</span>
              {selected && <span className="text-[13px] text-[#6B7280]">{p.apartmentsGroup}</span>}
              <Chevron className="text-[#374151]" />
            </button>
            {picker && (
              <TypeList
                p={p}
                types={options.types.map((t) => ({ id: t.id, name: typeName(t) }))}
                selected={form.typeId}
                onPick={(id) => (set({ typeId: id }), setPicker(false))}
                onClose={() => setPicker(false)}
                className="absolute start-0 top-[54px] z-20 w-full max-w-[580px] rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-[#4B5563] max-[899px]:hidden">{p.mostUsed}</span>
          <div role="radiogroup" aria-label={p.propertyType} className="grid grid-cols-2 gap-2 min-[900px]:grid-cols-6">
            {mostUsed.map((t, i) => (
              <div key={t.id} className={i >= 4 ? "max-[899px]:hidden" : ""}>
                <RadioCard name="typeId" checked={form.typeId === t.id} onChange={() => set({ typeId: t.id })} label={typeName(t)} />
              </div>
            ))}
          </div>
          {errors.typeId && <span className="text-[13px] text-[#B91C1C]">{p.errors[errors.typeId]}</span>}
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#4B5563]">
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="cursor-pointer font-semibold text-[#3B6D11] underline max-[899px]:flex max-[899px]:h-12 max-[899px]:w-full max-[899px]:items-center max-[899px]:justify-between max-[899px]:rounded-lg max-[899px]:border max-[899px]:border-[#D1D5DB] max-[899px]:bg-white max-[899px]:px-3.5 max-[899px]:text-[14px] max-[899px]:text-[#111827] max-[899px]:no-underline"
            >
              {p.allTypesCount(options.types.length)}
              <Chevron className="min-[900px]:hidden" />
            </button>
            <span aria-hidden="true" className="max-[899px]:hidden">·</span>
            <span className="max-[899px]:hidden">{p.typeMissing}</span>
          </div>
        </div>
        {picker && (
          <div className="fixed inset-0 z-50 flex items-end bg-[rgba(17,24,39,0.45)] min-[900px]:hidden" onClick={() => setPicker(false)}>
            <section
              role="dialog"
              aria-modal="true"
              aria-label={p.propertyType}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full flex-col gap-3 rounded-t-2xl bg-white px-4 pb-6 pt-2"
            >
              <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-[#D1D5DB]" />
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-[18px] font-bold">{p.propertyType}</h2>
                <button type="button" aria-label={p.close} onClick={() => setPicker(false)} className="flex h-11 w-11 items-center justify-center rounded-lg text-[#4B5563]">
                  <X />
                </button>
              </div>
              <TypeList
                p={p}
                types={options.types.map((t) => ({ id: t.id, name: typeName(t) }))}
                selected={form.typeId}
                onPick={(id) => (set({ typeId: id }), setPicker(false))}
                onClose={() => setPicker(false)}
                className="flex min-h-0 flex-col"
              />
            </section>
          </div>
        )}
      </Card>

      <Card title={p.names}>
        <Grid>
          <Field id="nickname" label={p.nickname} required hint={p.nicknameHint} error={errors.nickname} p={p}>
            <TextInput id="nickname" value={form.nickname} onChange={(v) => set({ nickname: v })} error={errors.nickname} maxLength={80} placeholder={lang === "ar" ? "مراسي ج-14" : "Marassi C-14"} />
          </Field>
          <Field id="titleAr" label={p.titleAr} hint={p.titleArHint} error={errors.titleAr} p={p} className="max-[899px]:order-3">
            <TextInput id="titleAr" dir="rtl" lang="ar" value={form.titleAr} onChange={(v) => set({ titleAr: v })} error={errors.titleAr} maxLength={255} />
          </Field>
          <Field id="titleEn" label={p.titleEn} required hint={p.titleEnHint} error={errors.titleEn} p={p} className="min-[700px]:col-span-2">
            <TextInput id="titleEn" dir="ltr" lang="en" value={form.titleEn} onChange={(v) => set({ titleEn: v })} error={errors.titleEn} maxLength={255} placeholder="Sea-view chalet in Marassi" />
          </Field>
        </Grid>
      </Card>

      <Card title={p.contactCurrency} body={p.contactCurrencyBody}>
        <Grid cols={3}>
          <Field id="email" label={p.email} required error={errors.email} p={p}>
            <TextInput id="email" type="email" dir="ltr" autoComplete="off" value={form.email} onChange={(v) => set({ email: v })} error={errors.email} maxLength={254} />
          </Field>
          <Field id="phone" label={p.phone} required error={errors.phone} p={p}>
            <TextInput id="phone" type="tel" dir="ltr" autoComplete="off" value={form.phone} onChange={(v) => set({ phone: v })} error={errors.phone} maxLength={30} placeholder="+20 100 555 2841" />
          </Field>
          <Field id="currency" label={p.currency} required hint={p.currencyHint} error={errors.currency} p={p}>
            <Select
              id="currency"
              value={form.currency}
              onChange={(v) => set({ currency: v })}
              disabled={ratesSaved}
              lock
              error={errors.currency}
              options={currencies.map((c) => ({ value: c, label: p.currencyName[c] ?? c }))}
            />
          </Field>
        </Grid>
      </Card>
    </>
  );
}

// The searchable list of property types (desktop dropdown and phone sheet).
function TypeList({
  p,
  types,
  selected,
  onPick,
  onClose,
  className,
}: {
  p: StepProps["p"];
  types: { id: string; name: string }[];
  selected: string;
  onPick: (id: string) => void;
  onClose: () => void;
  className: string;
}) {
  const [q, setQ] = useState("");
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    search.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const shown = types.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className={className}>
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute start-3 text-[#6B7280]" />
        <input
          ref={search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={p.typeSearch}
          aria-label={p.typeSearch}
          className="h-11 w-full rounded-lg border-[1.5px] border-[#639922] bg-white pe-3 ps-10 text-[14px] outline-none"
        />
      </label>
      <div role="listbox" aria-label={p.apartmentsGroup} className="mt-2 flex max-h-[420px] flex-col overflow-y-auto">
        {shown.length > 0 && <span className="px-2.5 py-2 text-[12px] font-bold text-[#6B7280]">{p.apartmentsGroup}</span>}
        {shown.map((t) => (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={t.id === selected}
            onClick={() => onPick(t.id)}
            className={`flex min-h-11 cursor-pointer items-center justify-between rounded-lg px-2.5 text-start text-[14px] ${
              t.id === selected ? "bg-[#EAF3DE] font-bold" : "font-medium hover:bg-[#F3F4F6]"
            }`}
          >
            {t.name}
            {t.id === selected && <Check size={16} className="text-[#3B6D11]" />}
          </button>
        ))}
        {shown.length === 0 && <p className="m-0 px-2.5 py-3 text-[14px] text-[#4B5563]">{p.typeNone}</p>}
      </div>
      <p className="m-0 mt-2 flex items-center gap-2 rounded-lg bg-[#F3F4F6] px-2.5 py-2 text-[12px] text-[#4B5563] max-[899px]:hidden">{p.typeMissing}</p>
    </div>
  );
}
