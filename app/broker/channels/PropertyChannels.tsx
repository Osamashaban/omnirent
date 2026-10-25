"use client";

// The Channels tab of a property page (design PropChannelsNew and
// PropPhoneChannels, version 80): the same cells and actions as Apartments &
// links on the Channels page, for this property's unit types only.

import { useMemo, useState } from "react";
import { Toast } from "@/components/ops/Overlay";
import { AlertCircle } from "@/components/ops/icons";
import { Plug } from "@/components/broker/property-icons";
import { cellFor, linkColumns, type UnitView } from "@/lib/channel-rules";
import type { Platform } from "@/lib/channel-catalog";
import type { ChannelsData } from "@/lib/channel-data";
import type { Lang } from "@/lib/i18n";
import { confirmMatches } from "@/app/actions/channels";
import { useChannels } from "./useChannels";
import { issueItems } from "./PlatformsTab";
import { Chips, DesktopCell, PhoneCell, cellActs, rowSyncOf } from "./LinksTab";
import { Dialogs } from "./Dialogs";
import { Switch, Tile, btn } from "./parts";
import type { Ctx } from "./types";

// Anything that belongs on the Channels page (the Platforms list, the full
// links grid) opens it.
const toChannels = () => {
  window.location.href = "/broker/channels";
};

// The "Manage all platforms" button beside the property's name.
export function ManageAllLink({ label }: { label: string }) {
  return (
    <a href="/broker/channels" className={`${btn.secondary} h-10 flex-none px-[18px] text-[14px] text-[#111827] no-underline max-[899px]:hidden`}>
      <Plug size={18} />
      {label}
    </a>
  );
}

