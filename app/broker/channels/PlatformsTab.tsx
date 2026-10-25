"use client";

// The Platforms tab: the counts, what needs attention, the eight platforms
// recommended for Egypt as cards and every other platform as a list, with a
// search and filters. Phones show the same platforms as rows.

import { useState } from "react";
import { AlertCircle, Search } from "@/components/ops/icons";
import { Plug } from "@/components/broker/property-icons";
import { PLATFORMS, RECOMMENDED, guideFor, isPropertyLevel, platformById, type Platform } from "@/lib/channel-catalog";
import { accountOf, connsOf, filterCounts, kpis, linkedCount, platformList, platformState, type Filter, type St } from "@/lib/channel-rules";
import { apts, dateRangeText } from "@/lib/channel-i18n";
import { dismissIssue } from "@/app/actions/channels";
import { Pill, Tile, btn } from "./parts";
import type { Ctx } from "./types";

type Card = {
  p: Platform;
  st: St;
  count: string;
  countMuted: boolean;
  phoneCount: string;
  price: string | null;
  note: string | null;
  noteRed: boolean;
  alert: boolean;
  btn: string;
  btnKind: "na" | "primary" | "secondary";
  act: () => void;
};

export function cardOf(ctx: Ctx, p: Platform): Card {
  const { t, data } = ctx;
  const st = platformState(data, p);
  const n = linkedCount(data, p.id);
  const conns = connsOf(data, p.id);
  const acc = accountOf(data, p.id);
  const off = st === "off" || st === "na";
  const count = off
    ? t.how[p.how]
    : isPropertyLevel(p)
      ? t.countProp(conns.filter((c) => c.state === "on").length, n) + (conns.some((c) => c.state === "wait") ? t.countWaiting(conns.filter((c) => c.state === "wait").length) : "")
      : t.countLinked(n);
  const mode = acc?.priceMode ?? "same";
  const price = !off && mode !== "same" && acc?.pricePct ? (mode === "up" ? t.priceUp(acc.pricePct) : t.priceDown(acc.pricePct)) : null;
  const waitWhy = isPropertyLevel(p) ? (conns.find((c) => c.state === "wait")?.waitReason ?? null) : (acc?.waitReason ?? null);
  const note =
    st === "na"
      ? (guideFor(p, ctx.lang).why ?? null)
      : st === "rej"
        ? (conns.find((c) => c.state === "rej")?.rejectReason ?? null)
        : st === "attn"
          ? p.id === "abb"
            ? t.noteAbbAttn
            : t.noteLoginAttn(p.name)
          : st === "wait"
            ? waitWhy === "confirm" || waitWhy === "cur"
              ? t.noteConfirm(p.name)
              : p.how === "request"
                ? t.noteRequest
                : t.noteSup
            : null;
  const act = () => {
    if (st === "na") return;
    if (st === "rej") return ctx.open({ k: "guide", p: p.id, prop: conns.find((c) => c.state === "rej")?.propertyId ?? null });
    if (st === "off" || st === "attn") return p.how === "account" ? ctx.open({ k: "abb", wait: false }) : ctx.open({ k: "guide", p: p.id, re: st === "attn" });
    ctx.open({ k: "manage", p: p.id });
  };
  return {
    p,
    st,
    count,
    countMuted: off,
    phoneCount: st === "on" || st === "attn" ? apts(ctx.lang, n) : "",
    price,
    note,
    noteRed: st === "rej" || st === "attn",
    alert: st === "rej" || st === "attn",
    btn: st === "na" ? t.btnNa : st === "off" ? (p.how === "unk" ? t.btnRequest : t.btnConnect) : st === "attn" ? t.btnReconnect : st === "rej" ? t.btnTryAgain : t.btnManage,
    btnKind: st === "na" ? "na" : st === "off" || st === "attn" || st === "rej" ? "primary" : "secondary",
    act,
  };
}

const cardBtn: Record<Card["btnKind"], string> = {
  na: "bg-[#F3F4F6] text-[#9CA3AF] border-0 cursor-not-allowed",
  primary: "bg-[#639922] text-white border-0",
  secondary: "bg-white text-[#111827] border border-[#D1D5DB]",
};

