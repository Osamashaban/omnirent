"use client";

// The Apartments & links tab: every unit type against every connected
// platform. Each cell is a link (with its syncing state), a suggested match
// to confirm, a "Link a listing" button, or the property's connection on
// property-by-property platforms. Phones show one card per unit type.

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "@/components/ops/icons";
import { Plug } from "@/components/broker/property-icons";
import { initials, platformById, type Platform } from "@/lib/channel-catalog";
import { cellFor, linkColumns, linkKey, platformState, ratePlanCount, type Cell, type UnitView } from "@/lib/channel-rules";
import { confirmMatches, linkUnit, notThis, unlinkUnit } from "@/app/actions/channels";
import { Issues } from "./PlatformsTab";
import { DownloadIcon, LinkIcon, Switch, Tile, btn } from "./parts";
import type { Ctx } from "./types";

export function LinksTab({ ctx }: { ctx: Ctx }) {
  const { t, data, sugg } = ctx;
  const [sel, setSel] = useState<Set<string>>(new Set());
  const cols = linkColumns(data);
  const abbOn = ["on", "attn"].includes(platformState(data, platformById("abb")!));
  const nSugg = Object.keys(sugg).length;
  const propName = (id: string) => data.props.find((p) => p.id === id)?.name ?? "";

  const toggle = (id: string, on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const targetUnits = () => (sel.size ? [...sel] : data.units.map((u) => u.id));
  const confirmAll = async () => {
    const r = await ctx.run(() => confirmMatches({ unitTypeIds: sel.size ? [...sel] : null }));
    if (r) {
      setSel(new Set());
      ctx.say(t.confirmedN(r.n));
    }
  };
  const syncSel = async (on: boolean) => {
    const units = new Set(targetUnits());
    const ids = data.links.filter((l) => units.has(l.unitTypeId) && cols.some((c) => c.id === l.platform) && l.syncOn !== on).map((l) => l.id);
    setSel(new Set());
    await ctx.sync(ids, on);
  };

  const cellActions = (u: UnitView, p: Platform, c: Cell) => cellActs(ctx, u, p, c);
  const rowSync = (u: UnitView) => rowSyncOf(ctx, cols, u);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5 max-[899px]:hidden">
        {abbOn && (
          <button type="button" onClick={() => ctx.open({ k: "pull" })} className={`${btn.smallSecondary} h-10 text-[#111827]`}>
            <DownloadIcon />
            {t.pullAbb}
          </button>
        )}
        <Link href="/broker/properties/new" className={`${btn.smallSecondary} h-10 text-[#111827] no-underline`}>
          <Plus size={16} />
          {t.addManual}
        </Link>
        <span className="flex-1" />
        {nSugg > 0 && (
          <button type="button" onClick={confirmAll} disabled={ctx.busy} className={`${btn.smallPrimary} h-10`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t.confirmAll(nSugg)}
          </button>
        )}
      </div>

      {(abbOn || nSugg > 0) && (
        <div className="flex gap-2 min-[900px]:hidden">
          {abbOn && (
            <button type="button" onClick={() => ctx.open({ k: "pull" })} className={`${btn.secondary} h-10 flex-1 px-2.5 text-[13px]`}>
              <DownloadIcon />
              {t.pullAbbPhone}
            </button>
          )}
          {nSugg > 0 && (
            <button type="button" onClick={confirmAll} disabled={ctx.busy} className={`${btn.primary} h-10 flex-1 px-2.5 text-[13px]`}>
              {t.confirmAll(nSugg)}
            </button>
          )}
        </div>
      )}

      <Issues ctx={ctx} />

      {nSugg > 0 && (
        <div className="flex gap-2.5 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3 text-[14px] text-[#92400E] max-[899px]:hidden">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>{t.suggTxt(nSugg)}</span>
        </div>
      )}

      {sel.size > 0 && (
        <div role="toolbar" aria-label={t.bulkActions} className="flex flex-wrap items-center gap-2.5 rounded-[10px] bg-[#111827] px-3.5 py-2.5 text-white max-[899px]:hidden">
          <span className="text-[14px] font-semibold">{t.selected(sel.size)}</span>
          <span className="flex-1" />
          <button type="button" onClick={confirmAll} disabled={ctx.busy} className={`${btn.smallSecondary} border-0 text-[#111827]`}>
            {t.confirmSugg}
          </button>
          <button type="button" onClick={() => syncSel(true)} disabled={ctx.busy} className={btn.smallPrimary}>
            {t.startSync}
          </button>
          <button type="button" onClick={() => syncSel(false)} disabled={ctx.busy} className={`${btn.smallSecondary} border-[#6B7280] bg-transparent text-white`}>
            {t.stopSync}
          </button>
          <button type="button" onClick={() => setSel(new Set())} aria-label={t.clearSel} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-white">
            <X size={18} />
          </button>
        </div>
      )}

      {cols.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
            <Plug size={26} />
          </span>
          <h2 className="m-0 text-[20px] font-bold">{t.noColsTitle}</h2>
          <p className="m-0 max-w-[460px] text-[15px] leading-[1.7] text-[#4B5563]">{t.noColsBody}</p>
          <button type="button" onClick={() => ctx.setTab("plat")} className={`${btn.primary} max-[899px]:w-full`}>
            {t.goPlat}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop grid */}
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white max-[899px]:hidden">
            <div style={{ minWidth: 600 + cols.length * 170 }}>
              <div className="flex border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="flex-[0_0_300px] px-4 py-3 text-[12px] font-bold text-[#6B7280]">{t.colApartment}</div>
                {cols.map((p) => {
                  const st = platformState(data, p);
                  return (
                    <div key={p.id} className="flex min-w-0 flex-[1_1_0] items-center gap-2 border-s border-[#E5E7EB] px-3 py-2.5">
                      <Tile p={p} size={24} radius={6} font={11} />
                      <span className="flex min-w-0 flex-col">
                        <span dir="ltr" className="truncate rtl:text-right text-[13px] font-bold">{p.name}</span>
                        <span className={`text-[11px] font-semibold ${st === "on" ? "text-[#15803D]" : st === "wait" ? "text-[#92400E]" : st === "attn" ? "text-[#B91C1C]" : "text-[#4B5563]"}`}>
                          {t.st[st]}
                        </span>
                      </span>
                    </div>
                  );
                })}
                <div className="flex-[0_0_150px] border-s border-[#E5E7EB] px-4 py-3 text-[12px] font-bold text-[#6B7280]">{t.colPlatforms}</div>
                <div className="flex-[0_0_150px] border-s border-[#E5E7EB] px-4 py-3 text-[12px] font-bold text-[#6B7280]">{t.colSyncing}</div>
              </div>
              {data.units.map((u) => {
                const linked = cols.filter((p) => data.links.some((l) => l.unitTypeId === u.id && l.platform === p.id));
                const s = rowSync(u);
                return (
                  <div key={u.id} className="flex min-h-[72px] border-t border-[#F3F4F6]">
                    <div className="flex flex-[0_0_300px] items-center gap-2.5 px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={sel.has(u.id)}
                        onChange={(e) => toggle(u.id, e.target.checked)}
                        aria-label={t.select(u.name)}
                        className="h-[18px] w-[18px] flex-none accent-[#639922]"
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[12px] text-[#6B7280]">{propName(u.propertyId)}</span>
                        <span className="text-[14px] font-semibold">{u.name}</span>
                        {u.count > 1 && <span className="text-[12px] text-[#4B5563]">{t.identical(u.count)}</span>}
                      </span>
                    </div>
                    {cols.map((p) => (
                      <div key={p.id} className="flex min-w-0 flex-[1_1_0] flex-col justify-center gap-1 border-s border-[#F3F4F6] px-3 py-2.5">
                        <DesktopCell ctx={ctx} u={u} p={p} c={cellFor(data, sugg, u, p)} act={cellActions(u, p, cellFor(data, sugg, u, p))} />
                      </div>
                    ))}
                    <div className="flex flex-[0_0_150px] flex-col justify-center gap-1.5 border-s border-[#F3F4F6] px-4 py-2.5">
                      <Chips platforms={linked} />
                      <span className="text-[12px] text-[#4B5563]">{t.platCount(linked.length)}</span>
                    </div>
                    <div className="flex flex-[0_0_150px] items-center border-s border-[#F3F4F6] px-4 py-2.5">
                      {s.can && <Switch on={s.on} label={s.on ? t.syncOn : t.syncOff} onClick={s.toggle} disabled={ctx.busy} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phone cards */}
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 min-[900px]:hidden">
            {data.units.map((u) => {
              const linked = cols.filter((p) => data.links.some((l) => l.unitTypeId === u.id && l.platform === p.id));
              const s = rowSync(u);
              const on = sel.has(u.id);
              return (
                <li key={u.id} className={`flex flex-col gap-1.5 rounded-xl border bg-white p-3 ${on ? "border-[#639922]" : "border-[#E5E7EB]"}`}>
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={t.select(u.name)}
                      onClick={() => toggle(u.id, !on)}
                      className={`flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-[5px] text-[12px] font-bold text-white ${on ? "border-0 bg-[#639922]" : "border-[1.5px] border-[#D1D5DB] bg-white"}`}
                    >
                      {on ? "✓" : ""}
                    </button>
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[12px] text-[#6B7280]">{propName(u.propertyId)}</span>
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
                      return (
                        <li key={p.id} className="flex items-center gap-2.5 border-t border-[#F3F4F6] py-2">
                          <Tile p={p} size={26} radius={6} font={11} />
                          <PhoneCell ctx={ctx} u={u} p={p} c={c} act={cellActions(u, p, c)} />
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
              <button type="button" onClick={confirmAll} disabled={ctx.busy} className="flex h-9 cursor-pointer items-center rounded-lg border-0 bg-white px-2.5 text-[12px] font-semibold text-[#111827]">
                {t.confirmSugg}
              </button>
              <button type="button" onClick={() => syncSel(true)} disabled={ctx.busy} className="flex h-9 cursor-pointer items-center rounded-lg border-0 bg-[#639922] px-2.5 text-[12px] font-semibold text-white">
                {t.startSync}
              </button>
            </div>
          )}
        </>
      )}

      <p className="m-0 text-[13px] leading-[1.6] text-[#6B7280] max-[899px]:mb-16">{t.footnote}</p>
    </>
  );
}

// What a cell's buttons do, on this tab and on a property's Channels tab.
export function cellActs(ctx: Ctx, u: UnitView, p: Platform, c: Cell): Acts {
  const { t, data } = ctx;
  return {
    confirm: async () => {
      if (c.kind !== "sugg") return;
      const r = await ctx.run(() => linkUnit({ unitTypeId: u.id, platform: p.id, listingId: c.listing.id }));
      if (!r) return;
      if (r.result !== "ok") return ctx.say(t.failed);
      const g = c.listing.guests ?? 0;
      ctx.say(u.guests && g && u.guests !== g ? t.linkedWarn(u.guests, g, p.name) : t.linked);
      if (c.listing.rates.length) ctx.open({ k: "rates", p: p.id, u: u.id, fresh: true });
    },
    dismiss: async () => {
      if (c.kind !== "sugg") return;
      await ctx.run(() => notThis({ unitTypeId: u.id, listingId: c.listing.id }));
    },
    unlink: async () => {
      if (data.future[linkKey(u.id, p.id)]?.length) return ctx.open({ k: "unblock", p: p.id, u: u.id });
      const r = await ctx.run(() => unlinkUnit({ unitTypeId: u.id, platform: p.id }));
      if (!r) return;
      if (r.result === "blocked") return ctx.open({ k: "unblock", p: p.id, u: u.id });
      ctx.say(r.result === "ok" ? t.unlinked(u.name, p.name) : t.failed);
    },
  };
}

// The Syncing switch of a unit type's row.
export function rowSyncOf(ctx: Ctx, cols: Platform[], u: UnitView) {
  const links = ctx.data.links.filter((l) => l.unitTypeId === u.id && cols.some((c) => c.id === l.platform));
  const on = links.some((l) => l.syncOn);
  return {
    can: links.length > 0,
    on,
    toggle: () => (on ? ctx.sync(links.filter((l) => l.syncOn).map((l) => l.id), false, u.name) : ctx.sync(links.map((l) => l.id), true)),
  };
}

export function Chips({ platforms, size = 26 }: { platforms: Platform[]; size?: number }) {
  return (
    <div className="flex items-center">
      {platforms.slice(0, 3).map((p) => (
        <span key={p.id} title={p.name} className="-me-1.5 flex items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white" style={{ width: size, height: size, background: p.color }}>
          {initials(p.name)}
        </span>
      ))}
      {platforms.length > 3 && (
        <span dir="ltr" className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full border-2 border-white bg-[#E5E7EB] px-1.5 text-[11px] font-bold text-[#111827]">
          +{platforms.length - 3}
        </span>
      )}
    </div>
  );
}

export type Acts = { confirm: () => void; dismiss: () => void; unlink: () => void };

function subOf(ctx: Ctx, c: Extract<Cell, { kind: "linked" }>) {
  const { t } = ctx;
  const label = { paused: t.subPaused, unlisted: t.subUnlisted, failed: t.subFailed, live: t.subLive, off: t.subOff }[c.sub];
  const color = c.sub === "live" ? "text-[#15803D]" : c.sub === "off" ? "text-[#92400E]" : "text-[#B91C1C]";
  return { label, color };
}

function whyOf(ctx: Ctx, c: Extract<Cell, { kind: "linked" }>) {
  return () =>
    ctx.open({
      k: "act",
      outcomes: [{ linkId: c.link.id, unitTypeId: c.link.unitTypeId, platform: c.link.platform, ok: false, error: c.link.error ?? { code: "reach", msg: "" } }],
    });
}

export function DesktopCell({ ctx, u, p, c, act }: { ctx: Ctx; u: UnitView; p: Platform; c: Cell; act: Acts }) {
  const { t } = ctx;
  if (c.kind === "linked") {
    const sub = subOf(ctx, c);
    const label = c.listing?.name ?? "";
    return (
      <>
        <div className="flex items-start gap-1.5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold" title={label}>
              {label}
            </span>
            <span className={`text-[12px] font-semibold ${sub.color}`}>{sub.label}</span>
          </span>
          <button
            type="button"
            onClick={act.unlink}
            aria-label={t.unlink}
            title={t.unlink}
            className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[#6B7280]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {c.guests && (
            <span title={t.guestsWarn(c.guests[0], c.guests[1])} className="flex items-center gap-1 text-[11px] font-semibold text-[#B45309]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              {t.guestsWarn(c.guests[0], c.guests[1])}
            </span>
          )}
          {c.sub === "failed" && (
            <button type="button" onClick={whyOf(ctx, c)} className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold text-[#B91C1C] underline">
              {t.seeWhy}
            </button>
          )}
          {!!c.listing?.rates.length && (
            <button
              type="button"
              onClick={() => ctx.open({ k: "rates", p: p.id, u: u.id, fresh: false })}
              className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold text-[#1D4ED8] underline"
            >
              {t.ratePlans(ratePlanCount(c.link.ratePlans))}
            </button>
          )}
        </div>
      </>
    );
  }
  if (c.kind === "sugg")
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-[#F59E0B] bg-[#FFFBEB] p-2">
        <span className="text-[11px] font-bold text-[#92400E]">{t.suggested}</span>
        <span className="truncate text-[13px] font-semibold" title={c.listing.name}>
          {c.listing.name}
        </span>
        <div className="flex gap-1.5">
          <button type="button" onClick={act.confirm} disabled={ctx.busy} className="h-[30px] cursor-pointer rounded-md border-0 bg-[#639922] px-2.5 text-[12px] font-semibold text-white">
            {t.confirm}
          </button>
          <button type="button" onClick={act.dismiss} disabled={ctx.busy} className="h-[30px] cursor-pointer rounded-md border border-[#D1D5DB] bg-white px-2.5 text-[12px] font-semibold text-[#374151]">
            {t.notThis}
          </button>
        </div>
      </div>
    );
  if (c.kind === "none")
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => ctx.open({ k: "pick", p: p.id, u: u.id })}
          className="flex h-[30px] cursor-pointer items-center gap-1.5 rounded-md border border-[#D1D5DB] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
        >
          <LinkIcon />
          {t.linkListing}
        </button>
        <button type="button" onClick={() => ctx.open({ k: "create", p: p.id, u: u.id })} className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium text-[#3B6D11] underline">
          {t.notOnIt}
        </button>
      </div>
    );
  if (c.kind === "wait") return <span className="text-[12px] text-[#92400E]">{c.property ? t.propWaiting : t.waitPlatform}</span>;
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-[12px] text-[#6B7280]">{c.rejected ? t.propDeclined : t.propNotHere}</span>
      <button
        type="button"
        onClick={() => ctx.open({ k: "guide", p: p.id, prop: c.propertyId })}
        className="flex h-[30px] cursor-pointer items-center gap-1.5 rounded-md border border-[#639922] bg-white px-2.5 text-[12px] font-semibold text-[#3B6D11]"
      >
        <Plug size={14} />
        {c.rejected ? t.btnTryAgain : t.connectProp}
      </button>
    </div>
  );
}

export function PhoneCell({ ctx, u, p, c, act, label }: { ctx: Ctx; u: UnitView; p: Platform; c: Cell; act: Acts; label?: string }) {
  const { t } = ctx;
  const name = <span className="text-[12px] text-[#6B7280]">{label ?? p.name}</span>;
  const line = (text: string) => <span className="truncate text-[13px] font-semibold">{text}</span>;
  if (c.kind === "linked") {
    const sub = subOf(ctx, c);
    return (
      <>
        <span className="flex min-w-0 flex-1 flex-col">
          {name}
          {line(c.listing?.name ?? "")}
          {c.sub === "failed" && (
            <button type="button" onClick={whyOf(ctx, c)} className="self-start border-0 bg-transparent p-0 text-[12px] font-semibold text-[#B91C1C] underline">
              {t.seeWhy}
            </button>
          )}
        </span>
        <span className={`text-[12px] font-semibold ${sub.color}`}>{sub.label}</span>
      </>
    );
  }
  if (c.kind === "sugg")
    return (
      <>
        <span className="flex min-w-0 flex-1 flex-col">
          {name}
          <span className="text-[11px] font-bold text-[#92400E]">{t.suggestedPhone}</span>
          {line(c.listing.name)}
        </span>
        <button type="button" onClick={act.confirm} disabled={ctx.busy} className="flex h-[30px] cursor-pointer items-center rounded-md border-0 bg-[#639922] px-2.5 text-[12px] font-semibold text-white">
          {t.confirm}
        </button>
      </>
    );
  if (c.kind === "none")
    return (
      <>
        <span className="flex min-w-0 flex-1 flex-col">
          {name}
          <button type="button" onClick={() => ctx.open({ k: "create", p: p.id, u: u.id })} className="self-start border-0 bg-transparent p-0 text-[13px] font-semibold text-[#111827]">
            {t.notOnIt}
          </button>
        </span>
        <button
          type="button"
          onClick={() => ctx.open({ k: "pick", p: p.id, u: u.id })}
          className="flex h-[30px] cursor-pointer items-center gap-1 rounded-md border border-[#D1D5DB] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
        >
          <LinkIcon />
          {t.linkPhone}
        </button>
      </>
    );
  if (c.kind === "wait")
    return (
      <>
        <span className="flex min-w-0 flex-1 flex-col">
          {name}
          {line(c.property ? t.propWaiting : t.waitPlatform)}
        </span>
        <span className="text-[12px] text-[#92400E]">{t.waitPhone}</span>
      </>
    );
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        {name}
        {line(c.rejected ? t.propDeclined : t.propNotHere)}
      </span>
      <button
        type="button"
        onClick={() => ctx.open({ k: "guide", p: p.id, prop: c.propertyId })}
        className="flex h-[30px] cursor-pointer items-center rounded-md border border-[#639922] bg-white px-2.5 text-[12px] font-semibold text-[#3B6D11]"
      >
        {c.rejected ? t.btnTryAgain : t.connectProp}
      </button>
    </>
  );
}