export function PropertyChannels({ lang, data: initial, propertyId }: { lang: Lang; data: ChannelsData; propertyId: string }) {
  const { ctx: all, dlg, toast, closeToast } = useChannels(lang, initial, toChannels);
  const [sel, setSel] = useState<Set<string>>(new Set());

  // The same data, narrowed to this property's unit types.
  const ctx: Ctx = useMemo(() => {
    const units = all.data.units.filter((u) => u.propertyId === propertyId);
    const ids = new Set(units.map((u) => u.id));
    const sugg = Object.fromEntries(Object.entries(all.sugg).filter(([k]) => ids.has(k.split("|")[0])));
    return {
      ...all,
      sugg,
      data: {
        ...all.data,
        props: all.data.props.filter((p) => p.id === propertyId),
        units,
        links: all.data.links.filter((l) => ids.has(l.unitTypeId)),
        issues: all.data.issues.filter((i) => i.unitTypeId && ids.has(i.unitTypeId)),
      },
    };
  }, [all, propertyId]);
  const { t, data, sugg } = ctx;
  const cols = linkColumns(data);
  const issues = issueItems(ctx);
  const propName = data.props[0]?.name ?? "";

  const priceOf = (p: Platform) => {
    const acc = data.accounts.find((a) => a.platform === p.id);
    if (!acc || acc.priceMode === "same" || !acc.pricePct) return t.samePrice;
    return acc.priceMode === "up" ? t.priceUp(acc.pricePct) : t.priceDown(acc.pricePct);
  };
  const platformsOf = (u: UnitView) => cols.filter((p) => data.links.some((l) => l.unitTypeId === u.id && l.platform === p.id));

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const confirmSel = async () => {
    const r = await ctx.run(() => confirmMatches({ unitTypeIds: [...sel] }));
    if (r) {
      setSel(new Set());
      ctx.say(t.confirmedN(r.n));
    }
  };
  const syncSel = async () => {
    const ids = data.links.filter((l) => sel.has(l.unitTypeId) && cols.some((c) => c.id === l.platform) && !l.syncOn).map((l) => l.id);
    setSel(new Set());
    await ctx.sync(ids, true);
  };

  return (
    <>
      {issues.map((i) => (
        <div key={i.id} role="alert" className="flex items-center gap-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 max-[899px]:flex-col max-[899px]:items-stretch">
          <span className="flex flex-1 items-center gap-3">
            <span className="flex flex-none text-[#B91C1C]">
              <AlertCircle />
            </span>
            <span className="flex-1 text-[14px] text-[#7F1D1D]">{i.text}</span>
          </span>
          <span className="flex flex-none gap-2">
            <button type="button" onClick={i.fix} className={`${btn.smallPrimary} max-[899px]:flex-1`}>
              {i.fixLbl}
            </button>
            <button type="button" onClick={i.dismiss} disabled={ctx.busy} className={`${btn.smallSecondary} max-[899px]:flex-1`}>
              {t.dismiss}
            </button>
          </span>
        </div>
      ))}

      {cols.length === 0 || data.units.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
            <Plug size={26} />
          </span>
          <h2 className="m-0 text-[20px] font-bold">{t.noColsTitle}</h2>
          <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{t.noColsBody}</p>
          <a href="/broker/channels" className={`${btn.primary} no-underline max-[899px]:w-full`}>
            {t.goPlat}
          </a>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white max-[899px]:hidden">
            <table className="w-full border-collapse" style={{ minWidth: 520 + cols.length * 190 }}>
              <thead>
                <tr>
                  <th className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-bold text-[#6B7280]">{t.colUnitType}</th>
                  {cols.map((p) => (
                    <th key={p.id} className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-bold">
                      <span className="flex items-center gap-2">
                        <Tile p={p} size={24} radius={6} font={11} />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[#111827]">{p.name}</span>
                          <span className="font-semibold text-[#1D4ED8]">{priceOf(p)}</span>
                        </span>
                      </span>
                    </th>
                  ))}
                  <th className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-bold text-[#6B7280]">{t.colPlatforms}</th>
                  <th className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-start text-[12px] font-bold text-[#6B7280]">{t.colSyncing}</th>
                </tr>
              </thead>
              <tbody>
                {data.units.map((u) => {
                  const linked = platformsOf(u);
                  const s = rowSyncOf(ctx, cols, u);
                  return (
                    <tr key={u.id}>
                      <td className="border-t border-[#F3F4F6] px-4 py-3 align-middle text-[14px]">
                        <span className="flex flex-col gap-0.5">
                          <span className="font-semibold">{u.name}</span>
                          {u.count > 1 && <span className="text-[12px] text-[#4B5563]">{t.identical(u.count)}</span>}
                        </span>
                      </td>
                      {cols.map((p) => {
                        const c = cellFor(data, sugg, u, p);
                        return (
                          <td key={p.id} className="border-t border-[#F3F4F6] px-4 py-3 align-middle text-[14px]">
                            <div className="flex flex-col gap-1">
                              <DesktopCell ctx={ctx} u={u} p={p} c={c} act={cellActs(ctx, u, p, c)} />
                            </div>
                          </td>
                        );
                      })}
                      <td className="border-t border-[#F3F4F6] px-4 py-3 align-middle text-[14px]">
                        <span className="flex flex-col gap-1">
                          {linked.length > 0 && <Chips platforms={linked} />}
                          <span className="text-[12px] text-[#4B5563]">{linked.length ? t.platCount(linked.length) : t.notOnAny}</span>
                        </span>
                      </td>
                      <td className="border-t border-[#F3F4F6] px-4 py-3 align-middle text-[14px]">
                        {s.can && <Switch on={s.on} label={s.on ? t.syncOn : t.syncOff} onClick={s.toggle} disabled={ctx.busy} size="sm" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 min-[900px]:hidden">
            {data.units.map((u) => {
              const linked = platformsOf(u);
              const s = rowSyncOf(ctx, cols, u);
              const on = sel.has(u.id);
              return (
                <li key={u.id} className={`flex flex-col gap-1.5 rounded-xl border bg-white p-3 ${on ? "border-[#639922]" : "border-[#E5E7EB]"}`}>
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={t.select(u.name)}
                      onClick={() => toggle(u.id)}
                      className={`flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-[5px] text-[12px] font-bold text-white ${on ? "border-0 bg-[#639922]" : "border-[1.5px] border-[#9CA3AF] bg-white"}`}
                    >
                      {on ? "✓" : ""}
                    </button>
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[12px] text-[#6B7280]">{propName}</span>
                      <span className="text-[15px] font-bold">{u.name}</span>
                      {u.count > 1 && <span className="text-[12px] text-[#4B5563]">{t.identical(u.count)}</span>}
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Chips platforms={linked} size={24} />
                      <span className="text-[11px] text-[#4B5563]">{linked.length ? t.platCount(linked.length) : t.notOnAny}</span>
                    </span>
                  </div>
                  <ul className="m-0 list-none p-0">
                    {cols.map((p) => {
                      const c = cellFor(data, sugg, u, p);
                      const price = priceOf(p);
                      return (
                        <li key={p.id} className="flex items-center gap-2.5 border-t border-[#F3F4F6] py-2">
                          <Tile p={p} size={26} radius={6} font={11} />
                          <PhoneCell ctx={ctx} u={u} p={p} c={c} act={cellActs(ctx, u, p, c)} label={price === t.samePrice ? p.name : `${p.name} · ${price}`} />
                        </li>
                      );
                    })}
                  </ul>
                  {s.can && (
                    <div className="flex items-center justify-between border-t border-[#F3F4F6] pt-1.5">
                      <span className="text-[13px] font-semibold">{t.colSyncing}</span>
                      <Switch on={s.on} onClick={s.toggle} disabled={ctx.busy} size="sm" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {sel.size > 0 && (
            <div
              role="toolbar"
              aria-label={t.bulkActions}
              className="fixed inset-x-3 bottom-4 z-30 flex items-center gap-2 rounded-xl bg-[#111827] px-3 py-2.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] min-[900px]:hidden"
            >
              <span className="flex-1 text-[13px] font-semibold">{t.selected(sel.size)}</span>
              <button type="button" onClick={confirmSel} disabled={ctx.busy} className="flex h-9 cursor-pointer items-center rounded-lg border-0 bg-white px-2.5 text-[12px] font-semibold text-[#111827]">
                {t.confirmSugg}
              </button>
              <button type="button" onClick={syncSel} disabled={ctx.busy} className="flex h-9 cursor-pointer items-center rounded-lg border-0 bg-[#639922] px-2.5 text-[12px] font-semibold text-white">
                {t.startSync}
              </button>
            </div>
          )}
        </>
      )}

      <p className="m-0 text-[13px] text-[#6B7280] max-[899px]:mb-16">{t.propFootnote}</p>

      <Dialogs ctx={ctx} dlg={dlg} />
      {toast && (
        <Toast onClose={closeToast} closeLabel={t.close} place="content">
          {toast}
        </Toast>
      )}
    </>
  );
}
