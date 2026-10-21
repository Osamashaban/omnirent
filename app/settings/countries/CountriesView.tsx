"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  deleteCity,
  saveCity,
  saveCountry,
  setCityVisible,
  setCountryVisible,
  type CityFormState,
  type CountryFormState,
} from "@/app/actions/catalog";
import { DICTS, type Dict, type Lang } from "@/lib/i18n";
import { CURRENCIES, TIMEZONES, cityDeleteCheck, hideNeedsConfirm } from "@/lib/geo-rules";
import { Drawer, Toast } from "@/components/ops/Overlay";
import { Badge, PageHeader } from "@/components/ops/PageStates";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Spinner,
  Trash,
} from "@/components/ops/icons";
import { FieldError, secondaryButtonClass, smallPrimaryButtonClass } from "@/components/ops/ui";
import { ConfirmDialog, FormAlert, SearchBox, fieldClass } from "@/components/ops/SettingsParts";

export type CityRow = { id: string; nameAr: string; nameEn: string; visible: boolean; propertyCount: number };
export type CountryRow = {
  id: string;
  nameAr: string;
  nameEn: string;
  iso2: string;
  dialCode: string;
  currency: string;
  timezone: string;
  visible: boolean;
  cities: CityRow[];
};

type Filter = "all" | "visible" | "hidden";
type Panel =
  | { kind: "country"; country: CountryRow | null }
  | { kind: "city"; city: CityRow | null }
  | { kind: "hideCity"; city: CityRow }
  | { kind: "deleteCity"; city: CityRow }
  | { kind: "deleteCityBlocked"; city: CityRow }
  | { kind: "hideCountry" }
  | null;

const iconButton =
  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-50";

