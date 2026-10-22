"use client";

import { useState } from "react";
import { FACILITIES } from "@/lib/property-rules";
import { Check } from "@/components/ops/icons";
import { ImageIcon } from "@/components/broker/property-icons";
import { Card, Field, TextInput, fieldInput } from "./fields";
import type { StepProps } from "./types";

// Step 7: photos, description, guest information, facilities and website.
// Photo upload waits for the storage decision, so the photos card only says
// so. The design's "+ More" facilities list isn't designed yet.
export function StepContent({ form, update, errors, p }: StepProps) {
  const set = (patch: Partial<typeof form>) => update((f) => ({ ...f, ...patch }));
  const [tab, setTab] = useState<"en" | "ar">("en");
  const tabClass = (on: boolean) =>
    `h-10 cursor-pointer border-b-2 px-0.5 text-[14px] ${on ? "border-[#639922] font-semibold text-[#27500A]" : "border-transparent font-medium text-[#4B5563]"}`;
  return (
    <>
      <Card title={p.photos}>
        <div className="flex items-center gap-3 rounded-[10px] border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-4 text-[14px] text-[#4B5563]">
          <ImageIcon className="flex-none text-[#6B7280]" />
          {p.photosLater}
        </div>
      </Card>

      <Card title={p.description}>
        <div role="tablist" aria-label={p.description} className="flex gap-5 border-b border-[#E5E7EB]">
          <button type="button" role="tab" aria-selected={tab === "en"} onClick={() => setTab("en")} className={tabClass(tab === "en")}>
            {p.english} <span className="text-[#DC2626]">*</span>
          </button>
          <button type="button" role="tab" lang="ar" aria-selected={tab === "ar"} onClick={() => setTab("ar")} className={tabClass(tab === "ar")}>
            {p.arabic}
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {tab === "en" ? (
            <textarea
              id="descriptionEn"
              dir="ltr"
              lang="en"
              aria-label={p.descriptionEnLabel}
              value={form.descriptionEn}
              maxLength={5000}
              onChange={(e) => set({ descriptionEn: e.target.value })}
              aria-invalid={Boolean(errors.descriptionEn)}
              className={`${fieldInput} h-auto min-h-[110px] py-3 leading-[1.6]`}
            />
          ) : (
            <textarea
              id="descriptionAr"
              dir="rtl"
              lang="ar"
              aria-label={p.descriptionArLabel}
              value={form.descriptionAr}
              maxLength={5000}
              onChange={(e) => set({ descriptionAr: e.target.value })}
              aria-invalid={Boolean(errors.descriptionAr)}
              className={`${fieldInput} h-auto min-h-[110px] py-3 leading-[1.6]`}
            />
          )}
          {errors.descriptionEn ? (
            <span className="text-[13px] text-[#B91C1C]">
              {p.english}: {p.errors[errors.descriptionEn]}
            </span>
          ) : errors.descriptionAr ? (
            <span className="text-[13px] text-[#B91C1C]">
              {p.arabic}: {p.errors[errors.descriptionAr]}
            </span>
          ) : (
            <span className="text-[13px] text-[#6B7280]">{p.descriptionHint}</span>
          )}
        </div>
        <Field id="importantInfo" label={p.importantInfo} hint={p.importantInfoHint} error={errors.importantInfo} p={p}>
          <TextInput id="importantInfo" value={form.importantInfo} onChange={(v) => set({ importantInfo: v })} error={errors.importantInfo} maxLength={1000} />
        </Field>
      </Card>

      <Card title={p.facilities} body={p.facilitiesHint}>
        <div className="flex flex-wrap gap-2">
          {FACILITIES.map((key) => {
            const on = form.facilities.includes(key);
            return (
              <label
                key={key}
                className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${
                  on ? "border border-[#C0DD97] bg-[#F7FBF1] text-[#27500A]" : "border border-dashed border-[#9CA3AF] bg-white text-[#4B5563]"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => set({ facilities: on ? form.facilities.filter((f) => f !== key) : [...form.facilities, key] })}
                />
                {on ? <Check size={14} /> : <span aria-hidden="true">+</span>}
                {p.facilityNames[key]}
              </label>
            );
          })}
        </div>
        <Field id="website" label={p.website} hint={p.websiteHint} error={errors.website} p={p}>
          <TextInput id="website" type="url" dir="ltr" value={form.website} onChange={(v) => set({ website: v })} error={errors.website} maxLength={255} placeholder="https://" />
        </Field>
      </Card>
    </>
  );
}
