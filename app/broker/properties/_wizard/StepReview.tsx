"use client";

import { currencyLabel, firstIncompleteStep, formatMoney, parseNumber, pricedUnits, type StepContext } from "@/lib/property-rules";
import { CheckCircle } from "@/components/ops/icons";
import { AlertTriangle } from "@/components/broker/property-icons";
import type { StepProps } from "./types";

// Step 8: what will be published, grouped as in the design, each with an
// Edit link back to its step.
export function StepReview({ form, p, lang, options, goTo, ctx }: StepProps & { ctx: StepContext }) {
  const name = (x?: { nameAr: string; nameEn: string }) => (x ? (lang === "ar" ? x.nameAr : x.nameEn) : "");
  const type = options.types.find((t) => t.id === form.typeId);
  const country = options.countries.find((c) => c.id === form.countryId);
  const city = country?.cities.find((c) => c.id === form.cityId);
  const priced = pricedUnits(form);
  const prices = priced.map(({ unit }) => parseNumber(unit.rate.price)).filter((n): n is number => n !== null && n > 0);
  const derived = priced.filter(({ unit }) => unit.rate.derived);
  const rateCount = priced.length + derived.length;
  const unitTypes = priced.length;
  const minStays = [...new Set(priced.map(({ unit }) => unit.rate.minStay))];
  const sep = lang === "ar" ? "، " : ", ";
  const incomplete = firstIncompleteStep(form, ctx);
  const money = (n: number) => formatMoney(n, form.currency, lang);
  const pricesText = prices.length
    ? lang === "ar"
      ? `${prices.map((n) => n.toLocaleString("en-US")).join(" / ")} ${currencyLabel(form.currency, lang)}`
      : `${form.currency} ${prices.map((n) => n.toLocaleString("en-US")).join(" / ")}`
    : "—";
  const firstDerived = derived[0]?.unit.rate;

  const sections: { title: string; step: number; rows: [string, string][] }[] = [
    {
      title: p.basics,
      step: 1,
      rows: [
        [p.type, name(type) || "—"],
        [p.publicTitle, form.titleEn || "—"],
        [p.contact, form.email || "—"],
      ],
    },
    {
      title: p.location,
      step: 2,
      rows: [
        [p.countryCity, [name(country), name(city)].filter(Boolean).join(" · ") || "—"],
        [p.compound, form.compound || "—"],
        [p.timezone, country?.timezone ?? "—"],
      ],
    },
    {
      title: p.units,
      step: 3,
      rows: priced.map(({ key, unit }) => [
        key === "whole" ? p.wholeApartment : unit.name || "—",
        form.rentMode === "WHOLE" ? p.unitLine(Number(unit.count) || 1, Number(unit.adults) || 0) : p.roomLine(Number(unit.adults) || 0),
      ]),
    },
    {
      title: p.rates,
      step: 4,
      rows: [
        [p.standard, pricesText],
        ...(firstDerived
          ? [[firstDerived.derivedName || p.nonRefundable, firstDerived.adjustment === "decrease_amount" ? p.amountOff(money(parseNumber(firstDerived.adjustValue) ?? 0)) : p.percentOff(firstDerived.adjustValue)] as [string, string]]
          : []),
        [p.colMinStay, minStays.length === 1 ? p.nightsCount(Number(minStays[0]) || 1) : minStays.join(" / ")],
      ],
    },
    {
      title: p.policiesTitle,
      step: 5,
      rows: [
        [p.cancellation, p.policies[form.cancellationPolicy]?.[0] ?? "—"],
        [p.checkInOut, `${form.checkInTime} / ${form.checkOutTime}`],
        [p.petsSmokingShort, `${p.petsPolicies[form.petsPolicy] ?? "—"} · ${p.smokingPolicies[form.smokingPolicy] ?? "—"}`],
      ],
    },
    {
      title: p.content,
      step: 7,
      rows: [
        [p.descriptionShort, form.descriptionEn ? (form.descriptionAr ? p.englishArabic : p.englishOnly) : "—"],
        [p.steps[5], form.taxes.length ? form.taxes.map((t) => t.name).join(sep) : p.none],
      ],
    },
  ];

  return (
    <>
      {incomplete === null ? (
        <>
          <div className="flex gap-3 rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] px-4 py-3.5">
            <CheckCircle size={20} className="mt-0.5 flex-none text-[#15803D]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#15803D]">{p.readyToPublish}</span>
              <span className="text-[13px] text-[#1F2937]">{p.readyBody(unitTypes, rateCount)}</span>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-[#FDE68A] bg-[#FEF3C7] px-4 py-3.5">
            <AlertTriangle className="mt-0.5 flex-none text-[#B45309]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#B45309]">{p.lockedAfterSync}</span>
              <span className="text-[13px] text-[#1F2937]">{p.lockedBody(currencyLabel(form.currency, lang))}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEE2E2] px-4 py-3.5">
          <AlertTriangle className="flex-none text-[#B91C1C]" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#B91C1C]">{p.notReady}</span>
            <span className="text-[13px] text-[#1F2937]">{p.notReadyBody(p.steps[incomplete - 1])}</span>
          </div>
          <button type="button" onClick={() => goTo(incomplete)} className="cursor-pointer text-[14px] font-semibold text-[#B91C1C] underline">
            {p.goToStep}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-[#3B6D11]" />
              <h2 className="m-0 flex-1 text-[16px] font-bold">{s.title}</h2>
              <button type="button" onClick={() => goTo(s.step)} className="cursor-pointer text-[14px] font-semibold text-[#3B6D11] underline">
                {p.edit}
              </button>
            </div>
            <dl className="m-0 grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-1.5 text-[14px]">
              {s.rows.map(([k, v], i) => (
                <div key={i} className="contents">
                  <dt className="text-[#4B5563]">{k}</dt>
                  <dd className="m-0 break-words font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
