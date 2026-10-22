"use client";

// Bulk edit: pick unit types, nights and the change, see a preview, save.
// A 600px drawer on desktop, a full-screen sheet on phones. The guard rails
// (minimum price, confirm over 100 nights) are the same rules the server runs.

import { useEffect, useMemo, useRef, useState } from "react";
import type { CalProperty, CalTypeView } from "@/lib/calendar-data";
import type { CalendarDict } from "@/lib/calendar-i18n";
import type { Lang } from "@/lib/i18n";
import {
  CONFIRM_OVER,
  PRICE_MODES,
  SAT_FIRST,
  blankSpec,
  bulkPreview,
  checkBulk,
  daysBetween,
  lastEditable,
  presets,
  type BulkSpec,
  type EditSpec,
  type Override,
  type PresetKey,
} from "@/lib/calendar-rules";
import { currencyLabel } from "@/lib/property-rules";
import { X } from "@/components/ops/icons";
import { ErrorAlert, Segmented, chipClass, num, triOptions } from "./parts";

export type BulkInput = { typeIds: string[]; from: string; to: string; spec: EditSpec; confirm: boolean };

const field =
  "h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-[15px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25";
const primary =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border-0 bg-[#639922] px-[18px] text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(99,153,34,0.30)] hover:bg-[#4E8F20] disabled:cursor-not-allowed disabled:opacity-70";
const secondary =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#D1D5DB] bg-white px-[18px] text-[15px] font-semibold text-[#111827] hover:bg-[#F9FAFB]";
const card = "flex flex-col gap-3 max-[899px]:rounded-xl max-[899px]:bg-white max-[899px]:p-3.5";

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[#EAF3DE] text-[13px] font-bold text-[#27500A]">{n}</span>
      <h3 className="m-0 flex-1 text-[16px] font-bold">{title}</h3>
      {children}
    </div>
  );
}