// Each alert's words and buttons (also used by a property's Channels tab).
export function issueItems(ctx: Ctx) {
  const { t, data } = ctx;
  const unitName = (id: string | null) => {
    const u = data.units.find((x) => x.id === id);
    if (!u) return "";
    const prop = data.props.find((x) => x.id === u.propertyId);
    return prop ? `${prop.name} · ${u.name}` : u.name;
  };
  const items = data.issues.map((i) => {
    const p = platformById(i.platform) ?? null;
    const d = i.data ?? {};
    const args = {
      p: p?.name ?? "",
      u: unitName(i.unitTypeId),
      room: d.room ?? "",
      code: d.code ?? "",
      dates: d.from && d.to ? dateRangeText(ctx.lang, d.from, d.to) : d.date ? t.dateOf(d.date) : "",
      msg: d.msg ?? "",
    };
    const kind = (["unlinked", "rate", "roomgone", "unlisted"].includes(i.kind) ? i.kind : "rate") as keyof typeof t.issue;
    const def = t.issue[kind];
    const fix = () => {
      if (kind === "rate") {
        window.location.href = "/broker/calendar";
        return;
      }
      ctx.setTab("links");
    };
    const dismiss = async () => {
      if (await ctx.run(() => dismissIssue({ id: i.id }))) ctx.say(t.dismissed);
    };
    return { id: i.id, p, title: def.title, text: def.text(args), fixLbl: def.fix(args), fix, dismiss };
  });
  return items;
}

