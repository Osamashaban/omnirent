"use client";

// The broker Channels page (design App_Channels, version 80, "Channel
// connections · ready for development"): connect booking platforms, link each
// unit type to its listing on each platform, and turn syncing on. The bell
// lists what changed on the platforms; important events also go by email.

import { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/ops/Overlay";
import { ArrowBack, Bell } from "@/components/broker/property-icons";
import { PLATFORMS, initials, platformById } from "@/lib/channel-catalog";
import { platformState, suggestions } from "@/lib/channel-rules";
import { CHANNEL_DICTS, timeAgo } from "@/lib/channel-i18n";
import type { ChannelsData, NoticeView } from "@/lib/channel-data";
import type { Lang } from "@/lib/i18n";
import { markRead } from "@/app/actions/channels";
import { useChannels } from "./useChannels";
import { BrokerMain } from "@/components/broker/BrokerShell";
import { PlatformsTab } from "./PlatformsTab";
import { LinksTab } from "./LinksTab";
import { Dialogs } from "./Dialogs";
import type { Tab } from "./types";

// The phone bell lives in the top bar (drawn by the server page); it talks to
// the page through these window events.
const BELL_OPEN = "omnirent:channels-bell";
const BELL_COUNT = "omnirent:channels-unread";

export function PhoneBell({ label, count: initial }: { label: string; count: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const on = (e: Event) => setCount((e as CustomEvent<number>).detail);
    window.addEventListener(BELL_COUNT, on);
    return () => window.removeEventListener(BELL_COUNT, on);
  }, []);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => window.dispatchEvent(new Event(BELL_OPEN))}
      className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#111827]"
    >
      <Bell size={22} />
      {count > 0 && (
        <span aria-hidden="true" className="absolute end-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

export type Start = { connected?: string; abb?: "failed" | "reconnected" };

export function ChannelsApp({ lang, data: initial, start }: { lang: Lang; data: ChannelsData; start: Start }) {
  const t = CHANNEL_DICTS[lang];
  const [tab, setTab] = useState<Tab>("plat");
  const { ctx, dlg, setDlg, toast, setToast, closeToast } = useChannels(lang, initial, setTab);
  const { data } = ctx;
  const [bell, setBell] = useState(false);
  const [phoneNotifs, setPhoneNotifs] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const bellBox = useRef<HTMLDivElement>(null);

  const notices = data.notices.map((n) => (read.has(n.id) ? { ...n, read: true } : n));
  const unread = notices.filter((n) => !n.read).length;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(BELL_COUNT, { detail: unread }));
  }, [unread]);
  useEffect(() => {
    const on = () => setPhoneNotifs(true);
    window.addEventListener(BELL_OPEN, on);
    return () => window.removeEventListener(BELL_OPEN, on);
  }, []);
  useEffect(() => {
    if (!bell) return;
    const on = (e: MouseEvent) => bellBox.current && !bellBox.current.contains(e.target as Node) && setBell(false);
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, [bell]);

  // Back from Airbnb (the return page sends the broker here).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (start.connected === "abb") {
      const listings = initial.listings.filter((l) => l.platform === "abb" && !l.gone).length;
      const matches = Object.keys(suggestions(initial)).filter((k) => k.endsWith("|abb")).length;
      setDlg({ k: "imp", p: "abb", prop: null, listings, matches, bookings: 0 });
    } else if (start.abb === "reconnected") setToast(t.abbReconnected);
    else if (start.abb === "failed") setToast(t.abbCancelled);
    if (start.connected || start.abb) window.history.replaceState(null, "", window.location.pathname);
  }, [start, initial, t, setDlg, setToast]);

  const goNotice = (n: NoticeView) => {
    setRead((s) => new Set(s).add(n.id));
    void markRead({ ids: [n.id] }).catch(() => undefined);
    setBell(false);
    setPhoneNotifs(false);
    if (n.go === "links") return setTab("links");
    setTab("plat");
    const p = platformById(n.go);
    if (!p) return;
    const st = platformState(data, p);
    if (st === "rej") setDlg({ k: "guide", p: p.id, prop: data.conns.find((c) => c.platform === p.id && c.state === "rej")?.propertyId ?? null });
    else if (st !== "off" && st !== "na") setDlg({ k: "manage", p: p.id });
  };
  const markAll = () => {
    setRead(new Set(data.notices.map((n) => n.id)));
    void markRead({ ids: null }).catch(() => undefined);
  };

  const now = Date.now();
  const noticeText = (n: NoticeView) => {
    const p = platformById(n.platform);
    const fn = t.notice[n.kind];
    return fn ? fn({ p: p?.name ?? "", r: "", n: 0, room: "", u: "", code: "", ...n.params }) : "";
  };
  const noticeRow = (n: NoticeView) => {
    const p = platformById(n.platform);
    return (
      <li key={n.id}>
        <button
          type="button"
          onClick={() => goNotice(n)}
          className={`flex w-full cursor-pointer items-start gap-3 border-0 border-b border-solid border-[#F3F4F6] px-4 py-3 text-start text-[14px] text-[#111827] ${n.read ? "bg-white" : "bg-[#F7FBF1]"}`}
        >
          <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[12px] font-bold text-white" style={{ background: p?.color ?? "#4B5563" }}>
            {p ? initials(p.name) : ""}
          </span>
          <span className="flex flex-1 flex-col gap-1 leading-[1.5]">
            <span>{noticeText(n)}</span>
            <span className="text-[12px] text-[#6B7280]">{timeAgo(t, n.at, now)}</span>
          </span>
          {!n.read && <span aria-label={t.unread} className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[#639922]" />}
        </button>
      </li>
    );
  };

  return (
    <BrokerMain className="min-[900px]:gap-[18px] min-[900px]:pt-6">
      <div className="flex items-start gap-4 max-[899px]:hidden">
        <div className="flex flex-1 flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-bold">{t.channels}</h1>
          <p className="m-0 text-[15px] text-[#4B5563]">{t.intro}</p>
        </div>
        <div ref={bellBox} className="relative flex-none">
          <button
            type="button"
            onClick={() => setBell((b) => !b)}
            aria-label={t.bellLabel(unread)}
            aria-expanded={bell}
            className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border border-[#D1D5DB] bg-white text-[#111827]"
          >
            <Bell />
            {unread > 0 && (
              <span aria-hidden="true" className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#F9FAFB] bg-[#DC2626] px-[5px] text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          {bell && (
            <div role="dialog" aria-label={t.notifications} className="absolute end-0 top-[52px] z-40 max-h-[520px] w-[400px] overflow-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-4 py-3.5">
                <span className="flex-1 text-[16px] font-bold">{t.notifications}</span>
                <button type="button" onClick={markAll} className={`cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#3B6D11]`}>
                  {t.markAll}
                </button>
              </div>
              {notices.length ? (
                <ul className="m-0 list-none p-0">{notices.map(noticeRow)}</ul>
              ) : (
                <p className="m-0 px-4 py-7 text-center text-[14px] text-[#6B7280]">{t.noNotifs}</p>
              )}
              <p className="m-0 bg-[#F9FAFB] px-4 py-2.5 text-[12px] text-[#6B7280]">{t.byEmail}</p>
            </div>
          )}
        </div>
      </div>

      <div role="tablist" className="flex gap-7 border-b border-[#E5E7EB] max-[899px]:-mx-4 max-[899px]:-mt-4 max-[899px]:gap-6 max-[899px]:bg-white max-[899px]:px-4">
        {(
          [
            ["plat", t.tabPlat, PLATFORMS.length],
            ["links", t.tabLinks, data.units.length],
          ] as [Tab, string, number][]
        ).map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px flex h-[46px] cursor-pointer items-center gap-2 border-0 border-b-2 border-solid bg-transparent px-0.5 text-[15px] max-[899px]:h-11 max-[899px]:gap-1.5 ${
              tab === k ? "border-[#639922] font-bold text-[#27500A]" : "border-transparent font-medium text-[#4B5563]"
            }`}
          >
            {label}
            <span className="rounded-full bg-[#F3F4F6] px-2 py-px text-[12px] font-semibold text-[#4B5563]">{n}</span>
          </button>
        ))}
      </div>

      {tab === "plat" ? <PlatformsTab ctx={ctx} /> : <LinksTab ctx={ctx} />}

      <Dialogs ctx={ctx} dlg={dlg} />

      {phoneNotifs && (
        <div role="dialog" aria-modal="true" aria-label={t.notifications} className="fixed inset-0 z-50 flex flex-col bg-[#F9FAFB] min-[900px]:hidden">
          <header className="flex h-14 flex-none items-center gap-2 border-b border-[#E5E7EB] bg-white px-2">
            <button type="button" onClick={() => setPhoneNotifs(false)} aria-label={t.back} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#111827]">
              <ArrowBack className="rtl:rotate-180" />
            </button>
            <span className="flex-1 text-[17px] font-bold">{t.notifications}</span>
            <button type="button" onClick={markAll} className="cursor-pointer border-0 bg-transparent px-2 text-[13px] font-semibold text-[#3B6D11]">
              {t.markAll}
            </button>
          </header>
          {notices.length ? (
            <ul className="m-0 flex-1 list-none overflow-auto bg-white p-0">{notices.map(noticeRow)}</ul>
          ) : (
            <p className="m-0 flex-1 bg-white px-4 py-7 text-center text-[14px] text-[#6B7280]">{t.noNotifs}</p>
          )}
          <p className="m-0 px-4 py-3 text-[12px] text-[#6B7280]">{t.byEmailPhone}</p>
        </div>
      )}

      {toast && (
        <Toast onClose={closeToast} closeLabel={t.close} place="content">
          {toast}
        </Toast>
      )}
    </BrokerMain>
  );
}
