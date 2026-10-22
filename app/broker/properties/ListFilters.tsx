"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "@/components/ops/icons";
import type { Lang } from "@/lib/i18n";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { Filter } from "@/components/broker/property-icons";

type Option = { id: string; name: string };

const selectClass =
  "h-11 cursor-pointer appearance-none rounded-lg border border-[#D1D5DB] bg-white bg-[length:16px] bg-[position:right_12px_center] bg-no-repeat pe-9 ps-3 text-[14px] font-medium text-[#111827] outline-none focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25 rtl:bg-[position:left_12px_center]";
const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

// Search and the city, type and status filters. They live in the address,
// so a filtered list can be refreshed or shared. Choosing a filter applies it
// at once; the search applies on Enter.
export function ListFilters({
  lang,
  q,
  city,
  type,
  status,
  cities,
  types,
  statuses,
}: {
  lang: Lang;
  q: string;
  city: string;
  type: string;
  status: string;
  cities: Option[];
  types: Option[];
  statuses: Option[];
}) {
  const p = PROPERTY_DICTS[lang];
  const [showFilters, setShowFilters] = useState(Boolean(city || type || status));
  const select = (name: string, value: string, all: string, options: Option[]) => (
    <select
      name={name}
      defaultValue={value}
      aria-label={all}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={selectClass}
      style={{ backgroundImage: chevron }}
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
  return (
    <form method="get" role="search" className="flex flex-wrap items-center gap-3 max-[899px]:gap-2">
      <label className="relative flex min-w-[220px] flex-1 items-center min-[900px]:max-w-[320px]">
        <Search className="pointer-events-none absolute start-3 text-[#6B7280]" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={p.search}
          aria-label={p.search}
          maxLength={100}
          className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pe-3 ps-10 text-[14px] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922] focus:ring-2 focus:ring-[#639922]/25"
        />
      </label>
      <button
        type="button"
        aria-label={p.filter}
        aria-expanded={showFilters}
        onClick={() => setShowFilters((v) => !v)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#374151] min-[900px]:hidden"
      >
        <Filter />
      </button>
      <Link
        href="/broker/properties/new"
        aria-label={p.addProperty}
        className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#639922] text-white min-[900px]:hidden"
      >
        <Plus />
      </Link>
      <div className={`flex flex-wrap gap-3 max-[899px]:w-full max-[899px]:gap-2 ${showFilters ? "" : "max-[899px]:hidden"}`}>
        {select("city", city, p.allCities, cities)}
        {select("type", type, p.allTypes, types)}
        {select("status", status, p.allStatuses, statuses)}
      </div>
    </form>
  );
}