// The alerts above both tabs.
export function Issues({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const items = issueItems(ctx);
  if (!items.length) return null;
  return (
    <>
      <section
        aria-label={t.issuesTitle(items.length)}
        className="flex flex-col gap-2.5 rounded-xl border border-[#FECACA] bg-white p-4 shadow-[inset_4px_0_0_#DC2626] max-[899px]:hidden rtl:shadow-[inset_-4px_0_0_#DC2626]"
      >
        <h2 className="m-0 flex items-center gap-2 text-[17px] font-bold text-[#B91C1C]">
          <AlertCircle />
          {t.issuesTitle(items.length)}
        </h2>
        {items.map((i) => (
          <div key={i.id} className="flex items-start gap-3 border-t border-[#F3F4F6] py-3">
            <Tile p={i.p} size={32} radius={8} font={13} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[14px] font-bold">{i.title}</span>
              <span className="text-[13px] leading-[1.6] text-[#4B5563]">{i.text}</span>
            </div>
            <div className="flex flex-none gap-2">
              <button type="button" onClick={i.fix} className={btn.smallPrimary}>
                {i.fixLbl}
              </button>
              <button type="button" onClick={i.dismiss} disabled={ctx.busy} className={btn.smallSecondary}>
                {t.dismiss}
              </button>
            </div>
          </div>
        ))}
      </section>
      <section aria-label={t.issuesTitle(items.length)} className="flex flex-col gap-3 min-[900px]:hidden">
        <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-[#B91C1C]">
          <AlertCircle />
          {t.issuesTitle(items.length)}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((i) => (
            <li key={i.id} className="flex flex-col gap-2 rounded-xl border border-[#FECACA] bg-white p-3">
              <div className="flex gap-2.5">
                <Tile p={i.p} size={28} radius={6} font={12} />
                <span className="flex flex-col gap-1">
                  <span className="text-[14px] font-bold">{i.title}</span>
                  <span className="text-[13px] leading-[1.5] text-[#4B5563]">{i.text}</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={i.fix}
                  className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border-0 bg-[#639922] px-2 text-center text-[13px] font-semibold text-white"
                >
                  {i.fixLbl}
                </button>
                <button
                  type="button"
                  onClick={i.dismiss}
                  disabled={ctx.busy}
                  className="flex h-10 cursor-pointer items-center rounded-lg border border-[#D1D5DB] bg-white px-3 text-[13px] font-semibold text-[#111827]"
                >
                  {t.dismiss}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function PlatformsTab({ ctx }: { ctx: Ctx }) {
  const { t, data } = ctx;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const k = kpis(data, data.issues.length);
  const counts = filterCounts(data);
  const query = q.trim();
  const showRec = !query && filter === "all";
  const all = platformList(data, q, filter);
  const shown = showAll || !showRec ? all : all.slice(0, 10);
  const noneConnected = PLATFORMS.every((p) => ["off", "na"].includes(platformState(data, p)));
  const filters: [Filter, string][] = [
    ["all", t.filterAll],
    ["on", t.filterOn],
    ["wait", t.filterWait],
    ["off", t.filterOff],
  ];
  const recCards = RECOMMENDED.map((p) => cardOf(ctx, p));
  const rows = shown.map((p) => cardOf(ctx, p));
  const phoneRows = showRec ? recCards : rows;

  return (
    <>
      {/* Desktop */}
      <div className="flex flex-wrap gap-3 max-[899px]:hidden">
        {[
          [t.kOn, k.on],
          [t.kWait, k.wait],
          [t.kAttn, k.attn],
          [t.kLive, t.aOfB(k.live, k.units)],
        ].map(([label, v]) => (
          <div key={String(label)} className="flex flex-[1_1_160px] flex-col gap-1 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3.5">
            <span className="text-[13px] text-[#6B7280]">{label}</span>
            <span className="text-[24px] font-bold tabular-nums">{v}</span>
          </div>
        ))}
      </div>

      {/* Phone counts */}
      <div className="grid grid-cols-3 gap-2 min-[900px]:hidden">
        {[
          [t.kOnPhone, String(k.on)],
          [t.kWaitPhone, String(k.wait)],
          [t.kLivePhone, t.aOfB(k.live, k.units)],
        ].map(([label, v]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5">
            <span className="text-[12px] text-[#6B7280]">{label}</span>
            <span className="text-[20px] font-bold">{v}</span>
          </div>
        ))}
      </div>

      <Issues ctx={ctx} />

      {noneConnected && (
        <div className="flex items-center gap-3.5 rounded-xl border border-[#C0DD97] bg-[#F7FBF1] px-[18px] py-4 max-[899px]:flex-col max-[899px]:gap-2.5 max-[899px]:px-4 max-[899px]:py-6 max-[899px]:text-center">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11] max-[899px]:h-[52px] max-[899px]:w-[52px]">
            <Plug size={22} />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-[16px] font-bold max-[899px]:text-[17px]">{t.startTitle}</span>
            <span className="text-[14px] text-[#4B5563] max-[899px]:text-[13px] max-[899px]:leading-[1.6]">{t.startBody}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative flex flex-[0_1_300px] items-center max-[899px]:flex-1">
          <span className="absolute start-3 flex text-[#6B7280]">
            <Search />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t.searchPlatforms}
            placeholder={t.searchPlatforms}
            className="hidden h-10 w-full rounded-lg border border-[#D1D5DB] bg-white pe-3 ps-10 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] min-[900px]:block"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t.searchPlatforms}
            placeholder={t.searchPhone(PLATFORMS.length)}
            className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pe-3 ps-10 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] min-[900px]:hidden"
          />
        </label>
        <div className="flex flex-wrap gap-1.5 max-[899px]:hidden">
          {filters.map(([f, label]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`h-[34px] cursor-pointer rounded-full px-3 text-[13px] font-semibold ${
                filter === f ? "border-[1.5px] border-[#639922] bg-[#EAF3DE] text-[#27500A]" : "border border-[#D1D5DB] bg-white text-[#374151]"
              }`}
            >
              {label} {counts[f]}
            </button>
          ))}
        </div>
      </div>

      {showRec && (
        <section className="flex flex-col gap-3 max-[899px]:hidden">
          <div className="flex items-baseline gap-2.5">
            <h2 className="m-0 text-[18px] font-bold">{t.recTitle}</h2>
            <span className="text-[13px] text-[#6B7280]">{t.recSub}</span>
          </div>
          <div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-2">
            {recCards.map((c) => (
              <div key={c.p.id} className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
                <div className="flex items-center gap-3">
                  <Tile p={c.p} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold" title={c.p.name}>
                    {c.p.name}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill st={c.st} label={t.st[c.st]} />
                  <span className={`text-[13px] ${c.countMuted ? "text-[#6B7280]" : "font-semibold text-[#111827]"}`}>{c.count}</span>
                </div>
                {c.price && (
                  <span className="inline-flex h-6 items-center gap-1.5 self-start rounded-full bg-[#EFF6FF] px-2.5 text-[12px] font-semibold text-[#1D4ED8]">{c.price}</span>
                )}
                {c.note && <span className={`text-[12px] leading-[1.5] ${c.noteRed ? "text-[#B91C1C]" : "text-[#4B5563]"}`}>{c.note}</span>}
                <button
                  type="button"
                  onClick={c.act}
                  disabled={c.btnKind === "na"}
                  className={`mt-auto inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold disabled:opacity-100 ${cardBtn[c.btnKind]}`}
                >
                  {c.btn}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 max-[899px]:hidden">
        <h2 className="m-0 text-[18px] font-bold">{showRec ? t.allTitle(PLATFORMS.length - RECOMMENDED.length) : t.results(all.length)}</h2>
        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <div className="grid grid-cols-[minmax(0,2fr)_180px_200px_150px] gap-3 border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-[12px] font-bold text-[#6B7280]">
              <span>{t.colPlatform}</span>
              <span>{t.colStatus}</span>
              <span>{t.colLinked}</span>
              <span />
            </div>
            {rows.map((c) => (
              <div key={c.p.id} className="grid grid-cols-[minmax(0,2fr)_180px_200px_150px] items-center gap-3 border-t border-[#F3F4F6] px-4 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <Tile p={c.p} size={32} radius={8} font={13} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[14px] font-semibold">{c.p.name}</span>
                    <span className="text-[12px] text-[#6B7280]">{t.how[c.p.how]}</span>
                    {c.alert && c.note && <span className="mt-0.5 text-[12px] leading-[1.5] text-[#B91C1C]">{c.note}</span>}
                  </span>
                </span>
                <span>
                  <Pill st={c.st} label={t.st[c.st]} />
                </span>
                <span className={`text-[13px] ${c.countMuted ? "text-[#6B7280]" : "font-semibold text-[#111827]"}`}>{c.st === "off" ? "—" : c.count}</span>
                <span className="flex justify-end">
                  <button
                    type="button"
                    onClick={c.act}
                    disabled={c.btnKind === "na"}
                    className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold disabled:opacity-100 ${
                      c.st === "off" ? "border border-[#639922] bg-white text-[#3B6D11]" : cardBtn[c.btnKind]
                    }`}
                  >
                    {c.btn}
                  </button>
                </span>
              </div>
            ))}
            {showRec && !showAll && all.length > 10 && (
              <div className="border-t border-[#E5E7EB] px-4 py-3">
                <button type="button" onClick={() => setShowAll(true)} className={`${btn.link} text-[14px]`}>
                  {t.showAll(all.length)}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center text-[14px] text-[#4B5563]">{t.noResults}</div>
        )}
      </section>

      {/* Phone list */}
      <div className="flex flex-col gap-3 min-[900px]:hidden">
        {showRec && <span className="text-[15px] font-bold">{t.recTitle}</span>}
        {phoneRows.length ? <PhoneRows ctx={ctx} cards={phoneRows} /> : <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white p-6 text-center text-[14px] text-[#4B5563]">{t.noResults}</div>}
        {showRec && (
          <>
            <span className="text-[15px] font-bold">{t.allTitle(PLATFORMS.length - RECOMMENDED.length)}</span>
            <PhoneRows ctx={ctx} cards={rows} />
            {!showAll && all.length > 10 && (
              <button type="button" onClick={() => setShowAll(true)} className={`${btn.link} self-start py-2 text-[14px]`}>
                {t.showAll(all.length)}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PhoneRows({ ctx, cards }: { ctx: Ctx; cards: Card[] }) {
  const { t } = ctx;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {cards.map((c) => (
        <li key={c.p.id} className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3">
          <div className="flex items-center gap-3">
            <Tile p={c.p} font={15} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[15px] font-bold">{c.p.name}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                <Pill st={c.st} label={t.st[c.st]} />
                <span className="text-[12px] text-[#4B5563]">{c.phoneCount}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={c.act}
              disabled={c.btnKind === "na"}
              className={`flex h-9 flex-none cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold disabled:opacity-100 ${cardBtn[c.btnKind]}`}
            >
              {c.btn}
            </button>
          </div>
          {c.alert && c.note && <span className="text-[12px] leading-[1.5] text-[#B91C1C]">{c.note}</span>}
        </li>
      ))}
    </ul>
  );
}
