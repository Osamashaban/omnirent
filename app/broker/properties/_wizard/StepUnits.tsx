"use client";

import { blankRate, blankUnit, MAX_UNITS, parseNumber, type FormErrors, type RentModeValue, type UnitForm } from "@/lib/property-rules";
import { Home, Info, Plus, Trash } from "@/components/ops/icons";
import { Bed, Layers } from "@/components/broker/property-icons";
import { InfoBox } from "../parts";
import { Card, Field, Grid, NumberInput, RadioCard, TextInput } from "./fields";
import type { StepProps } from "./types";

const MODES: RentModeValue[] = ["WHOLE", "ROOMS", "BOTH"];
const n = (s: string) => {
  const v = parseNumber(s);
  return v !== null && v > 0 ? v : 0;
};

// Step 3: how the property is rented, then its unit types (whole-unit mode)
// or rooms (rooms and both modes; both also has the whole apartment).
export function StepUnits({ form, update, errors, p }: StepProps) {
  const rooms = form.rentMode !== "WHOLE";
  const setUnit = (i: number, patch: Partial<UnitForm>) =>
    update((f) => ({ ...f, units: f.units.map((u, j) => (j === i ? { ...u, ...patch } : u)) }));
  const setWhole = (patch: Partial<UnitForm>) => update((f) => ({ ...f, whole: { ...f.whole, ...patch } }));
  const add = () =>
    update((f) => ({
      ...f,
      units: [...f.units, blankUnit(`${rooms ? p.defaultRoom : p.defaultUnit} ${f.units.length + 1}`, blankRate(p.standard, p.nonRefundable))],
    }));
  const remove = (i: number) => update((f) => ({ ...f, units: f.units.filter((_, j) => j !== i) }));
  const totalUnits = form.units.reduce((sum, u) => sum + Math.max(n(u.count), 1), 0);

  return (
    <>
      <Card title={p.howRented} body={p.howRentedBody}>
        <div role="radiogroup" aria-label={p.howRented} className="grid grid-cols-1 gap-2 min-[700px]:grid-cols-3">
          {MODES.map((m) => (
            <RadioCard
              key={m}
              name="rentMode"
              checked={form.rentMode === m}
              onChange={() => update((f) => ({ ...f, rentMode: m }))}
              label={p.modes[m][0]}
              description={p.modes[m][1]}
            />
          ))}
        </div>
      </Card>

      {form.rentMode === "WHOLE" && totalUnits > 1 && <InfoBox title={p.multiUnit}>{p.multiUnitBody(totalUnits, form.units.length)}</InfoBox>}
      {form.rentMode === "BOTH" && (
        <>
          <InfoBox title={p.linked}>{p.linkedBody(form.units.length)}</InfoBox>
          <div aria-hidden="true" className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3.5 max-[899px]:hidden">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#EAF3DE] px-3 text-[13px] font-semibold text-[#27500A]">
              <Home size={16} />
              {form.whole.name || p.wholeApartment}
            </span>
            <span className="text-[13px] font-semibold text-[#4B5563]">{p.linkedArrow}</span>
            {form.units.map((u, i) => (
              <span key={i} className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] px-2.5 text-[13px] font-semibold">
                {u.name || `${p.defaultRoom} ${i + 1}`}
              </span>
            ))}
          </div>
          <section className="flex flex-col gap-4 rounded-xl border-[1.5px] border-[#C0DD97] bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3DE] text-[#3B6D11]">
                <Home size={18} />
              </span>
              <h2 className="m-0 flex-1 text-[16px] font-bold">{p.wholeApartment}</h2>
              <span className="rounded-md bg-[#EAF3DE] px-2 py-1 text-[12px] font-semibold text-[#27500A]">{p.wholeUnitBadge}</span>
            </div>
            <Grid cols={4}>
              <Count id="whole.adults" label={p.adults} hint={p.totalOfRooms} value={form.whole.adults} onChange={(v) => setWhole({ adults: v })} errors={errors} p={p} />
              <Count id="whole.bedrooms" label={p.bedrooms} value={form.whole.bedrooms} onChange={(v) => setWhole({ bedrooms: v })} errors={errors} p={p} />
              <Count id="whole.beds" label={p.beds} value={form.whole.beds} onChange={(v) => setWhole({ beds: v })} errors={errors} p={p} />
              <Count id="whole.bathrooms" label={p.bathrooms} value={form.whole.bathrooms} onChange={(v) => setWhole({ bathrooms: v })} errors={errors} p={p} />
            </Grid>
          </section>
          <h2 className="m-0 text-[16px] font-bold">{p.rooms}</h2>
        </>
      )}

      {errors.units && <p className="m-0 text-[13px] text-[#B91C1C]">{p.errors[errors.units]}</p>}

      {form.units.map((u, i) => {
        const k = `units.${i}`;
        return (
          <section key={i} className="flex flex-col gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${rooms ? "text-[#4B5563]" : "bg-[#EAF3DE] text-[#3B6D11]"}`}>
                {rooms ? <Bed /> : <Layers />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="m-0 truncate text-[16px] font-bold">{u.name || (rooms ? `${p.defaultRoom} ${i + 1}` : `${p.defaultUnit} ${i + 1}`)}</h2>
                {!rooms && <span className="text-[13px] text-[#4B5563]">{p.unitSummary(Math.max(n(u.count), 1), n(u.adults), n(u.bedrooms))}</span>}
              </div>
              {rooms ? (
                <span className="rounded-md bg-[#F3F4F6] px-2 py-1 text-[12px] font-semibold text-[#374151]">{p.roomBadge}</span>
              ) : (
                <div className="flex items-center gap-2 border-s border-[#E5E7EB] ps-3">
                  <label htmlFor={`${k}.count`} className="text-[14px] font-semibold">
                    {p.identical} <span className="text-[#DC2626]">*</span>
                  </label>
                  <span title={p.identicalHelp} aria-label={p.identicalHelp} className="flex text-[#6B7280]">
                    <Info size={16} />
                  </span>
                  <div className="w-[72px]">
                    <NumberInput id={`${k}.count`} value={u.count} onChange={(v) => setUnit(i, { count: v })} error={errors[`${k}.count`]} inputMode="numeric" />
                  </div>
                </div>
              )}
              {form.units.length > 1 && (
                <button
                  type="button"
                  aria-label={rooms ? p.removeRoom : p.removeUnitType}
                  onClick={() => remove(i)}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#DC2626] hover:bg-[#FEE2E2]"
                >
                  <Trash />
                </button>
              )}
            </div>
            {errors[`${k}.count`] && <span className="text-[13px] text-[#B91C1C]">{p.errors[errors[`${k}.count`]]}</span>}
            {rooms ? (
              <>
                <Grid cols={4}>
                  <Field id={`${k}.name`} label={p.roomName} required error={errors[`${k}.name`]} p={p}>
                    <TextInput id={`${k}.name`} value={u.name} onChange={(v) => setUnit(i, { name: v })} error={errors[`${k}.name`]} maxLength={80} />
                  </Field>
                  <Count id={`${k}.adults`} label={p.adults} value={u.adults} onChange={(v) => setUnit(i, { adults: v })} errors={errors} p={p} />
                  <Count id={`${k}.children`} label={p.children} value={u.children} onChange={(v) => setUnit(i, { children: v })} errors={errors} p={p} />
                  <Count id={`${k}.infants`} label={p.infants} value={u.infants} onChange={(v) => setUnit(i, { infants: v })} errors={errors} p={p} />
                </Grid>
                <Grid>
                  <Count id={`${k}.beds`} label={p.beds} value={u.beds} onChange={(v) => setUnit(i, { beds: v })} errors={errors} p={p} />
                  <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
                    <legend className="mb-1.5 p-0 text-[14px] font-semibold">
                      {p.bathroom} <span className="text-[#DC2626]">*</span>
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      <RadioCard name={`${k}.bathroom`} checked={u.bathroom === "private"} onChange={() => setUnit(i, { bathroom: "private" })} label={p.privateBath} />
                      <RadioCard name={`${k}.bathroom`} checked={u.bathroom === "shared"} onChange={() => setUnit(i, { bathroom: "shared" })} label={p.sharedBath} />
                    </div>
                  </fieldset>
                </Grid>
              </>
            ) : (
              <>
                <Grid cols={3}>
                  <Field id={`${k}.name`} label={p.unitTypeName} required error={errors[`${k}.name`]} p={p}>
                    <TextInput id={`${k}.name`} value={u.name} onChange={(v) => setUnit(i, { name: v })} error={errors[`${k}.name`]} maxLength={80} />
                  </Field>
                  <Count id={`${k}.adults`} label={p.adults} value={u.adults} onChange={(v) => setUnit(i, { adults: v })} errors={errors} p={p} />
                  <Count id={`${k}.children`} label={p.children} value={u.children} onChange={(v) => setUnit(i, { children: v })} errors={errors} p={p} />
                </Grid>
                <Grid cols={4}>
                  <Count id={`${k}.infants`} label={p.infants} value={u.infants} onChange={(v) => setUnit(i, { infants: v })} errors={errors} p={p} />
                  <Count id={`${k}.bedrooms`} label={p.bedrooms} value={u.bedrooms} onChange={(v) => setUnit(i, { bedrooms: v })} errors={errors} p={p} />
                  <Count id={`${k}.beds`} label={p.beds} value={u.beds} onChange={(v) => setUnit(i, { beds: v })} errors={errors} p={p} />
                  <Count id={`${k}.bathrooms`} label={p.bathrooms} value={u.bathrooms} onChange={(v) => setUnit(i, { bathrooms: v })} errors={errors} p={p} />
                </Grid>
              </>
            )}
          </section>
        );
      })}

      {form.units.length < MAX_UNITS && (
        <button
          type="button"
          onClick={add}
          className="flex h-[54px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#9CA3AF] bg-transparent text-[15px] font-semibold text-[#3B6D11] hover:bg-white"
        >
          <Plus />
          {rooms ? p.addRoom : p.addUnitType}
        </button>
      )}

      {form.rentMode === "WHOLE" && (
        <div className="flex gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3.5">
          <Info size={18} className="mt-0.5 flex-none text-[#4B5563]" />
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold">{p.guestsSee}</span>
            <ul className="m-0 flex flex-col gap-1 ps-4 text-[13px] text-[#374151]">
              <li>{p.guestsSeeHotel}</li>
              <li>{p.guestsSeeHome}</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function Count({ id, label, hint, value, onChange, errors, p }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void; errors: FormErrors; p: StepProps["p"] }) {
  return (
    <Field id={id} label={label} required hint={hint} error={errors[id]} p={p}>
      <NumberInput id={id} value={value} onChange={onChange} error={errors[id]} inputMode="numeric" maxLength={4} />
    </Field>
  );
}
