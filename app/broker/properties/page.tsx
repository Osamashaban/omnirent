import type { Metadata } from "next";
import Link from "next/link";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { listProperties } from "@/lib/property-data";
import { matchesSearch, type ListStatus } from "@/lib/property-rules";
import { BrokerMain, BrokerMenuBar } from "@/components/broker/BrokerShell";
import { Plus, Search } from "@/components/ops/icons";
import { secondaryButtonClass, smallPrimaryButtonClass } from "@/components/ops/ui";
import { Building, Plug } from "@/components/broker/property-icons";
import { EmptyBox, StatusChip, Thumb, TypeChip } from "./parts";
import { ListFilters } from "./ListFilters";
import { RowMenu } from "./PropertyActions";
import { FlashToast } from "./FlashToast";
import { CHANNEL_DICTS } from "@/lib/channel-i18n";
import { connectedCounts } from "@/lib/channel-data";

export const metadata: Metadata = { title: "Omnirent · Properties" };

const STATUSES: ListStatus[] = ["synced", "syncing", "failed", "draft", "archived"];

type Props = { searchParams: Promise<{ q?: string; city?: string; type?: string; status?: string; done?: string }> };

// The broker's properties: search, filters by city, type and status, and a
// menu per row. On phones the rows become cards.
export default async function BrokerPropertiesPage({ searchParams }: Props) {
  const current = await requireBroker();
  const [lang, params] = await Promise.all([getLang(), searchParams]);
  const p = PROPERTY_DICTS[lang];
  const [all, connected] = await Promise.all([listProperties(current.broker.id, lang), connectedCounts(current.broker.id)]);
  const ct = CHANNEL_DICTS[lang];

  const q = (params.q ?? "").slice(0, 100);
  const status = STATUSES.find((s) => s === params.status) ?? "";
  const rows = all.filter(
    (r) =>
      matchesSearch(r.search, q) &&
      (!params.city || r.cityId === params.city) &&
      (!params.type || r.typeId === params.type) &&
      (!status || r.status === status),
  );

  // Filter choices come from the broker's own properties.
  const cities = unique(all.filter((r) => r.cityId).map((r) => ({ id: r.cityId!, name: r.cityName })));
  const types = unique(all.filter((r) => r.typeId).map((r) => ({ id: r.typeId!, name: r.typeName })));
  const doneMessage = { draft: p.savedDraft, archived: p.archived, copied: p.copied }[params.done ?? ""];

  return (
    <>
      <BrokerMenuBar current={current} lang={lang} p={p} title={p.properties} />
      <BrokerMain>
        <div className="flex items-start justify-between gap-4 max-[899px]:hidden">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px] font-bold tracking-[-0.01em]">{p.properties}</h1>
            <p className="m-0 text-[15px] text-[#4B5563]">{p.listBody}</p>
          </div>
          <Link href="/broker/properties/new" className={smallPrimaryButtonClass}>
            <Plus />
            {p.addProperty}
          </Link>
        </div>

        {all.length === 0 ? (
          <EmptyBox
            icon={<Building size={24} />}
            title={p.emptyTitle}
            action={
              <Link href="/broker/properties/new" className={smallPrimaryButtonClass}>
                <Plus />
                {p.addProperty}
              </Link>
            }
          >
            {p.emptyBody}
          </EmptyBox>
        ) : (
          <>
            <ListFilters
              lang={lang}
              q={q}
              city={params.city ?? ""}
              type={params.type ?? ""}
              status={status}
              cities={cities}
              types={types}
              statuses={STATUSES.map((s) => ({ id: s, name: p.status[s] }))}
            />
            {rows.length === 0 ? (
              <EmptyBox
                icon={<Search size={24} />}
                tone="grey"
                title={p.noResultsTitle(q.trim())}
                action={
                  <Link href="/broker/properties" className={secondaryButtonClass}>
                    {p.clearSearch}
                  </Link>
                }
              >
                {p.noResultsBody}
              </EmptyBox>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white max-[899px]:hidden">
                  <table className="w-full border-collapse text-start">
                    <thead>
                      <tr className="bg-[#F9FAFB] text-[12px] font-semibold text-[#374151]">
                        <th className="px-4 py-3 text-start font-semibold">{p.colProperty}</th>
                        <th className="px-4 py-3 text-start font-semibold">{p.colLocation}</th>
                        <th className="px-4 py-3 text-start font-semibold">{p.colType}</th>
                        <th className="px-4 py-3 text-start font-semibold">{p.colUnits}</th>
                        <th className="px-4 py-3 text-start font-semibold">{p.colPrice}</th>
                        <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">{ct.colConnected}</th>
                        <th className="px-4 py-3 text-start font-semibold">{p.colStatus}</th>
                        <th className="w-14 px-4 py-3">
                          <span className="sr-only">{p.actions}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id} className="border-t border-[#F3F4F6]">
                          <td className="px-4 py-3">
                            <Link href={`/broker/properties/${r.id}`} className="flex items-center gap-3 text-[#111827] no-underline">
                              <Thumb index={i} />
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate text-[14px] font-semibold">{r.nickname}</span>
                                <span className="truncate text-[13px] text-[#4B5563]">{r.title || "—"}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[14px] text-[#374151]">{r.location || "—"}</td>
                          <td className="px-4 py-3">{r.typeName ? <TypeChip>{r.typeName}</TypeChip> : "—"}</td>
                          <td className="px-4 py-3 text-[14px] tabular-nums text-[#374151]">{r.units}</td>
                          <td className="px-4 py-3 text-[14px] tabular-nums text-[#111827]">{r.price ?? "—"}</td>
                          <td className="px-4 py-3">
                            <a
                              href={`/broker/properties/${r.id}?tab=channels`}
                              aria-label={ct.connectedOn(connected[r.id] ?? 0)}
                              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 text-[14px] font-bold tabular-nums text-[#111827] no-underline"
                            >
                              <span className="flex text-[#3B6D11]">
                                <Plug size={14} />
                              </span>
                              {connected[r.id] ?? 0}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <StatusChip status={r.status} label={p.status[r.status]} />
                          </td>
                          <td className="px-4 py-3 text-end">
                            <RowMenu lang={lang} id={r.id} nickname={r.nickname} units={r.units} archived={r.status === "archived"} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#F3F4F6]">
                        <td colSpan={8} className="px-4 py-3 text-[13px] text-[#4B5563]">
                          {p.listCount(rows.length, rows.reduce((sum, r) => sum + r.units, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0 min-[900px]:hidden">
                  {rows.map((r, i) => (
                    <li key={r.id}>
                      <Link
                        href={`/broker/properties/${r.id}`}
                        className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-[#111827] no-underline"
                      >
                        <Thumb index={i} size={56} />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate text-[15px] font-bold">{r.nickname}</span>
                          <span className="truncate text-[13px] text-[#4B5563]">{r.location || "—"}</span>
                          <span className="flex flex-wrap items-center gap-2 text-[13px] text-[#374151]">
                            <StatusChip status={r.status} label={p.status[r.status]} />
                            <span>{p.phoneLine(r.price ?? "—", r.units)}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        {doneMessage && <FlashToast closeLabel={p.close}>{doneMessage}</FlashToast>}
      </BrokerMain>
    </>
  );
}

function unique<T extends { id: string; name: string }>(list: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of list) if (!seen.has(item.id)) seen.set(item.id, item);
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}
