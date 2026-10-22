import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBroker } from "@/lib/broker-auth";
import { getLang } from "@/lib/lang";
import { prisma } from "@/lib/db";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { loadPropertyInclude } from "@/lib/property-data";
import { derivedPrice, formatMoney, fromPrice, listStatus, unitTotal } from "@/lib/property-rules";
import { BrokerCloseBar, BrokerMain } from "@/components/broker/BrokerShell";
import { Pencil } from "@/components/ops/icons";
import { CornerArrow } from "@/components/broker/property-icons";
import { InfoBox, StatusChip, Thumb, TypeChip } from "../parts";
import { HeaderActions } from "../PropertyActions";

export const metadata: Metadata = { title: "Omnirent · Property" };

const TABS = ["overview", "units", "rates", "channels"] as const;
type Tab = (typeof TABS)[number];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

// One property: overview, units, rates and channels. The design's Policies,
// Taxes & fees and Content tabs aren't designed yet; those details are edited
// in the wizard.
export default async function PropertyPage({ params, searchParams }: Props) {
  const current = await requireBroker();
  const [{ id }, query, lang] = await Promise.all([params, searchParams, getLang()]);
  const property = await prisma.property.findFirst({
    where: { id, brokerId: current.broker.id },
    include: { ...loadPropertyInclude, propertyType: true, city: true, country: true },
  });
  if (!property) notFound();
  const p = PROPERTY_DICTS[lang];
  const tab: Tab = TABS.find((t) => t === query.tab) ?? "overview";
  const status = listStatus(property);
  const name = (x: { nameAr: string; nameEn: string } | null) => (x ? (lang === "ar" ? x.nameAr : x.nameEn) : "");
  const money = (n: number) => formatMoney(n, property.currency, lang);

  const units = property.unitTypes;
  const rates = units.flatMap((u) => u.rates.map((r) => ({ ...r, unit: u })));
  const standard = rates.filter((r) => r.parentId === null);
  const derived = rates.filter((r) => r.parentId !== null);
  const total = unitTotal(units);
  const price = fromPrice(rates);
  const title = (lang === "ar" && property.titleAr) || property.titleEn;
  const subtitle = [title, name(property.city), p.subtitleUnits(total)].filter(Boolean).join(" · ");
  const policyName = (c: string) => (c ? (p.policies[c]?.[0] ?? c) : p.sameAsPropertyShort);
  const th = "px-4 py-3 text-start text-[12px] font-semibold text-[#374151]";
  const td = "border-t border-[#F3F4F6] px-4 py-3 text-[14px]";
  const stat = (label: string, value: string, sub: string) => (
    <div className="flex flex-col gap-1 rounded-xl border border-[#E5E7EB] bg-white p-4">
      <span className="text-[13px] text-[#4B5563]">{label}</span>
      <span className="text-[24px] font-bold tabular-nums">{value}</span>
      <span className="text-[13px] text-[#4B5563] max-[899px]:hidden">{sub}</span>
    </div>
  );

  return (
    <>
      <BrokerCloseBar userName={current.user.name} p={p} title={property.nickname} />
      <BrokerMain>
        <div className="flex flex-col gap-1.5">
          <nav className="text-[13px] text-[#4B5563] max-[899px]:hidden">
            <Link href="/broker/properties" className="text-[#4B5563] no-underline hover:underline">
              {p.properties}
            </Link>
            {" / "}
            {property.nickname}
          </nav>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <Thumb index={2} size={56} />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="m-0 text-[28px] font-bold tracking-[-0.01em] max-[899px]:hidden">{property.nickname}</h1>
                  <StatusChip status={status} label={p.status[status]} />
                </div>
                <span className="text-[14px] text-[#4B5563]">{subtitle}</span>
              </div>
            </div>
            <div className="max-[899px]:hidden">
              <HeaderActions lang={lang} target={{ id: property.id, nickname: property.nickname, units: total }} archived={status === "archived"} />
            </div>
          </div>
        </div>

        <nav aria-label={property.nickname} className="flex gap-6 overflow-x-auto border-b border-[#E5E7EB]">
          {TABS.map((t) => (
            // A plain link: in production builds, switching tabs through the
            // client-side router (same page, new ?tab=) sometimes never finished.
            <a
              key={t}
              href={t === "overview" ? `/broker/properties/${property.id}` : `/broker/properties/${property.id}?tab=${t}`}
              aria-current={tab === t ? "page" : undefined}
              className="flex h-11 flex-none items-center border-b-2 border-transparent px-0.5 text-[14px] font-medium text-[#4B5563] no-underline aria-[current=page]:border-[#639922] aria-[current=page]:font-semibold aria-[current=page]:text-[#27500A]"
            >
              {p.tabs[t]}
            </a>
          ))}
        </nav>

        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3 min-[1100px]:grid-cols-4">
              {stat(p.statUnits, String(total), p.statTypes(units.length))}
              {stat(p.statFrom, price === null ? "—" : money(price), p.perNight)}
              {stat(p.statRates, String(rates.length), p.statRatesSplit(standard.length, derived.length))}
              {stat(p.statChannels, "0", p.statChannelsHint)}
            </div>
            <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2 max-[899px]:hidden">
              <section className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5">
                <h2 className="m-0 text-[18px] font-bold">{p.channelSync}</h2>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {p.syncSteps.map((label, i) => (
                    <li key={label} className="flex items-center gap-2.5 text-[14px]">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#D1D5DB]" />
                      <span className="flex-1">{i === 1 ? p.syncCount(label, units.length) : i === 2 ? p.syncCount(label, rates.length) : label}</span>
                      <span className="text-[#6B7280]">{p.notSynced}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5">
                <h2 className="m-0 text-[18px] font-bold">{p.details}</h2>
                <dl className="m-0 grid grid-cols-[minmax(110px,35%)_1fr] gap-x-4 gap-y-2 text-[14px]">
                  {(
                    [
                      [p.type, name(property.propertyType) || "—"],
                      [p.location, [property.compound, name(property.city)].filter(Boolean).join(lang === "ar" ? "، " : ", ") || "—"],
                      [p.checkInOut, `${property.checkInTime} / ${property.checkOutTime}`],
                      [p.cancellation, p.policies[property.cancellationPolicy]?.[0] ?? "—"],
                      [p.currency, property.currency],
                      [p.contact, property.email || "—"],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-[#4B5563]">{k}</dt>
                      <dd className="m-0 break-words font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </>
        )}

        {tab === "units" && (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB]">
                    <th className={th}>{p.colUnitType}</th>
                    <th className={th}>{p.colKind}</th>
                    <th className={th}>{p.colCount}</th>
                    <th className={th}>{p.colCapacity}</th>
                    <th className={th}>{p.colRooms}</th>
                    <th className={th}>{p.colSync}</th>
                    <th className="w-14" />
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id}>
                      <td className={`${td} font-semibold`}>{u.name}</td>
                      <td className={td}>
                        <TypeChip>{u.kind === "ROOM" ? p.kindRoom : p.kindWhole}</TypeChip>
                      </td>
                      <td className={`${td} tabular-nums`}>{u.count}</td>
                      <td className={td}>{p.capacity(u.adults, u.children, u.infants)}</td>
                      <td className={td}>{p.roomsLine(u.bedrooms, u.beds, u.bathrooms)}</td>
                      <td className={td}>
                        <StatusChip status="draft" label={p.status.draft} />
                      </td>
                      <td className={`${td} text-end`}>
                        {status !== "archived" && (
                          <Link
                            href={`/broker/properties/${property.id}/edit?step=3`}
                            aria-label={p.editUnit(u.name)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]"
                          >
                            <Pencil />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InfoBox title={p.mappedUnits}>{p.mappedUnitsBody}</InfoBox>
          </>
        )}

        {tab === "rates" && (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB]">
                    <th className={th}>{p.colRate}</th>
                    <th className={th}>{p.colUnitType}</th>
                    <th className={th}>{p.colDefault}</th>
                    <th className={th}>{p.colMinStay}</th>
                    <th className={th}>{p.colCancellation}</th>
                    <th className={th}>{p.colSync}</th>
                    <th className="w-14" />
                  </tr>
                </thead>
                <tbody>
                  {standard.flatMap((r) => {
                    const child = derived.find((d) => d.parentId === r.id);
                    const rows = [
                      <tr key={r.id}>
                        <td className={td}>
                          <span className="flex flex-col">
                            <span className="font-semibold">{r.name}</span>
                            <span className="text-[12px] text-[#4B5563]">{p.perUnitUpTo(r.guests)}</span>
                          </span>
                        </td>
                        <td className={td}>{r.unit.name}</td>
                        <td className={`${td} tabular-nums`}>{Number(r.price) > 0 ? money(Number(r.price)) : "—"}</td>
                        <td className={td}>{p.nightsCount(r.minStay)}</td>
                        <td className={td}>{policyName(r.cancellationPolicy)}</td>
                        <td className={td}>
                          <StatusChip status="draft" label={p.status.draft} />
                        </td>
                        <td className={`${td} text-end`}>
                          {status !== "archived" && (
                            <Link href={`/broker/properties/${property.id}/edit?step=4`} aria-label={p.editRate(r.name)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]">
                              <Pencil />
                            </Link>
                          )}
                        </td>
                      </tr>,
                    ];
                    if (child) {
                      const value = Number(child.adjustValue ?? 0);
                      rows.push(
                        <tr key={child.id}>
                          <td className={`${td} ps-8`}>
                            <span className="flex flex-col">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <CornerArrow className="text-[#6B7280] rtl:-scale-x-100" />
                                {child.name}
                              </span>
                              <span className="text-[12px] text-[#4B5563]">
                                {child.adjustment === "decrease_amount" ? p.fromStandardAmount(money(value)) : p.fromStandardPct(String(value))}
                              </span>
                            </span>
                          </td>
                          <td className={td}>{r.unit.name}</td>
                          <td className={`${td} tabular-nums`}>{Number(r.price) > 0 ? money(derivedPrice(Number(r.price), child.adjustment ?? "", value)) : "—"}</td>
                          <td className={td}>{p.nightsCount(r.minStay)}</td>
                          <td className={td}>{policyName(child.cancellationPolicy)}</td>
                          <td className={td}>
                            <StatusChip status="draft" label={p.status.draft} />
                          </td>
                          <td className={`${td} text-end`}>
                            {status !== "archived" && (
                              <Link href={`/broker/properties/${property.id}/edit?step=4`} aria-label={p.editRate(child.name)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]">
                                <Pencil />
                              </Link>
                            )}
                          </td>
                        </tr>,
                      );
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
            <InfoBox title={p.dailyPrices}>{p.dailyPricesBody}</InfoBox>
          </>
        )}

        {tab === "channels" && (
          <>
            <InfoBox title={p.channelsComing}>{p.channelsComingBody}</InfoBox>
            <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2">
              {(
                [
                  ["Airbnb", "A", "bg-[#FF5A5F]"],
                  ["Booking.com", "B.", "bg-[#003580]"],
                  ["Expedia", "E", "bg-[#1F2937]"],
                  ["Google Vacation Rentals", "G", "bg-[#4285F4]"],
                ] as const
              ).map(([channel, letter, color]) => (
                <div key={channel} className="flex items-center gap-3.5 rounded-xl border border-[#E5E7EB] bg-white p-4">
                  <span aria-hidden="true" className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg text-[13px] font-bold text-white ${color}`}>
                    {letter}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span dir="ltr" className="text-start text-[15px] font-semibold">
                      {channel}
                    </span>
                    <span className="text-[13px] text-[#4B5563]">{p.notConnected}</span>
                  </span>
                  <span className="rounded-md bg-[#F3F4F6] px-2 py-1 text-[12px] font-semibold text-[#374151]">{p.soon}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="min-[900px]:hidden">
          <HeaderActions lang={lang} target={{ id: property.id, nickname: property.nickname, units: total }} archived={status === "archived"} />
        </div>
      </BrokerMain>
    </>
  );
}
