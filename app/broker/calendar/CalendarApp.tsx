"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { retryCalendar, saveCalendar, undoCalendar, type CalendarResult } from "@/app/actions/calendar";
import type { CalendarData, CalTypeView } from "@/lib/calendar-data";
import { CALENDAR_DICTS, type CalendarDict } from "@/lib/calendar-i18n";
import type { Lang } from "@/lib/i18n";
import {
  GRID_SPAN,
  PHONE_SPAN,
  SAT_FIRST,
  UNDO_SECONDS,
  addDays,
  blankSpec,
  dateRange,
  lastEditable,
  monthCells,
  nightOf,
  overrideKey,
  weekday,
  type BlockReason,
  type EditSpec,
  type Override,
} from "@/lib/calendar-rules";
import { currencyLabel, formatMoney } from "@/lib/property-rules";
import { AlertCircle, Chevron, Info, Plus, Search } from "@/components/ops/icons";
import { CalendarIcon, ChevronEnd, ChevronStart, Sliders } from "@/components/broker/property-icons";
import { smallPrimaryButtonClass } from "@/components/ops/ui";
import { CalendarToast, Corners, SyncPill, gridLook, monthLook, num, type SyncState, type ToastState } from "./parts";
import { EditPanel, PhoneEditSheet, type PanelForm } from "./EditPanel";
import { BulkEdit } from "./BulkEdit";

// A selection: a block of unit type rows (grid) or one unit type (month and
// phone views), from one night to another.
type Sel = { month: boolean; r0: number; r1: number; d0: string; d1: string };

export type SelInfo = { from: string; to: string; types: CalTypeView[] };