export function BulkEdit({
  t,
  lang,
  today,
  properties,
  types,
  overrides,
  busy,
  onClose,
  onSave,
}: {
  t: CalendarDict;
  lang: Lang;
  today: string;
  properties: CalProperty[];
  types: CalTypeView[];
  overrides: Map<string, Override>;
  busy: boolean;
  onClose: () => void;
  onSave: (input: BulkInput) => Promise<string | null>;
}) {
  const allPresets = useMemo(() => presets(today), [today]);
  const start = () => {
    const n30 = allPresets.find((p) => p.key === "n30");
    return {
      typeIds: types.map((x) => x.id),
      preset: "n30" as PresetKey | "",
      from: n30?.from ?? today,
      to: n30?.to ?? today,
      spec: blankSpec("pctUp"),
      confirm: false,
    };
  };
  const [state, setState] = useState(start);
  const [err, setErr] = useState("");
  // A refused save shows its reason at the end of the drawer: bring it into view.
  const errBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (err) errBox.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [err]);
  const update = (patch: Partial<typeof state>) => {
    setState((s) => ({ ...s, ...patch }));
    setErr("");
  };
  const setSpec = (patch: Partial<EditSpec>) => update({ spec: { ...state.spec, ...patch } });

  const from = state.from <= state.to ? state.from : state.to;
  const to = state.from <= state.to ? state.to : state.from;
  const bulk: BulkSpec = { ...state.spec, typeIds: state.typeIds, from, to, confirm: state.confirm };
  const preview = bulkPreview(types, overrides, bulk);
  const chosen = types.filter((x) => state.typeIds.includes(x.id));
  const units = chosen.reduce((a, x) => a + x.count, 0);
  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? "";
  const currency = currencyLabel(properties.find((p) => p.id === (chosen[0] ?? types[0])?.propertyId)?.currency ?? "EGP", lang);
  const nights = from && to ? daysBetween(from, to) + 1 : 0;
  const cities = [...new Map(properties.filter((p) => p.cityId).map((p) => [p.cityId!, p.cityName])).entries()];

  const has = (ids: string[]) => ids.length > 0 && ids.every((id) => state.typeIds.includes(id));
  const toggle = (ids: string[], on: boolean) => {
    const rest = state.typeIds.filter((id) => !ids.includes(id));
    update({ typeIds: on ? [...rest, ...ids] : rest });
  };

  async function save() {
    const e = checkBulk(bulk, preview, today);
    if (e) {
      setErr(
        e === "nothing" ? t.nothingBulk : e === "below" ? t.belowError(t.nights(preview.below)) : e === "confirm" ? t.confirmError(t.nights(preview.nights)) : t.errors[e],
      );
      return;
    }
    const r = await onSave({ typeIds: state.typeIds, from, to, spec: state.spec, confirm: state.confirm });
    if (r) setErr(r);
  }

  const modeLabels = PRICE_MODES.map((m) => [m, t.modes[m]] as [typeof m, string]);
  const tri: [keyof Pick<EditSpec, "cta" | "ctd" | "stop">, string, "rule" | "sale"][] = [
    ["cta", t.arrival, "rule"],
    ["ctd", t.departure, "rule"],
    ["stop", t.sale, "sale"],
  ];
  const valueSuffix = state.spec.mode === "pctUp" || state.spec.mode === "pctDown" ? "%" : currency;

  return (
    <div className="fixed inset-0 z-50 flex justify-end min-[900px]:bg-[rgba(17,24,39,0.35)]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t.bulkEdit}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)] max-[899px]:bg-[#F3F4F6] min-[900px]:w-[600px] min-[900px]:max-w-full"
      >
        {/* Desktop header */}
        <div className="flex items-start gap-3 border-b border-[#E5E7EB] px-6 py-5 max-[899px]:hidden">
          <div className="flex flex-1 flex-col gap-1.5">
            <h2 className="m-0 text-[21px] font-bold">{t.bulkEdit}</h2>
            <p className="m-0 text-[14px] text-[#4B5563]">{t.bulkIntro}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#4B5563] hover:bg-[#F3F4F6]"
          >
            <X />
          </button>
        </div>
        {/* Phone header */}
        <div className="flex h-14 flex-none items-center gap-2 border-b border-[#E5E7EB] bg-white px-2 min-[900px]:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#111827]"
          >
            <X />
          </button>
          <h2 className="m-0 flex-1 text-[17px] font-bold">{t.bulkEdit}</h2>
          <button
            type="button"
            onClick={() => {
              setState(start());
              setErr("");
            }}
            className="h-11 cursor-pointer border-0 bg-transparent px-3 text-[14px] font-semibold text-[#3B6D11]"
          >
            {t.resetBulk}
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[22px] overflow-auto px-6 py-5 max-[899px]:gap-3 max-[899px]:p-3">
          <section className={card}>
            <Step n={1} title={t.whichUnits} />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] font-semibold text-[#27500A]">{t.selected(t.unitTypes(chosen.length), t.apartments(units))}</span>
              <span className="flex-1" />
              <button type="button" onClick={() => update({ typeIds: types.map((x) => x.id) })} className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#3B6D11]">
                {t.selectAll}
              </button>
              <button
                type="button"
                onClick={() => update({ typeIds: [] })}
                className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#4B5563] max-[899px]:hidden"
              >
                {t.clear}
              </button>
            </div>
            {cities.length > 0 && (
              <>
                <span className="text-[13px] text-[#6B7280]">{t.byCity}</span>
                <div className="flex flex-wrap gap-1.5">
                  {cities.map(([cityId, cityName]) => {
                    const ids = types.filter((x) => properties.find((p) => p.id === x.propertyId)?.cityId === cityId).map((x) => x.id);
                    const on = has(ids);
                    return (
                      <button
                        key={cityId}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(ids, !on)}
                        className={`h-[34px] cursor-pointer rounded-full px-3 text-[13px] font-semibold ${chipClass(on)}`}
                      >
                        {cityName}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <span className="text-[13px] text-[#6B7280]">{t.byProperty}</span>
            <div className="flex max-h-[260px] flex-col gap-2 overflow-auto rounded-[10px] border border-[#E5E7EB] p-1 max-[899px]:max-h-none">
              {properties.map((p) => {
                const mine = types.filter((x) => x.propertyId === p.id);
                const ids = mine.map((x) => x.id);
                const on = has(ids);
                return (
                  <div key={p.id} className="flex flex-col gap-1 px-2 py-1.5">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(ids, !on)}
                      className={`h-[30px] cursor-pointer self-start rounded-full px-3 text-[13px] font-bold ${chipClass(on)}`}
                    >
                      <bdi>{p.name}</bdi>
                    </button>
                    <div className="flex flex-wrap gap-x-3.5 gap-y-1 ps-1.5">
                      {mine.map((x) => {
                        const checked = state.typeIds.includes(x.id);
                        return (
                          <button
                            key={x.id}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggle([x.id], !checked)}
                            className="flex min-h-8 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-medium text-[#111827]"
                          >
                            <span
                              className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[12px] font-bold text-white ${
                                checked ? "border-[1.5px] border-[#639922] bg-[#639922]" : "border-[1.5px] border-[#9CA3AF] bg-white"
                              }`}
                            >
                              {checked ? "✓" : ""}
                            </span>
                            <bdi>{x.name}</bdi>
                            {x.count > 1 ? ` · \u2066×${x.count}\u2069` : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={card}>
            <Step n={2} title={t.whichNights} />
            <div className="flex flex-wrap gap-1.5">
              {allPresets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={state.preset === p.key}
                  onClick={() => update({ preset: p.key, from: p.from, to: p.to })}
                  className={`h-[34px] cursor-pointer rounded-full px-3 text-[13px] font-semibold ${chipClass(state.preset === p.key)}`}
                >
                  {t.presets[p.key](p.year)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="bk_from" className="text-[14px] font-medium">
                  {t.from}
                </label>
                <input
                  id="bk_from"
                  type="date"
                  value={state.from}
                  min={today}
                  max={lastEditable(today)}
                  onChange={(e) => e.target.value && update({ from: e.target.value, preset: "" })}
                  className={field}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="bk_to" className="text-[14px] font-medium">
                  {t.toLast}
                </label>
                <input
                  id="bk_to"
                  type="date"
                  value={state.to}
                  min={today}
                  max={lastEditable(today)}
                  onChange={(e) => e.target.value && update({ to: e.target.value, preset: "" })}
                  className={field}
                />
              </div>
            </div>
            <span className="text-[13px] text-[#4B5563]">{t.rangeText(t.nights(nights), t.dayYear(from), t.dayYear(to))}</span>
            <span className="text-[13px] text-[#6B7280]">{t.weekdays}</span>
            <div className="flex flex-wrap gap-1.5">
              {SAT_FIRST.map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={state.spec.days[w]}
                  onClick={() => {
                    const days = state.spec.days.slice();
                    days[w] = !days[w];
                    setSpec({ days });
                  }}
                  className={`h-[34px] cursor-pointer rounded-full px-3 text-[13px] font-semibold ${chipClass(state.spec.days[w])}`}
                >
                  {t.weekdayShort[w]}
                </button>
              ))}
            </div>
          </section>

          <section className={card}>
            <Step n={3} title={t.whatChanges} />
            <span className="text-[14px] font-medium">
              {t.price} <span className="text-[12px] font-normal text-[#6B7280]">{t.pctHelp}</span>
            </span>
            <Segmented
              label={t.price}
              value={state.spec.mode}
              options={modeLabels}
              onChange={(mode) => setSpec({ mode })}
              className="self-start max-[899px]:hidden"
              itemClass="h-8 px-2.5 text-[13px]"
            />
            <div role="radiogroup" aria-label={t.price} className="grid grid-cols-3 gap-2 min-[900px]:hidden">
              {modeLabels.map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={state.spec.mode === m}
                  onClick={() => setSpec({ mode: m })}
                  className={`h-10 cursor-pointer rounded-lg text-[13px] font-semibold ${chipClass(state.spec.mode === m)}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {state.spec.mode !== "keep" && (
              <div className="relative flex max-w-[220px] items-center max-[899px]:max-w-none">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={state.spec.value}
                  onChange={(e) => setSpec({ value: e.target.value })}
                  aria-label={t.changeValue}
                  placeholder="10"
                  className={`${field} pe-12`}
                />
                <span className="pointer-events-none absolute end-3 text-[13px] text-[#6B7280]">{valueSuffix}</span>
              </div>
            )}
            <div className="flex max-w-[220px] flex-col gap-1.5 max-[899px]:max-w-none">
              <label htmlFor="bk_min" className="text-[14px] font-medium">
                {t.minStayNights}
              </label>
              <input
                id="bk_min"
                type="number"
                inputMode="numeric"
                min={1}
                value={state.spec.min}
                onChange={(e) => setSpec({ min: e.target.value })}
                placeholder={t.keep}
                className={field}
              />
            </div>
            <div className="flex flex-col gap-2.5">
              {tri.map(([key, label, kind]) => (
                <div key={key} className="flex items-center gap-3 max-[899px]:flex-col max-[899px]:items-stretch max-[899px]:gap-1.5">
                  <span className="flex-[0_0_110px] text-[14px] font-medium max-[899px]:flex-none">{label}</span>
                  <Segmented
                    label={label}
                    value={state.spec[key]}
                    options={triOptions(t, kind)}
                    onChange={(v) => setSpec({ [key]: v })}
                    className="self-start max-[899px]:flex max-[899px]:w-full max-[899px]:flex-nowrap"
                    itemClass="h-8 px-2.5 text-[13px] max-[899px]:h-9 max-[899px]:flex-1"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2.5 rounded-xl border border-[#C0DD97] bg-[#F7FBF1] p-4 max-[899px]:p-3.5">
            <Step n={4} title={t.preview} />
            <span className="text-[15px] font-bold">{t.summary(t.nights(preview.nights), preview.skipped, t.nights(preview.skipped))}</span>
            {preview.examples.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
                {preview.examples.map((ex) => {
                  const type = types.find((x) => x.id === ex.typeId);
                  return (
                    <li key={ex.typeId} className="flex justify-between gap-2 max-[899px]:flex-col max-[899px]:gap-0.5">
                      <span className="text-[#4B5563]">
                        <bdi>{propName(type?.propertyId ?? "")}</bdi> · <bdi>{type?.name ?? ""}</bdi> · {t.day(ex.date)}
                      </span>
                      <span dir="ltr" className={`font-bold tabular-nums ${ex.below ? "text-[#B91C1C]" : "text-[#111827]"}`}>
                        {num(ex.from)} → {num(ex.to)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {preview.below > 0 && (
              <span role="alert" className="text-[13px] text-[#B91C1C]">
                {t.belowFloor(t.nights(preview.below))}
              </span>
            )}
            {preview.nights > CONFIRM_OVER && (
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                <input
                  type="checkbox"
                  checked={state.confirm}
                  onChange={(e) => update({ confirm: e.target.checked })}
                  className="h-[18px] w-[18px] accent-[#639922]"
                />
                {t.confirmChange(t.nights(preview.nights))}
              </label>
            )}
            <span className="text-[12px] text-[#6B7280]">{t.bulkNote}</span>
          </section>

          {err && (
            <div ref={errBox} className="max-[899px]:hidden">
              <ErrorAlert>{err}</ErrorAlert>
            </div>
          )}
        </div>

        {/* Desktop footer */}
        <div className="flex gap-3 border-t border-[#E5E7EB] px-6 py-4 max-[899px]:hidden">
          <button type="button" onClick={save} disabled={busy} className={`${primary} flex-1`}>
            {t.save}
          </button>
          <button type="button" onClick={onClose} className={secondary}>
            {t.cancel}
          </button>
        </div>
        {/* Phone footer */}
        <div className="flex flex-none flex-col gap-2.5 border-t border-[#E5E7EB] bg-white px-4 pt-3 pb-4 min-[900px]:hidden">
          {err && <ErrorAlert>{err}</ErrorAlert>}
          <span className="text-[13px] font-semibold text-[#4B5563]">{t.footerCount(t.nights(preview.nights), t.unitTypes(chosen.length))}</span>
          <button type="button" onClick={save} disabled={busy} className={`${primary} h-12 w-full`}>
            {t.save}
          </button>
        </div>
      </section>
    </div>
  );
}
