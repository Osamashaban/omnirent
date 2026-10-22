"use client";

// Editing the selected nights: the side panel on desktop and the bottom sheet
// on phones (which has the most used fields only).

import type { CalTypeView } from "@/lib/calendar-data";
import type { CalendarDict } from "@/lib/calendar-i18n";
import { BLOCK_REASONS, SAT_FIRST, daysBetween, type BlockReason, type EditSpec } from "@/lib/calendar-rules";
import { derivedPrice } from "@/lib/property-rules";
import { Info, X } from "@/components/ops/icons";
import { Ban } from "@/components/broker/property-icons";
import { ErrorAlert, Segmented, num, triOptions } from "./parts";
import type { SelInfo } from "./CalendarApp";

export type PanelForm = EditSpec & { reason: BlockReason };

type Props = {
  t: CalendarDict;
  info: SelInfo;
  form: PanelForm;
  setForm: (f: PanelForm) => void;
  error: string;
  busy: boolean;
  currency: string;
  money: (n: number, type?: CalTypeView) => string;
  onSave: () => void;
  onClose: () => void;
};

const field =
  "h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-[15px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25";
const primary =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border-0 bg-[#639922] px-[18px] text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(99,153,34,0.30)] hover:bg-[#4E8F20] disabled:cursor-not-allowed disabled:opacity-70";
const secondary =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#D1D5DB] bg-white px-[18px] text-[15px] font-semibold text-[#111827] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70";

function header(t: CalendarDict, info: SelInfo, propertyName: (x: CalTypeView) => string) {
  const nights = daysBetween(info.from, info.to) + 1;
  const what = info.types.length === 1 ? `${propertyName(info.types[0])} · ${info.types[0].name}` : t.unitTypesCount(info.types.length);
  return { title: t.editNights(nights), sub: `${t.dayRange(info.from, info.to)} · ${what}` };
}

// How the non-refundable rate follows, when every selected type has the same
// one.
function derivedRule(info: SelInfo) {
  const first = info.types[0]?.derived;
  if (!first || !info.types.every((x) => x.derived?.adjustment === first.adjustment && x.derived?.value === first.value)) return null;
  return first;
}

function derivedText(t: CalendarDict, info: SelInfo, form: PanelForm, money: Props["money"], phone: boolean) {
  const rule = derivedRule(info);
  if (!rule) return "";
  const type = info.types[0];
  const pct = rule.adjustment === "decrease_amount" ? t.amountOff(money(rule.value, type)) : t.pctOff(num(rule.value));
  const v = Number(form.value);
  if (form.mode === "set" && form.value.trim() !== "" && v > 0) {
    const p = money(derivedPrice(v, rule.adjustment, rule.value), type);
    return phone ? t.derivedFollowsPhone(p) : t.derivedFollows(p, pct);
  }
  return t.derivedFollowsNoPrice(pct);
}

function WeekdayChips({ t, form, setForm, phone = false }: { t: CalendarDict; form: PanelForm; setForm: (f: PanelForm) => void; phone?: boolean }) {
  return (
    <div role="group" aria-label={t.applyTo} className="flex flex-wrap gap-1.5">
      {SAT_FIRST.map((w) => (
        <button
          key={w}
          type="button"
          aria-pressed={form.days[w]}
          onClick={() => {
            const days = form.days.slice();
            days[w] = !days[w];
            setForm({ ...form, days });
          }}
          className={`cursor-pointer rounded-full px-2.5 text-[13px] font-semibold ${phone ? "h-8 min-w-11" : "h-[34px] min-w-[52px]"} ${
            form.days[w] ? "border-[1.5px] border-[#639922] bg-[#EAF3DE] text-[#27500A]" : "border border-[#D1D5DB] bg-white text-[#4B5563]"
          }`}
        >
          {t.weekdayShort[w]}
        </button>
      ))}
    </div>
  );
}

export function EditPanel({
  t,
  info,
  form,
  setForm,
  error,
  busy,
  currency,
  money,
  propertyName,
  onSave,
  onBlock,
  onReset,
  onClose,
}: Props & { propertyName: (x: CalTypeView) => string; onBlock: () => void; onReset: () => void }) {
  const { title, sub } = header(t, info, propertyName);
  const several = info.types.length > 1 || info.from !== info.to;
  const multiUnit = info.types.some((x) => x.count > 1);
  const derived = derivedText(t, info, form, money, false);
  const set = (patch: Partial<PanelForm>) => setForm({ ...form, ...patch });
  const rules: [keyof Pick<EditSpec, "cta" | "ctd" | "stop">, string, string, "rule" | "sale"][] = [
    ["cta", t.arrival, t.arrivalHelp, "rule"],
    ["ctd", t.departure, t.departureHelp, "rule"],
    ["stop", t.sale, t.saleHelp, "sale"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(17,24,39,0.35)] max-[899px]:hidden" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[440px] max-w-full flex-col bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-start gap-3 border-b border-[#E5E7EB] px-6 py-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <h2 className="m-0 text-[20px] font-bold">{title}</h2>
            <p className="m-0 text-[14px] leading-[1.6] text-[#4B5563]">{sub}</p>
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

        <div className="flex flex-1 flex-col gap-[18px] overflow-auto px-6 py-5">
          {error && <ErrorAlert>{error}</ErrorAlert>}
          <Segmented
            label={t.howToChange}
            value={form.mode}
            options={[
              ["set", t.setPrice],
              ["pctUp", t.raisePct],
              ["pctDown", t.lowerPct],
            ]}
            onChange={(mode) => set({ mode, value: mode === "set" ? form.value : "" })}
            className="self-start"
          />
          <div className="-mt-1.5 grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="cal_price" className="text-[14px] font-medium">
                {form.mode === "set" ? t.pricePerNight : t.percentage}
              </label>
              <div className="relative flex items-center">
                <input
                  id="cal_price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.value}
                  onChange={(e) => set({ value: e.target.value })}
                  placeholder={several ? t.keepCurrent : ""}
                  className={`${field} pe-12`}
                />
                <span className="pointer-events-none absolute end-3 text-[13px] text-[#6B7280]">{form.mode === "set" ? currency : "%"}</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="cal_units" className="text-[14px] font-medium">
                {t.unitsOpen}
              </label>
              <input
                id="cal_units"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.units}
                onChange={(e) => set({ units: e.target.value })}
                placeholder={multiUnit ? t.keep : t.multiOnly}
                disabled={!multiUnit}
                className={`${field} disabled:bg-[#F9FAFB]`}
              />
            </div>
          </div>
          {derived && <span className="-mt-2.5 text-[13px] text-[#6B7280]">{derived}</span>}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="cal_min" className="text-[14px] font-medium">
                {t.minStayNights}
              </label>
              <input
                id="cal_min"
                type="number"
                inputMode="numeric"
                min={1}
                value={form.min}
                onChange={(e) => set({ min: e.target.value })}
                placeholder={t.keep}
                className={field}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="cal_max" className="text-[14px] font-medium">
                {t.maxStayNights}
              </label>
              <input
                id="cal_max"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.max}
                onChange={(e) => set({ max: e.target.value })}
                placeholder={t.noLimit}
                className={field}
              />
            </div>
          </div>
          {rules.map(([key, label, help, kind]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium">
                {label} <span className="text-[12px] font-normal text-[#6B7280]">{help}</span>
              </span>
              <Segmented label={label} value={form[key]} options={triOptions(t, kind)} onChange={(v) => set({ [key]: v })} className="self-start" />
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium">{t.applyTo}</span>
            <WeekdayChips t={t} form={form} setForm={setForm} />
            <span className="text-[13px] text-[#6B7280]">{t.bookedSkipped}</span>
          </div>
          <div className="flex gap-2.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3 text-[13px] leading-[1.6] text-[#374151]">
            <span className="flex flex-none pt-0.5 text-[#6B7280]">
              <Info size={16} />
            </span>
            <span>{t.channelsNote}</span>
          </div>
          <div className="flex flex-col gap-2.5 border-t border-[#E5E7EB] pt-3.5">
            <span className="text-[14px] font-semibold">{t.blockDates}</span>
            <span className="-mt-1.5 text-[13px] text-[#6B7280]">{t.blockHelp}</span>
            <div className="flex items-center gap-2">
              <select
                aria-label={t.blockReason}
                value={form.reason}
                onChange={(e) => set({ reason: e.target.value as BlockReason })}
                className="h-10 flex-1 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-[14px] font-medium text-[#111827]"
              >
                {BLOCK_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {t.reasons[r]}
                  </option>
                ))}
              </select>
              <button type="button" onClick={onBlock} disabled={busy} className={`${secondary} h-10 px-3.5 text-[14px]`}>
                <Ban />
                {t.block}
              </button>
            </div>
            <button
              type="button"
              onClick={onReset}
              disabled={busy}
              className="cursor-pointer self-start border-0 bg-transparent p-0 text-[14px] font-semibold text-[#3B6D11] disabled:opacity-60"
            >
              {t.reset}
            </button>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#E5E7EB] px-6 py-4">
          <button type="button" onClick={onSave} disabled={busy} className={`${primary} flex-1`}>
            {t.save}
          </button>
          <button type="button" onClick={onClose} className={secondary}>
            {t.cancel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function PhoneEditSheet({ t, info, form, setForm, error, busy, currency, money, onSave, onClose }: Props) {
  const { title } = header(t, info, () => "");
  const sub = `${t.dayRange(info.from, info.to)} · ${info.types.length === 1 ? info.types[0].name : t.unitTypesCount(info.types.length)}`;
  const several = info.types.length > 1 || info.from !== info.to;
  const derived = derivedText(t, { ...info }, { ...form, mode: "set" }, money, true);
  const set = (patch: Partial<PanelForm>) => setForm({ ...form, ...patch });
  const seg = "h-[30px] flex-1 px-2 text-[12px]";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[rgba(17,24,39,0.45)] min-[900px]:hidden" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full flex-col gap-3.5 overflow-auto rounded-t-2xl bg-white px-4 pt-3 pb-5 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]"
      >
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-[#D1D5DB]" />
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="m-0 text-[18px] font-bold">{title}</h2>
            <span className="text-[13px] text-[#4B5563]">{sub}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#4B5563]"
          >
            <X />
          </button>
        </div>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="cal_p_price" className="text-[14px] font-medium">
              {t.pricePerNight}
            </label>
            <div className="relative flex items-center">
              <input
                id="cal_p_price"
                type="number"
                inputMode="decimal"
                min={0}
                value={form.value}
                onChange={(e) => set({ value: e.target.value })}
                placeholder={several ? t.keepCurrent : ""}
                className={`${field} pe-12`}
              />
              <span className="pointer-events-none absolute end-3 text-[13px] text-[#6B7280]">{currency}</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="cal_p_min" className="text-[14px] font-medium">
              {t.minStay}
            </label>
            <input
              id="cal_p_min"
              type="number"
              inputMode="numeric"
              min={1}
              value={form.min}
              onChange={(e) => set({ min: e.target.value })}
              placeholder={t.keep}
              className={field}
            />
          </div>
        </div>
        {derived && <span className="-mt-1.5 text-[12px] text-[#6B7280]">{derived}</span>}
        <div className="flex items-center gap-3">
          <span className="w-16 flex-none text-[14px] font-medium">{t.arrival}</span>
          <Segmented label={t.arrival} value={form.cta} options={triOptions(t, "rule", "phone")} onChange={(cta) => set({ cta })} className="flex-1" itemClass={seg} />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 flex-none text-[14px] font-medium">{t.sale}</span>
          <Segmented label={t.sale} value={form.stop} options={triOptions(t, "sale", "phone")} onChange={(stop) => set({ stop })} className="flex-1" itemClass={seg} />
        </div>
        <WeekdayChips t={t} form={form} setForm={setForm} phone />
        <button type="button" onClick={onSave} disabled={busy} className={`${primary} h-12 w-full`}>
          {t.save}
        </button>
      </section>
    </div>
  );
}