const btn =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${btn} border-0 bg-[#639922] text-white shadow-[0_4px_16px_rgba(99,153,34,0.30)] hover:bg-[#4E8F20]`;
const secondary = `${btn} border border-[#D1D5DB] bg-white text-[#111827] hover:bg-[#F9FAFB]`;
const square =
  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#111827] disabled:cursor-not-allowed disabled:opacity-40";

export function CalendarApp({ lang, data }: { lang: Lang; data: CalendarData }) {
  const t = CALENDAR_DICTS[lang];
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { today, properties, types } = data;
  const last = lastEditable(today);

  const overrides = useMemo(() => new Map<string, Override>(Object.entries(data.overrides)), [data.overrides]);
  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const money = useCallback(
    (n: number, type?: CalTypeView) => formatMoney(n, (type && propById.get(type.propertyId)?.currency) || "EGP", lang),
    [propById, lang],
  );
  const night = useCallback((type: CalTypeView, date: string) => nightOf(type, date, overrides.get(overrideKey(type.id, date))), [overrides]);

  const [view, setView] = useState<"all" | "month">("all");
  const [phoneView, setPhoneView] = useState<"days" | "month">("days");
  const [start, setStart] = useState(today);
  const [month, setMonth] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mTypeId, setMTypeId] = useState(types[0]?.id ?? "");
  const mType = types.find((x) => x.id === mTypeId) ?? types[0];

  const [sel, setSel] = useState<Sel | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [panel, setPanel] = useState(false);
  const [form, setForm] = useState<PanelForm>({ ...blankSpec(), reason: "owner" });
  const [pErr, setPErr] = useState("");
  const [bulk, setBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // Grid rows (all properties)
  // ---------------------------------------------------------------------------

  const needle = q.trim().toLowerCase();
  const shownProps = properties.filter(
    (p) =>
      !needle ||
      `${p.name} ${p.cityName}`.toLowerCase().includes(needle) ||
      types.some((x) => x.propertyId === p.id && x.name.toLowerCase().includes(needle)),
  );
  // The unit type rows that can be selected, top to bottom.
  const editRows: CalTypeView[] = shownProps.flatMap((p) => (collapsed[p.id] ? [] : types.filter((x) => x.propertyId === p.id)));

  const selInfo = useCallback(
    (s: Sel | null): SelInfo | null => {
      if (!s) return null;
      const from = s.d0 < s.d1 ? s.d0 : s.d1;
      const to = s.d0 < s.d1 ? s.d1 : s.d0;
      if (s.month) return mType ? { from, to, types: [mType] } : null;
      const a = Math.min(s.r0, s.r1), b = Math.max(s.r0, s.r1);
      return { from, to, types: editRows.slice(a, b + 1) };
    },
    [mType, editRows],
  );
  const si = selInfo(sel);

  const openPanel = useCallback(
    (s: Sel | null) => {
      const info = selInfo(s);
      if (!info || !info.types.length) return;
      const next: PanelForm = { ...blankSpec(), reason: "owner" };
      if (info.types.length === 1 && info.from === info.to) {
        const n = night(info.types[0], info.from);
        next.value = String(n.price);
        next.min = String(n.minStay);
      }
      setForm(next);
      setPErr("");
      setPanel(true);
    },
    [selInfo, night],
  );

  // Finishing a drag anywhere on the page opens the side panel.
  const live = useRef({ sel, selecting, openPanel });
  live.current = { sel, selecting, openPanel };
  useEffect(() => {
    const up = () => {
      if (!live.current.selecting) return;
      setSelecting(false);
      live.current.openPanel(live.current.sel);
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const closeAll = useCallback(() => {
    setPanel(false);
    setSel(null);
    setPErr("");
  }, []);

  useEffect(() => {
    if (!panel && !bulk) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (bulk) setBulk(false);
      else closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, bulk, closeAll]);

  // ---------------------------------------------------------------------------
  // Saving
  // ---------------------------------------------------------------------------

  const say = useCallback((text: string, error = false, changeId: string | null = null) => {
    clearTimeout(toastTimer.current);
    setToast({ text, error, changeId });
    toastTimer.current = setTimeout(() => setToast(null), changeId ? UNDO_SECONDS * 1000 : 3800);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  const send = useCallback(
    async (input: Parameters<typeof saveCalendar>[0]): Promise<CalendarResult> => {
      setBusy(true);
      setSending((n) => n + 1);
      try {
        return await saveCalendar(input);
      } catch {
        return { ok: false, error: "failed" };
      } finally {
        setSending((n) => n - 1);
        setBusy(false);
      }
    },
    [],
  );

  const errorText = useCallback(
    (r: Extract<CalendarResult, { ok: false }>) => {
      if (r.error === "signedOut") {
        window.location.reload();
        return "";
      }
      if (r.error === "failed") return t.failed;
      if (r.error === "below") return t.belowError(t.nights(r.count ?? 0));
      if (r.error === "confirm") return t.confirmError(t.nights(r.count ?? 0));
      return t.errors[r.error];
    },
    [t],
  );

  async function runPanel(action: "edit" | "block" | "reset", spec: EditSpec, reason?: BlockReason) {
    if (!si || busy) return;
    const r = await send({ action, typeIds: si.types.map((x) => x.id), from: si.from, to: si.to, spec, reason });
    if (!r.ok) {
      setPErr(errorText(r));
      return;
    }
    closeAll();
    if (action === "edit") {
      say(t.updated(t.nights(r.done), t.unitTypes(r.types)) + (r.skipped ? " " + t.skippedFull(t.nights(r.skipped)) : ""), false, r.changeId);
    } else if (action === "block") {
      say(t.blockedToast(t.nights(r.done), t.reasons[reason ?? "other"]));
    } else {
      say(t.resetToast(t.nights(r.done)));
    }
    refresh();
  }

  const { reason, ...spec } = form;
  const saveEdit = (s: EditSpec = spec) => runPanel("edit", s);
  const doBlock = () => runPanel("block", { ...blankSpec(), days: form.days }, reason);
  const doReset = () => runPanel("reset", { ...blankSpec(), days: form.days });

  async function undo() {
    const id = toast?.changeId;
    if (!id) return;
    setToast(null);
    setSending((n) => n + 1);
    const r = await undoCalendar(id).catch(() => ({ ok: false }));
    setSending((n) => n - 1);
    say(r.ok ? t.undone : t.failed, !r.ok);
    refresh();
  }

  async function retry() {
    setSending((n) => n + 1);
    await retryCalendar().catch(() => null);
    setSending((n) => n - 1);
    refresh();
  }

  const sync: SyncState = sending > 0 ? { kind: "sending", count: sending } : data.failed > 0 ? { kind: "failed", count: data.failed } : { kind: "live" };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const firstMonth = { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 };
  const lastMonth = { y: Number(last.slice(0, 4)), m: Number(last.slice(5, 7)) - 1 };
  const monthIndex = (x: { y: number; m: number }) => x.y * 12 + x.m;
  const moveMonth = (by: number) => {
    const i = Math.min(monthIndex(lastMonth), Math.max(monthIndex(firstMonth), monthIndex(month) + by));
    setMonth({ y: Math.floor(i / 12), m: i % 12 });
    setSel(null);
  };
  const gridEnd = addDays(start, GRID_SPAN - 1);
  const canPrev = view === "all" ? start > today : monthIndex(month) > monthIndex(firstMonth);
  const canNext = view === "all" ? gridEnd < last : monthIndex(month) < monthIndex(lastMonth);
  const prev = () => (view === "all" ? setStart((s) => (addDays(s, -7) < today ? today : addDays(s, -7))) : moveMonth(-1));
  const next = () => (view === "all" ? setStart((s) => addDays(s, 7)) : moveMonth(1));
  const goToday = () => (view === "all" ? setStart(today) : setMonth(firstMonth));
  const rangeLabel = view === "all" ? `${t.day(start)} – ${t.day(gridEnd)} ${gridEnd.slice(0, 4)}` : t.monthYear(month.y, month.m);

  // ---------------------------------------------------------------------------
  // Empty
  // ---------------------------------------------------------------------------

  if (!types.length || !mType) {
    return (
      <main className="flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-4 px-4 py-4 min-[900px]:px-9 min-[900px]:py-6">
        <Heading t={t} />
        <div className="flex flex-col items-center gap-3 px-2 py-12 text-center min-[900px]:rounded-xl min-[900px]:border min-[900px]:border-dashed min-[900px]:border-[#D1D5DB] min-[900px]:bg-white min-[900px]:px-6 min-[900px]:py-14">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
            <CalendarIcon size={26} />
          </span>
          <h2 className="m-0 text-[19px] font-bold min-[900px]:text-[20px]">{t.emptyTitle}</h2>
          <p className="m-0 max-w-[460px] text-[14px] text-[#4B5563] min-[900px]:text-[15px]">{t.emptyBody}</p>
          <Link href="/broker/properties/new" className={`${smallPrimaryButtonClass} max-[899px]:h-12 max-[899px]:w-full`}>
            <Plus />
            {t.addProperty}
          </Link>
        </div>
      </main>
    );
  }

  const panelCurrency = currencyLabel((si && propById.get(si.types[0]?.propertyId ?? "")?.currency) || "EGP", lang);
  const typeLabel = (x: CalTypeView) => `${propById.get(x.propertyId)?.name ?? ""} · ${x.name}`;
  const days = dateRange(start, gridEnd);

  return (
    <main className="flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-3 px-4 py-4 min-[900px]:gap-4 min-[900px]:px-9 min-[900px]:py-6">
      {/* ------------------------------ Desktop ------------------------------ */}
      <div className="flex items-start justify-between gap-4 max-[899px]:hidden">
        <Heading t={t} />
        <SyncPill sync={sync} t={t} onRetry={retry} />
      </div>

      <div className="flex flex-wrap items-center gap-3 max-[899px]:hidden">
        <div role="radiogroup" aria-label={t.view} className="inline-flex rounded-[10px] bg-[#F3F4F6] p-[3px]">
          {(
            [
              ["all", t.viewAll],
              ["month", t.viewMonth],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => {
                setView(v);
                setSel(null);
              }}
              className={`flex h-9 cursor-pointer items-center rounded-lg border-0 px-3.5 text-[14px] font-semibold ${
                view === v ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "bg-transparent text-[#4B5563]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {view === "month" ? (
          <select
            aria-label={t.property}
            value={mType.id}
            onChange={(e) => {
              setMTypeId(e.target.value);
              setSel(null);
            }}
            className="h-10 cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3 text-[14px] font-medium text-[#111827]"
          >
            {types.map((x) => (
              <option key={x.id} value={x.id}>
                {typeLabel(x)}
              </option>
            ))}
          </select>
        ) : (
          <label className="relative flex flex-[0_1_240px] items-center">
            <span className="pointer-events-none absolute start-3 flex text-[#6B7280]">
              <Search />
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t.searchProperties}
              placeholder={t.searchProperties}
              className="h-10 w-full rounded-lg border border-[#D1D5DB] bg-white ps-10 pe-3 text-[14px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#639922]"
            />
          </label>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => setBulk(true)} className={primary}>
          <Sliders />
          {t.bulkEdit}
        </button>
        <button type="button" onClick={goToday} className={secondary}>
          {t.today}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={prev} disabled={!canPrev} aria-label={t.previous} className={square}>
            <ChevronStart />
          </button>
          <span className="min-w-[190px] text-center text-[15px] font-bold">{rangeLabel}</span>
          <button type="button" onClick={next} disabled={!canNext} aria-label={t.next} className={square}>
            <ChevronEnd />
          </button>
        </div>
      </div>

      <Legend t={t} />

      {view === "all" ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] max-[899px]:hidden">
            <div className="w-max min-w-full select-none">
              <div className="flex bg-[#F9FAFB]">
                <div className="sticky start-0 z-[3] flex flex-[0_0_232px] items-end bg-[#F9FAFB] px-3 py-2.5 text-[12px] font-semibold text-[#4B5563]">
                  {t.propertyUnitType}
                </div>
                {days.map((d) => {
                  const w = weekday(d);
                  return (
                    <div
                      key={d}
                      className={`flex flex-[0_0_62px] flex-col items-center gap-0.5 border-s border-[#F3F4F6] py-2 ${w === 5 || w === 6 ? "bg-[#F3F4F6]" : ""}`}
                    >
                      <span className={`text-[11px] font-semibold ${d === today ? "text-[#3B6D11]" : "text-[#6B7280]"}`}>{t.weekdayShort[w]}</span>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-bold ${
                          d === today ? "bg-[#639922] text-white" : "text-[#111827]"
                        }`}
                      >
                        {Number(d.slice(8, 10))}
                      </span>
                    </div>
                  );
                })}
              </div>
              {shownProps.map((p) => {
                const open = !collapsed[p.id];
                const mine = types.filter((x) => x.propertyId === p.id);
                const units = mine.reduce((a, x) => a + x.count, 0);
                return (
                  <div key={p.id}>
                    <div className="flex border-t border-[#E5E7EB] bg-[#F9FAFB]">
                      <div className="sticky start-0 z-[3] flex h-11 flex-auto items-center gap-2 bg-[#F9FAFB] px-3">
                        <button
                          type="button"
                          onClick={() => setCollapsed((c) => ({ ...c, [p.id]: open }))}
                          aria-expanded={open}
                          aria-label={p.name}
                          className="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#4B5563]"
                        >
                          <span className={`flex transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`}>
                            <Chevron />
                          </span>
                        </button>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[14px] font-bold">{p.name}</span>
                          <span className="truncate text-[12px] text-[#6B7280]">
                            {[p.cityName, t.units(units)].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {open &&
                      mine.map((type) => {
                        const row = editRows.indexOf(type);
                        return (
                          <div key={type.id}>
                            <div className="flex border-t border-[#E5E7EB]">
                              <div className="sticky start-0 z-[3] flex h-[54px] flex-[0_0_232px] items-center bg-white px-3">
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate text-[14px] font-semibold">{type.name}</span>
                                  <span className="truncate text-[12px] text-[#6B7280]">
                                    {type.count > 1
                                      ? t.identical(type.count)
                                      : type.link === "whole"
                                        ? t.linkedToRooms
                                        : type.link === "room"
                                          ? t.linkedToWhole
                                          : ""}
                                  </span>
                                </div>
                              </div>
                              {days.map((d) => {
                                const n = night(type, d);
                                const look = gridLook(t, type, d, n, (x) => money(x, type));
                                const inSel =
                                  !!si && !!sel && !sel.month && row >= Math.min(sel.r0, sel.r1) && row <= Math.max(sel.r0, sel.r1) && d >= si.from && d <= si.to;
                                const w = weekday(d);
                                return (
                                  <div
                                    key={d}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={inSel}
                                    title={look.title}
                                    onMouseDown={(e) => {
                                      if (e.button !== 0) return;
                                      setSel({ month: false, r0: row, r1: row, d0: d, d1: d });
                                      setSelecting(true);
                                    }}
                                    onMouseEnter={() => {
                                      if (selecting) setSel((s) => (s ? { ...s, r1: row, d1: d } : s));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key !== "Enter" && e.key !== " ") return;
                                      e.preventDefault();
                                      const s = { month: false, r0: row, r1: row, d0: d, d1: d };
                                      setSel(s);
                                      openPanel(s);
                                    }}
                                    style={{ background: inSel ? "#DCFCE7" : look.background ?? (w === 5 || w === 6 ? "#FAFAF9" : "#FFFFFF") }}
                                    className={`relative flex h-[54px] min-w-0 flex-[0_0_62px] cursor-cell flex-col items-center justify-center gap-0.5 overflow-hidden border-s border-[#F3F4F6] outline-none focus-visible:shadow-[inset_0_0_0_2px_#3B6D11] ${
                                      inSel ? "shadow-[inset_0_0_0_2px_#639922]" : ""
                                    }`}
                                  >
                                    <Corners cta={n.cta} ctd={n.ctd} />
                                    <span className={`text-[12px] font-semibold tabular-nums ${look.topClass}`}>{look.top}</span>
                                    <span className={`max-w-full truncate text-[11px] font-semibold ${look.subClass}`}>{look.sub}</span>
                                  </div>
                                );
                              })}
                            </div>
                            {type.count > 1 &&
                              Array.from({ length: type.count }, (_, u) => (
                                <div key={u} className="flex border-t border-[#E5E7EB]">
                                  <div className="sticky start-0 z-[3] flex h-9 flex-[0_0_232px] items-center bg-white px-3">
                                    <span className="truncate ps-3.5 text-[13px] font-medium text-[#4B5563]">{t.apartment(u + 1)}</span>
                                  </div>
                                  {days.map((d) => {
                                    const w = weekday(d);
                                    return (
                                      <div
                                        key={d}
                                        className={`h-9 flex-[0_0_62px] border-s border-[#F3F4F6] ${w === 5 || w === 6 ? "bg-[#FAFAF9]" : "bg-white"}`}
                                      />
                                    );
                                  })}
                                </div>
                              ))}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
              {shownProps.length === 0 && (
                <div className="border-t border-[#E5E7EB] px-4 py-10 text-center text-[14px] text-[#4B5563]">{t.noMatch(q)}</div>
              )}
            </div>
          </div>
          <Hint className="max-[899px]:hidden">{t.gridHintEdit}</Hint>
        </>
      ) : (
        <>
          <div className="select-none overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] max-[899px]:hidden">
            <div className="grid grid-cols-7 bg-[#F9FAFB]">
              {SAT_FIRST.map((w) => (
                <div key={w} className="p-2.5 text-center text-[12px] font-semibold text-[#4B5563]">
                  {t.weekdayLong[w]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthCells(month.y, month.m).map((d, k) => {
                if (!d) return <div key={k} className="min-h-24 border-s border-t border-[#F3F4F6] bg-[#F9FAFB]" />;
                const past = d < today || d > last;
                const n = night(mType, d);
                const look = monthLook(t, mType, n);
                const inSel = !!si && !!sel?.month && d >= si.from && d <= si.to;
                return (
                  <div
                    key={d}
                    role={past ? undefined : "button"}
                    tabIndex={past ? undefined : 0}
                    aria-pressed={past ? undefined : inSel}
                    title={past ? undefined : `${t.day(d)} · ${money(n.price, mType)} · ${t.minStayN(n.minStay)}`}
                    onMouseDown={(e) => {
                      if (past || e.button !== 0) return;
                      setSel({ month: true, r0: 0, r1: 0, d0: d, d1: d });
                      setSelecting(true);
                    }}
                    onMouseEnter={() => {
                      if (selecting && !past) setSel((s) => (s?.month ? { ...s, d1: d } : s));
                    }}
                    onKeyDown={(e) => {
                      if (past || (e.key !== "Enter" && e.key !== " ")) return;
                      e.preventDefault();
                      const s = { month: true, r0: 0, r1: 0, d0: d, d1: d };
                      setSel(s);
                      openPanel(s);
                    }}
                    style={{ background: inSel ? "#DCFCE7" : past ? "#F9FAFB" : look.background ?? "#FFFFFF" }}
                    className={`relative flex min-h-24 flex-col gap-1 border-s border-t border-[#F3F4F6] p-2 outline-none focus-visible:shadow-[inset_0_0_0_2px_#3B6D11] ${
                      past ? "" : "cursor-cell"
                    } ${inSel ? "shadow-[inset_0_0_0_2px_#639922]" : ""}`}
                  >
                    {!past && <Corners cta={n.cta} ctd={n.ctd} size={12} />}
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[14px] font-bold ${
                          d === today ? "bg-[#639922] text-white" : "text-[#111827]"
                        }`}
                      >
                        {Number(d.slice(8, 10))}
                      </span>
                      {!past && <span className="text-[11px] font-bold text-[#111827]">{n.minStay > 1 ? `${n.minStay}+` : ""}</span>}
                    </div>
                    {!past && (
                      <>
                        <span className="text-[13px] font-semibold tabular-nums text-[#111827]">{num(n.price)}</span>
                        <span className={`text-[12px] font-semibold ${look.subClass}`}>{look.sub}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <Hint className="max-[899px]:hidden">{t.monthHintEdit}</Hint>
        </>
      )}

      {/* ------------------------------- Phone ------------------------------- */}
      <PhoneCalendar
        t={t}
        today={today}
        last={last}
        types={types}
        mType={mType}
        typeLabel={typeLabel}
        onType={(id) => {
          setMTypeId(id);
          setSel(null);
        }}
        view={phoneView}
        onView={(v) => {
          setPhoneView(v);
          setSel(null);
        }}
        month={month}
        canPrev={monthIndex(month) > monthIndex(firstMonth)}
        canNext={monthIndex(month) < monthIndex(lastMonth)}
        onMonth={moveMonth}
        night={night}
        money={money}
        currency={propById.get(mType.propertyId)?.currency ?? "EGP"}
        sync={sync}
        onRetry={retry}
        onBulk={() => setBulk(true)}
        selection={sel?.month && si ? si : null}
        onSelect={(d0, d1) => setSel({ month: true, r0: 0, r1: 0, d0, d1 })}
        onDone={(d0, d1) => {
          const s = { month: true, r0: 0, r1: 0, d0, d1 };
          setSel(s);
          openPanel(s);
        }}
      />

      {panel && si && (
        <>
          <EditPanel
            t={t}
            info={si}
            form={form}
            setForm={(f) => {
              setForm(f);
              setPErr("");
            }}
            error={pErr}
            busy={busy}
            currency={panelCurrency}
            money={money}
            propertyName={(x) => propById.get(x.propertyId)?.name ?? ""}
            onSave={() => saveEdit()}
            onBlock={doBlock}
            onReset={doReset}
            onClose={closeAll}
          />
          <PhoneEditSheet
            t={t}
            info={si}
            form={form}
            setForm={(f) => {
              setForm(f);
              setPErr("");
            }}
            error={pErr}
            busy={busy}
            currency={panelCurrency}
            money={money}
            onSave={() => saveEdit({ ...spec, mode: "set", units: "", max: "", ctd: "keep" })}
            onClose={closeAll}
          />
        </>
      )}

      {bulk && (
        <BulkEdit
          t={t}
          lang={lang}
          today={today}
          properties={properties}
          types={types}
          overrides={overrides}
          busy={busy}
          onClose={() => setBulk(false)}
          onSave={async (input) => {
            const r = await send({ action: "bulk", ...input });
            if (!r.ok) return errorText(r);
            setBulk(false);
            say(t.updated(t.nights(r.done), t.unitTypes(r.types)) + (r.skipped ? " " + t.skippedBooked(t.nights(r.skipped)) : ""), false, r.changeId);
            refresh();
            return null;
          }}
        />
      )}

      {toast && <CalendarToast toast={toast} t={t} onUndo={undo} />}
    </main>
  );
}

function Heading({ t }: { t: CalendarDict }) {
  return (
    <div className="flex flex-col gap-1.5 max-[899px]:hidden">
      <h1 className="m-0 text-[28px] font-bold tracking-[-0.01em]">{t.calendar}</h1>
      <p className="m-0 text-[15px] text-[#4B5563]">{t.intro}</p>
    </div>
  );
}

function Hint({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-[13px] text-[#6B7280] ${className}`}>
      <Info size={16} />
      <span>{children}</span>
    </div>
  );
}

const CHANNELS: [string, string][] = [
  ["Airbnb", "#FF5A5F"],
  ["Booking.com", "#003580"],
  ["Agoda", "#5B2D90"],
  ["Expedia", "#1E243A"],
];

function Legend({ t }: { t: CalendarDict }) {
  const swatch = "h-3 w-[18px] rounded-[3px]";
  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[12px] text-[#4B5563] max-[899px]:hidden">
      {CHANNELS.map(([name, color]) => (
        <span key={name} className="flex items-center gap-1.5">
          <span className={swatch} style={{ background: color }} />
          {name}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className={`${swatch} border border-[#D1D5DB]`} style={{ background: "repeating-linear-gradient(135deg,#E5E7EB 0 4px,#F9FAFB 4px 8px)" }} />
        {t.blockedLegend}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`${swatch} border border-[#FECACA] bg-[#FEE2E2]`} />
        {t.closedLegend}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`${swatch} border border-[#C0DD97]`} style={{ background: "repeating-linear-gradient(135deg,#EAF3DE 0 4px,#FFFFFF 4px 8px)" }} />
        {t.linkedLegend}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0 w-0" style={{ borderTop: "10px solid #F59E0B", borderInlineEnd: "10px solid transparent" }} />
        {t.noArrival}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0 w-0" style={{ borderTop: "10px solid #7C3AED", borderInlineStart: "10px solid transparent" }} />
        {t.noDeparture}
      </span>
      <span className="flex items-center gap-1.5">
        <b className="text-[#111827]">3+</b>
        {t.minStayLegend}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone: one unit type at a time, as a day list or a month.
// ---------------------------------------------------------------------------

function PhoneCalendar({
  t,
  today,
  last,
  types,
  mType,
  typeLabel,
  onType,
  view,
  onView,
  month,
  canPrev,
  canNext,
  onMonth,
  night,
  money,
  currency,
  sync,
  onRetry,
  onBulk,
  selection,
  onSelect,
  onDone,
}: {
  t: CalendarDict;
  today: string;
  last: string;
  types: CalTypeView[];
  mType: CalTypeView;
  typeLabel: (x: CalTypeView) => string;
  onType: (id: string) => void;
  view: "days" | "month";
  onView: (v: "days" | "month") => void;
  month: { y: number; m: number };
  canPrev: boolean;
  canNext: boolean;
  onMonth: (by: number) => void;
  night: (type: CalTypeView, date: string) => ReturnType<typeof nightOf>;
  money: (n: number, type?: CalTypeView) => string;
  currency: string;
  sync: SyncState;
  onRetry: () => void;
  onBulk: () => void;
  selection: SelInfo | null;
  onSelect: (d0: string, d1: string) => void;
  onDone: (d0: string, d1: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  usePressSelect(view === "days" ? list : grid, view, onSelect, onDone);
  const days = dateRange(today, addDays(today, PHONE_SPAN - 1));
  const inSel = (d: string) => !!selection && d >= selection.from && d <= selection.to;

  return (
    <div className="flex flex-col gap-3 min-[900px]:hidden">
      <label className="relative flex items-center">
        <select
          aria-label={t.property}
          value={mType.id}
          onChange={(e) => onType(e.target.value)}
          className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-[#D1D5DB] bg-white ps-3.5 pe-10 text-[15px] font-semibold text-[#111827]"
        >
          {types.map((x) => (
            <option key={x.id} value={x.id}>
              {typeLabel(x)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute end-3 flex text-[#4B5563]">
          <Chevron />
        </span>
      </label>

      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label={t.view} className="flex flex-1 rounded-[10px] bg-[#F3F4F6] p-[3px]">
          {(
            [
              ["days", t.days],
              ["month", t.month],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => onView(v)}
              className={`h-[34px] flex-1 cursor-pointer rounded-lg border-0 text-[13px] font-semibold ${
                view === v ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "bg-transparent text-[#4B5563]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onBulk} className={`${secondary} h-10`}>
          <Sliders size={16} />
          {t.bulkEdit}
        </button>
      </div>

      {view === "days" ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold">
              {t.day(days[0])} – {t.day(days[days.length - 1])}
            </span>
            <SyncPill sync={sync} t={t} onRetry={onRetry} phone />
          </div>
          {sync.kind === "failed" ? (
            <FailedBanner t={t} onRetry={onRetry} />
          ) : (
            <p className="m-0 text-[12px] text-[#6B7280]">{t.phoneHint}</p>
          )}
          <div ref={list} className="flex select-none flex-col gap-2 [-webkit-touch-callout:none]">
            {days.map((d) => {
              const n = night(mType, d);
              const look = monthLook(t, mType, n);
              const on = inSel(d);
              return (
                <button
                  key={d}
                  type="button"
                  data-date={d}
                  aria-pressed={on}
                  style={look.background && !on ? { background: look.background } : undefined}
                  className={`relative flex min-h-14 cursor-pointer items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-start ${
                    on ? "border-[1.5px] border-[#639922] bg-[#F7FBF1]" : "border border-[#E5E7EB] bg-white"
                  }`}
                >
                  <Corners cta={n.cta} ctd={n.ctd} />
                  <span className="flex w-11 flex-none flex-col items-center">
                    <span className="text-[11px] font-semibold text-[#6B7280]">{t.weekdayList[weekday(d)]}</span>
                    <span className={`text-[18px] font-bold ${d === today ? "text-[#3B6D11]" : "text-[#111827]"}`}>{Number(d.slice(8, 10))}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={`text-[15px] font-bold tabular-nums ${n.stop ? "text-[#9CA3AF] line-through" : "text-[#111827]"}`}>
                      {money(n.price, mType)}
                    </span>
                    {n.minStay > 1 && <span className="text-[12px] text-[#6B7280]">{t.minStayN(n.minStay)}</span>}
                  </span>
                  <span className={`flex-none text-[12px] font-bold ${look.subClass}`}>{look.sub}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => onMonth(-1)} disabled={!canPrev} aria-label={t.previousMonth} className={square}>
              <ChevronStart />
            </button>
            <span className="text-[16px] font-bold">{t.monthYear(month.y, month.m)}</span>
            <button type="button" onClick={() => onMonth(1)} disabled={!canNext} aria-label={t.nextMonth} className={square}>
              <ChevronEnd />
            </button>
          </div>
          {sync.kind === "failed" && <FailedBanner t={t} onRetry={onRetry} />}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-2">
            <div className="grid grid-cols-7 gap-1 pb-1">
              {SAT_FIRST.map((w) => (
                <span key={w} className="text-center text-[11px] font-semibold text-[#6B7280]">
                  {t.weekdayShort[w]}
                </span>
              ))}
            </div>
            <div ref={grid} className="grid select-none grid-cols-7 gap-1 [-webkit-touch-callout:none]">
              {monthCells(month.y, month.m).map((d, k) => {
                if (!d) return <span key={k} />;
                const past = d < today || d > last;
                if (past)
                  return (
                    <span key={d} className="flex min-h-[58px] rounded-lg bg-[#F3F4F6] p-1 text-[12px] font-bold text-[#9CA3AF]">
                      {Number(d.slice(8, 10))}
                    </span>
                  );
                const n = night(mType, d);
                const look = monthLook(t, mType, n);
                const on = inSel(d);
                return (
                  <button
                    key={d}
                    type="button"
                    data-date={d}
                    aria-pressed={on}
                    aria-label={`${t.day(d)} · ${money(n.price, mType)}`}
                    style={{ background: on ? "#DCFCE7" : look.background ?? "#FFFFFF" }}
                    className={`relative flex min-h-[58px] cursor-pointer flex-col items-start gap-0.5 overflow-hidden rounded-lg p-1 text-start ${
                      on || d === today ? "shadow-[inset_0_0_0_2px_#639922]" : "border border-[#E5E7EB]"
                    }`}
                  >
                    <Corners cta={n.cta} ctd={n.ctd} size={8} />
                    <span className="text-[12px] font-bold text-[#111827]">{Number(d.slice(8, 10))}</span>
                    <span className={`text-[10px] font-semibold tabular-nums ${n.stop ? "text-[#9CA3AF] line-through" : "text-[#374151]"}`}>{num(n.price)}</span>
                    <span className="flex flex-wrap gap-0.5" aria-hidden="true">
                      {Array.from({ length: Math.min(mType.count, 8) }, (_, i) => (
                        <span key={i} className={`h-[5px] w-[5px] rounded-full ${i < n.left ? "bg-[#22C55E]" : "bg-[#9CA3AF]"}`} />
                      ))}
                    </span>
                    {mType.count > 1 && (
                      <span className={`text-[10px] font-bold ${n.left === 0 ? "text-[#B91C1C]" : "text-[#15803D]"}`}>
                        {n.left}/{mType.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6B7280]">
            <span>{t.pricesIn(currency)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="h-[7px] w-[7px] rounded-full bg-[#22C55E]" />
              {t.apartmentFree}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="h-[7px] w-[7px] rounded-full bg-[#9CA3AF]" />
              {t.bookedLegend}
            </span>
            <span>·</span>
            <span>{t.todayOutline}</span>
          </p>
          <p className="m-0 text-[12px] text-[#6B7280]">{t.phoneMonthHint}</p>
        </>
      )}
    </div>
  );
}

function FailedBanner({ t, onRetry }: { t: CalendarDict; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
      <div className="flex gap-2.5">
        <span className="flex flex-none text-[#B91C1C]">
          <AlertCircle />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-[14px] font-bold text-[#B91C1C]">{t.failedTitle}</span>
          <span className="text-[13px] text-[#7F1D1D]">{t.failedBody}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="h-11 cursor-pointer rounded-lg border border-[#FCA5A5] bg-white text-[15px] font-semibold text-[#B91C1C]"
      >
        {t.retry}
      </button>
    </div>
  );
}

// Tap a day to pick it; long-press then drag to pick several. While dragging
// the page doesn't scroll. A mouse click works as a tap.
function usePressSelect(
  ref: React.RefObject<HTMLDivElement | null>,
  view: string,
  onSelect: (d0: string, d1: string) => void,
  onDone: (d0: string, d1: string) => void,
) {
  const cb = useRef({ onSelect, onDone });
  cb.current = { onSelect, onDone };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first: string | null = null;
    let current: string | null = null;
    let dragging = false;
    let swallowClick = false;
    let x = 0, y = 0;
    const dateAt = (cx: number, cy: number) =>
      (document.elementFromPoint(cx, cy)?.closest("[data-date]") as HTMLElement | null)?.dataset.date ?? null;

    const start = (e: TouchEvent) => {
      const d = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
      if (!d) return;
      first = current = d;
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
      timer = setTimeout(() => {
        dragging = true;
        navigator.vibrate?.(10);
        cb.current.onSelect(d, d);
      }, 450);
    };
    const move = (e: TouchEvent) => {
      const p = e.touches[0];
      if (!dragging) {
        if (Math.abs(p.clientX - x) > 8 || Math.abs(p.clientY - y) > 8) clearTimeout(timer);
        return;
      }
      e.preventDefault();
      const d = dateAt(p.clientX, p.clientY);
      if (d && d !== current && first) {
        current = d;
        cb.current.onSelect(first, d);
      }
    };
    const end = () => {
      clearTimeout(timer);
      if (dragging && first && current) {
        swallowClick = true;
        cb.current.onDone(first, current);
      }
      dragging = false;
    };
    const click = (e: MouseEvent) => {
      if (swallowClick) {
        swallowClick = false;
        return;
      }
      const d = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
      if (d) cb.current.onDone(d, d);
    };
    const menu = (e: Event) => e.preventDefault();
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    el.addEventListener("click", click);
    el.addEventListener("contextmenu", menu);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.removeEventListener("click", click);
      el.removeEventListener("contextmenu", menu);
    };
  }, [ref, view]);
}