export function CountriesView({ lang, countries, initialIso }: { lang: Lang; countries: CountryRow[]; initialIso: string }) {
  const t = DICTS[lang];
  const name = useCallback((x: { nameAr: string; nameEn: string }) => (lang === "ar" ? x.nameAr : x.nameEn), [lang]);
  const [selectedIso, setSelectedIso] = useState(initialIso);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setPanel(null), []);
  const closeToast = useCallback(() => {
    setToast(null);
    setHighlight(null);
  }, []);

  const country = countries.find((c) => c.iso2 === selectedIso) ?? countries[0] ?? null;
  const say = (message: string, id?: string) => {
    setToast(message);
    setHighlight(id ?? null);
  };
  const pick = (iso2: string) => {
    setSelectedIso(iso2);
    setFilter("all");
    setQuery("");
    window.history.replaceState(null, "", `/settings/countries?country=${iso2}`);
  };

  const openAddCountry = () => setPanel({ kind: "country", country: null });

  if (!country) {
    return (
      <>
        <PageHeader crumb={t.geoBreadcrumb} title={t.countriesNav} intro={t.geoIntro} action={<AddCountryButton t={t} onClick={openAddCountry} />} />
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
            <Globe size={26} />
          </span>
          <h2 className="m-0 text-[20px] font-bold">{t.noCountriesTitle}</h2>
          <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{t.noCountriesBody}</p>
          <AddCountryButton t={t} onClick={openAddCountry} />
        </div>
        {panel?.kind === "country" && (
          <CountryDrawer
            t={t}
            country={null}
            onClose={close}
            onDone={(d) => {
              close();
              pick(d.iso2);
              say(t.countryAdded(name(d)));
            }}
          />
        )}
        {toast && <Toast onClose={closeToast} closeLabel={t.close}>{toast}</Toast>}
      </>
    );
  }

  const visibleCount = country.cities.filter((c) => c.visible).length;
  const countryProperties = country.cities.reduce((sum, c) => sum + c.propertyCount, 0);
  const q = query.trim().toLowerCase();
  const cities = country.cities.filter(
    (c) =>
      (filter === "all" || (filter === "visible" ? c.visible : !c.visible)) &&
      (!q || `${c.nameAr} ${c.nameEn}`.toLowerCase().includes(q)),
  );

  const run = (work: () => Promise<{ ok: boolean }>, message: string, id?: string) =>
    startTransition(async () => {
      const result = await work();
      say(result.ok ? message : t.somethingWrong, id);
    });

  const toggleCity = (city: CityRow) => {
    if (hideNeedsConfirm(city.visible, city.propertyCount)) return setPanel({ kind: "hideCity", city });
    run(() => setCityVisible(city.id, !city.visible), city.visible ? t.hiddenNamed(name(city)) : t.nowVisible(name(city)), city.id);
  };
  const removeCity = (city: CityRow) =>
    setPanel({ kind: cityDeleteCheck(city.propertyCount) === "blocked" ? "deleteCityBlocked" : "deleteCity", city });
  const toggleCountry = () => {
    if (hideNeedsConfirm(country.visible, countryProperties)) return setPanel({ kind: "hideCountry" });
    run(() => setCountryVisible(country.id, !country.visible), country.visible ? t.hiddenNamed(name(country)) : t.nowVisible(name(country)));
  };
  const editCity = (city: CityRow) => setPanel({ kind: "city", city });
  const addCity = () => setPanel({ kind: "city", city: null });

  const facts = [
    [t.defaultCurrency, t.currencyNames[country.currency] ?? country.currency],
    [t.timeZone, t.timezoneNames[country.timezone] ?? country.timezone],
    [t.dialingCode, <span key="d" dir="ltr">{country.dialCode}</span>],
    [t.propertiesHeading, String(countryProperties)],
  ] as const;
  const chips: [Filter, string][] = [
    ["all", t.filterAll],
    ["visible", t.statusVisible],
    ["hidden", t.statusHidden],
  ];

  const noMatch = country.cities.length > 0 && cities.length === 0 && (
    <div className="border-t border-[#F3F4F6] px-4 py-8 text-center text-[14px] text-[#4B5563]">
      {query ? t.noCityMatch(query) : t.noCityWithStatus}
    </div>
  );
  const noCities = country.cities.length === 0 && (
    <div className="flex flex-col items-center gap-2.5 border-t border-[#F3F4F6] px-6 py-10 text-center max-[899px]:rounded-xl max-[899px]:border max-[899px]:border-[#E5E7EB] max-[899px]:bg-white">
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
        <MapPin />
      </span>
      <h3 className="m-0 text-[18px] font-bold">{t.noCitiesYet(name(country))}</h3>
      <p className="m-0 max-w-[420px] text-[14px] leading-[1.6] text-[#4B5563]">{t.noCitiesBody}</p>
      <button type="button" onClick={addCity} className={secondaryButtonClass}>
        <Plus />
        {t.addCity}
      </button>
    </div>
  );

  return (
    <>
      <PageHeader crumb={t.geoBreadcrumb} title={t.countriesNav} intro={t.geoIntro} action={<AddCountryButton t={t} onClick={openAddCountry} />} />

      {/* Desktop */}
      <div className="hidden items-start gap-5 min-[900px]:flex">
        <section className="flex w-[340px] flex-none flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h2 className="mx-1 mb-1 mt-0 text-[15px] font-bold">
            {t.countriesHeading} <span className="font-medium text-[#6B7280]">{countries.length}</span>
          </h2>
          <div role="radiogroup" aria-label={t.countriesHeading} className="flex flex-col gap-2">
            {countries.map((c) => {
              const on = c.id === country.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick(c.iso2)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-[10px] p-3.5 text-start text-[#111827] ${
                    on ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]"
                  }`}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
                    <Globe size={18} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{name(c)}</span>
                    <span className="text-[13px] text-[#6B7280]">
                      {t.countrySub(c.cities.filter((x) => x.visible).length, c.cities.length, t.currencyNames[c.currency] ?? c.currency)}
                    </span>
                  </span>
                  <Badge tone={c.visible ? "green" : "grey"}>{c.visible ? t.statusVisible : t.statusHidden}</Badge>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-[22px] font-bold">{name(country)}</h2>
              <Badge tone={country.visible ? "green" : "grey"}>{country.visible ? t.visibleToBrokers : t.hiddenFromBrokers}</Badge>
              <span className="ms-auto" />
              <button type="button" disabled={pending} onClick={toggleCountry} className={secondaryButtonClass}>
                {country.visible ? t.hideCountry : t.showCountry}
              </button>
              <button type="button" onClick={() => setPanel({ kind: "country", country })} className={secondaryButtonClass}>
                <Pencil />
                {t.editCountry}
              </button>
            </div>
            {!country.visible && (
              <div role="note" className="flex gap-2.5 rounded-[10px] border border-[#FDE68A] bg-[#FEF3C7] px-3.5 py-3 text-[13px] leading-[1.6] text-[#92400E]">
                <EyeOff className="flex-none" />
                <span>{t.countryHiddenNote(name(country))}</span>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2.5">
              {facts.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3">
                  <span className="text-[12px] text-[#6B7280]">{k}</span>
                  <span className="text-[15px] font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <h2 className="m-0 text-[17px] font-bold">
                {t.citiesHeading} <span className="font-medium text-[#6B7280]">{t.citiesCount(visibleCount, country.cities.length)}</span>
              </h2>
              <div role="radiogroup" aria-label={t.colStatus} className="flex gap-1.5">
                {chips.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={filter === k}
                    onClick={() => setFilter(k)}
                    className={`h-8 cursor-pointer rounded-full px-3 text-[13px] font-semibold ${
                      filter === k ? "border-[1.5px] border-[#639922] bg-[#EAF3DE] text-[#27500A]" : "border border-[#D1D5DB] bg-white text-[#374151]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SearchBox value={query} onChange={setQuery} label={t.searchCities} className="ms-auto min-w-[160px] flex-[0_1_240px]" />
              <button type="button" onClick={addCity} className={smallPrimaryButtonClass}>
                <Plus />
                {t.addCity}
              </button>
            </div>
            {cities.length > 0 && (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {[t.colCity, t.colStatus, t.colProperties].map((h) => (
                      <th key={h} className="whitespace-nowrap border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-semibold text-[#4B5563]">
                        {h}
                      </th>
                    ))}
                    <th className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                      <span className="sr-only">{t.colActions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((city) => (
                    <tr key={city.id} className={highlight === city.id ? "bg-[#F7FBF1]" : ""}>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-[14px] font-semibold">{name(city)}</td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-[14px]">
                        <Badge tone={city.visible ? "green" : "grey"}>{city.visible ? t.statusVisible : t.statusHidden}</Badge>
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-[14px] text-[#4B5563]">{t.cityProperties(city.propertyCount)}</td>
                      <td className="w-[150px] border-b border-[#F3F4F6] px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label={t.editNamed(name(city))} onClick={() => editCity(city)} className={iconButton}>
                            <Pencil />
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            aria-label={`${city.visible ? t.hide : t.show} ${name(city)}`}
                            title={city.visible ? t.hide : t.show}
                            onClick={() => toggleCity(city)}
                            className={iconButton}
                          >
                            {city.visible ? <Eye /> : <EyeOff />}
                          </button>
                          <button
                            type="button"
                            aria-label={t.deleteNamed(name(city))}
                            onClick={() => removeCity(city)}
                            className={`${iconButton} text-[#B91C1C]`}
                          >
                            <Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {noMatch}
            {noCities}
            <div className="border-t border-[#F3F4F6] px-4 py-3 text-[13px] text-[#6B7280]">{t.cityDeleteNote}</div>
          </div>
        </section>
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-3 min-[900px]:hidden">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label={t.countriesHeading}>
          {countries.map((c) => {
            const on = c.id === country.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(c.iso2)}
                className={`inline-flex h-9 flex-none cursor-pointer items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold ${
                  on ? "border-[1.5px] border-[#639922] bg-[#EAF3DE] text-[#27500A]" : "border border-[#D1D5DB] bg-white text-[#374151]"
                }`}
              >
                {name(c)}
                {!c.visible && t.hiddenSuffix}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[17px] font-bold">{name(country)}</span>
            <Badge tone={country.visible ? "green" : "grey"}>{country.visible ? t.visibleToBrokers : t.hiddenFromBrokers}</Badge>
          </div>
          <span className="text-[13px] text-[#4B5563]">
            {t.currencyNames[country.currency] ?? country.currency} · {t.timezoneNames[country.timezone] ?? country.timezone} ·{" "}
            <span dir="ltr">{country.dialCode}</span>
          </span>
          <span className="text-[13px] text-[#4B5563]">{t.phoneCountrySummary(visibleCount, country.cities.length, countryProperties)}</span>
        </div>
        <div className="flex gap-2">
          <SearchBox value={query} onChange={setQuery} label={t.searchCities} className="flex-1" icon={false} />
          <button
            type="button"
            aria-label={t.addCity}
            onClick={addCity}
            className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-lg bg-[#639922] text-white"
          >
            <Plus />
          </button>
        </div>
        {cities.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {cities.map((city) => (
              <li
                key={city.id}
                className={`flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] p-3 ${highlight === city.id ? "bg-[#F7FBF1]" : "bg-white"}`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[15px] font-bold">{name(city)}</span>
                  <span className="text-[13px] text-[#6B7280]">{t.phoneCityProperties(city.propertyCount)}</span>
                </div>
                <Badge tone={city.visible ? "green" : "grey"}>{city.visible ? t.statusVisible : t.statusHidden}</Badge>
                <OptionsMenu
                  label={t.optionsFor(name(city))}
                  items={[
                    { label: t.edit, icon: <Pencil />, onClick: () => editCity(city) },
                    { label: city.visible ? t.hide : t.show, icon: city.visible ? <Eye /> : <EyeOff />, onClick: () => toggleCity(city) },
                    { label: t.deleteCity, icon: <Trash />, onClick: () => removeCity(city), danger: true },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
        {country.cities.length > 0 && cities.length === 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-8 text-center text-[14px] text-[#4B5563]">
            {query ? t.noCityMatch(query) : t.noCityWithStatus}
          </div>
        )}
        {noCities}
      </div>

      {panel?.kind === "country" && (
        <CountryDrawer
          t={t}
          country={panel.country}
          onClose={close}
          onDone={(d) => {
            close();
            if (d.added) pick(d.iso2);
            else setSelectedIso(d.iso2);
            say(d.added ? t.countryAdded(name(d)) : t.savedNamed(name(d)));
          }}
        />
      )}
      {panel?.kind === "city" && (
        <CityDrawer
          t={t}
          lang={lang}
          country={country}
          city={panel.city}
          onClose={close}
          onDone={(d) => {
            close();
            if (d.added) {
              setFilter("all");
              setQuery("");
            }
            say(d.added ? t.cityAdded(name(d), name(country)) : t.savedNamed(name(d)), d.cityId);
          }}
        />
      )}
      {panel?.kind === "hideCity" && (
        <ConfirmDialog
          t={t}
          tone="amber"
          title={t.hideNamed(name(panel.city))}
          body={t.hideCityBody(panel.city.propertyCount, name(panel.city))}
          goLabel={t.hideCity}
          pending={pending}
          onClose={close}
          onGo={() => {
            const city = panel.city;
            close();
            run(() => setCityVisible(city.id, false), t.hiddenNamed(name(city)), city.id);
          }}
        />
      )}
      {panel?.kind === "deleteCityBlocked" && (
        <ConfirmDialog
          t={t}
          tone="amber"
          title={t.cantDeleteNamed(name(panel.city))}
          body={t.cantDeleteCityBody(panel.city.propertyCount)}
          goLabel={panel.city.visible ? t.hideCity : t.ok}
          closeLabel={t.close}
          pending={pending}
          onClose={close}
          onGo={() => {
            const city = panel.city;
            close();
            if (city.visible) run(() => setCityVisible(city.id, false), t.hiddenNamed(name(city)), city.id);
          }}
        />
      )}
      {panel?.kind === "deleteCity" && (
        <ConfirmDialog
          t={t}
          tone="red"
          title={t.deleteNamedQ(name(panel.city))}
          body={t.deleteCityBody}
          goLabel={t.deleteCity}
          pending={pending}
          onClose={close}
          onGo={() => {
            const city = panel.city;
            close();
            run(() => deleteCity(city.id), t.deletedNamed(name(city)));
          }}
        />
      )}
      {panel?.kind === "hideCountry" && (
        <ConfirmDialog
          t={t}
          tone="amber"
          title={t.hideNamed(name(country))}
          body={t.hideCountryBody(countryProperties, name(country))}
          goLabel={t.hideCountry}
          pending={pending}
          onClose={close}
          onGo={() => {
            close();
            run(() => setCountryVisible(country.id, false), t.hiddenNamed(name(country)));
          }}
        />
      )}
      {toast && (
        <Toast onClose={closeToast} closeLabel={t.close}>
          {toast}
        </Toast>
      )}
    </>
  );
}

function AddCountryButton({ t, onClick }: { t: Dict; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={smallPrimaryButtonClass}>
      <Plus />
      {t.addCountry}
    </button>
  );
}

function OptionsMenu({
  label,
  items,
}: {
  label: string;
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[#4B5563]"
      >
        <MoreHorizontal />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-20 flex min-w-[180px] flex-col rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-start text-[15px] font-medium hover:bg-[#F3F4F6] ${
                item.danger ? "text-[#B91C1C]" : "text-[#111827]"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium">
        {label}{" "}
        <span aria-hidden="true" className="text-[#B91C1C]">
          *
        </span>
      </label>
      {children}
      {error && (
        <FieldError id={`${id}-error`}>
          <span role="alert" className="flex items-center gap-1.5">
            <AlertCircle size={14} className="flex-none" />
            {error}
          </span>
        </FieldError>
      )}
    </div>
  );
}

function VisibleSwitch({ label, help, defaultChecked }: { label: string; help: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[#E5E7EB] p-3.5">
      <input type="checkbox" name="visible" defaultChecked={defaultChecked} className="m-0 h-5 w-5 flex-none accent-[#639922]" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[13px] leading-[1.5] text-[#6B7280]">{help}</span>
      </span>
    </label>
  );
}

function useDone<T extends { at: number }>(done: T | undefined, onDone: (d: T) => void) {
  const handled = useRef<number | null>(null);
  useEffect(() => {
    if (done && handled.current !== done.at) {
      handled.current = done.at;
      onDone(done);
    }
  }, [done, onDone]);
}

function CountryDrawer({
  t,
  country,
  onClose,
  onDone,
}: {
  t: Dict;
  country: CountryRow | null;
  onClose: () => void;
  onDone: (d: NonNullable<CountryFormState["done"]>) => void;
}) {
  const initial = country
    ? { ...country }
    : { nameAr: "", nameEn: "", iso2: "", dialCode: "+", currency: "USD", timezone: "Africa/Cairo", visible: false };
  const [state, action, pending] = useActionState<CountryFormState, FormData>(saveCountry, { values: initial });
  useDone(state.done, onDone);
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const err = (key: string | undefined) => (key ? (t[key as keyof Dict] as string) ?? t.somethingWrong : undefined);
  const invalid = (key: string | undefined, id: string) =>
    key ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};

  return (
    <form action={action} className="contents" noValidate>
      <Drawer
        title={country ? t.editCountry : t.addCountry}
        description={t.countryDrawerBody}
        closeLabel={t.close}
        onClose={onClose}
        widthClass="min-[900px]:w-[480px]"
        footer={
          <>
            <button type="submit" disabled={pending} className={`${smallPrimaryButtonClass} flex-1`}>
              {pending && <Spinner />}
              {t.saveCountry}
            </button>
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              {t.cancel}
            </button>
          </>
        }
      >
        <div key={state.errors ? JSON.stringify(v) : "form"} className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-5 min-[900px]:p-6">
          {country && <input type="hidden" name="countryId" value={country.id} />}
          {state.formError && <FormAlert text={t.somethingWrong} />}
          <div className="grid grid-cols-2 gap-3">
            <Field id="gcar" label={t.arabicName} error={err(e.nameAr)}>
              <input id="gcar" name="nameAr" dir="rtl" defaultValue={v.nameAr} autoComplete="off" className={fieldClass} {...invalid(e.nameAr, "gcar")} />
            </Field>
            <Field id="gcen" label={t.englishName} error={err(e.nameEn)}>
              <input id="gcen" name="nameEn" dir="ltr" defaultValue={v.nameEn} autoComplete="off" className={fieldClass} {...invalid(e.nameEn, "gcen")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="gciso" label={t.countryCode} error={err(e.iso2)}>
              <input
                id="gciso"
                name="iso2"
                dir="ltr"
                maxLength={2}
                placeholder="EG"
                defaultValue={v.iso2}
                autoComplete="off"
                className={`${fieldClass} uppercase`}
                {...invalid(e.iso2, "gciso")}
              />
            </Field>
            <Field id="gcdial" label={t.dialingCode} error={err(e.dialCode)}>
              <input
                id="gcdial"
                name="dialCode"
                dir="ltr"
                inputMode="tel"
                maxLength={5}
                placeholder="+20"
                defaultValue={v.dialCode}
                autoComplete="off"
                className={fieldClass}
                {...invalid(e.dialCode, "gcdial")}
              />
            </Field>
          </div>
          <Field id="gccur" label={t.defaultCurrency} error={err(e.currency)}>
            <select id="gccur" name="currency" defaultValue={v.currency} className={`${fieldClass} cursor-pointer`}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {t.currencyNames[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="gctz" label={t.timeZone} error={err(e.timezone)}>
            <select id="gctz" name="timezone" defaultValue={v.timezone} className={`${fieldClass} cursor-pointer`}>
              {TIMEZONES.map((z) => (
                <option key={z} value={z}>
                  {t.timezoneNames[z]}
                </option>
              ))}
            </select>
          </Field>
          <VisibleSwitch label={t.visibleToBrokers} help={t.countryVisibleHelp} defaultChecked={v.visible} />
        </div>
      </Drawer>
    </form>
  );
}

function CityDrawer({
  t,
  lang,
  country,
  city,
  onClose,
  onDone,
}: {
  t: Dict;
  lang: Lang;
  country: CountryRow;
  city: CityRow | null;
  onClose: () => void;
  onDone: (d: NonNullable<CityFormState["done"]>) => void;
}) {
  const initial = city ? { nameAr: city.nameAr, nameEn: city.nameEn, visible: city.visible } : { nameAr: "", nameEn: "", visible: true };
  const [state, action, pending] = useActionState<CityFormState, FormData>(saveCity, { values: initial });
  useDone(state.done, onDone);
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const countryName = lang === "ar" ? country.nameAr : country.nameEn;
  const enError =
    e.nameEn === "cityExists" && state.duplicate
      ? t.cityExists(lang === "ar" ? state.duplicate.nameAr : state.duplicate.nameEn, countryName)
      : e.nameEn && (t[e.nameEn] as string);

  return (
    <form action={action} className="contents" noValidate>
      <Drawer
        title={city ? t.editCity : t.addCity}
        description={t.cityDrawerBody(countryName)}
        closeLabel={t.close}
        onClose={onClose}
        widthClass="min-[900px]:w-[480px]"
        footer={
          <>
            <button type="submit" disabled={pending} className={`${smallPrimaryButtonClass} flex-1`}>
              {pending && <Spinner />}
              {t.saveCity}
            </button>
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              {t.cancel}
            </button>
          </>
        }
      >
        <div key={state.errors ? JSON.stringify(v) : "form"} className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-5 min-[900px]:p-6">
          <input type="hidden" name="countryId" value={country.id} />
          {city && <input type="hidden" name="cityId" value={city.id} />}
          {state.formError && <FormAlert text={t.somethingWrong} />}
          <Field id="gtar" label={t.arabicName} error={e.nameAr && t[e.nameAr]}>
            <input
              id="gtar"
              name="nameAr"
              dir="rtl"
              defaultValue={v.nameAr}
              autoComplete="off"
              className={fieldClass}
              aria-invalid={e.nameAr ? true : undefined}
              aria-describedby={e.nameAr ? "gtar-error" : undefined}
            />
          </Field>
          <Field id="gten" label={t.englishName} error={enError || undefined}>
            <input
              id="gten"
              name="nameEn"
              dir="ltr"
              defaultValue={v.nameEn}
              autoComplete="off"
              className={fieldClass}
              aria-invalid={e.nameEn ? true : undefined}
              aria-describedby={e.nameEn ? "gten-error" : undefined}
            />
          </Field>
          <VisibleSwitch label={t.visibleToBrokers} help={t.cityVisibleHelp} defaultChecked={v.visible} />
        </div>
      </Drawer>
    </form>
  );
}
