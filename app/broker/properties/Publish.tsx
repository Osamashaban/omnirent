"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { publishProperty, syncState, type SyncState } from "@/app/actions/properties";
import type { Lang } from "@/lib/i18n";
import { PROPERTY_DICTS } from "@/lib/property-i18n";
import { SYNC_STAGES, stageStates } from "@/lib/channex-payload";
import { Refresh, Spinner } from "@/components/ops/icons";
import { secondaryButtonClass } from "@/components/ops/ui";
import { SyncLines, type SyncCounts } from "./sync-list";

const POLL_MS = 1500;

// Asks the server where a publish has got to, every 1.5 seconds, until it has
// finished one way or the other.
function useSyncPolling(propertyId: string, active: boolean, onFinished: (s: SyncState) => void) {
  const [state, setState] = useState<SyncState | null>(null);
  const finished = useRef(onFinished);
  finished.current = onFinished;
  useEffect(() => {
    if (!active) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      let s: SyncState | null = null;
      try {
        s = await syncState(propertyId);
      } catch {
        // A dropped connection: ask again on the next tick.
      }
      if (stop) return;
      if (s) {
        setState(s);
        if (s.status !== "SYNCING") return finished.current(s);
      }
      timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [propertyId, active]);
  return state;
}

// "Publishing your property": the parts going out one by one. When it ends
// the broker lands on the property page, which shows the result.
export function PublishDialog({ lang, propertyId, counts }: { lang: Lang; propertyId: string; counts: SyncCounts }) {
  const p = PROPERTY_DICTS[lang];
  const page = `/broker/properties/${propertyId}`;
  const state = useSyncPolling(propertyId, true, (s) => {
    window.location.assign(s.status === "SYNCED" ? `${page}?done=published` : page);
  });
  const states = stageStates(state?.status ?? "SYNCING", state?.stage ?? "property");
  const done = SYNC_STAGES.filter((s) => states[s] === "done").length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,39,0.45)] p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={p.publishingTitle}
        className="flex w-full max-w-[480px] flex-col gap-4 rounded-2xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DBEAFE] text-[#1D4ED8]">
          <Refresh size={24} />
        </span>
        <h2 className="m-0 text-[20px] font-bold leading-[1.35]">{p.publishingTitle}</h2>
        <p className="m-0 text-[15px] leading-[1.7] text-[#4B5563]">{p.publishingBody}</p>
        <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div className="h-full bg-[#639922] transition-[width] duration-500" style={{ width: `${Math.max(8, (done / SYNC_STAGES.length) * 100)}%` }} />
        </div>
        <SyncLines p={p} states={states} counts={counts} big />
        <span className="text-[13px] text-[#6B7280]">{p.publishingLeave}</span>
        <div className="mt-1 flex gap-3">
          <a href={page} className={`${secondaryButtonClass} flex-1`}>
            {p.continueBackground}
          </a>
        </div>
      </section>
    </div>
  );
}

// Retry after a failed publish (property page). Opens the same dialog.
export function RetryPublish({ lang, propertyId, counts, full = false }: { lang: Lang; propertyId: string; counts: SyncCounts; full?: boolean }) {
  const p = PROPERTY_DICTS[lang];
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const retry = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await publishProperty(propertyId);
      if (res.ok) setOpen(true);
      else if (res.error === "signedOut") window.location.assign("/broker/login");
      else if (res.error === "incomplete") window.location.assign(`/broker/properties/${propertyId}/edit`);
      else setNote(res.error === "busy" ? p.publishBusy : p.saveFailed);
    } catch {
      setNote(p.saveFailed);
    } finally {
      setBusy(false);
    }
  }, [propertyId, p]);
  return (
    <>
      <button type="button" onClick={retry} disabled={busy} className={`${secondaryButtonClass} flex-none disabled:opacity-60 ${full ? "w-full" : ""}`}>
        {busy ? <Spinner /> : <Refresh />}
        {p.retry}
      </button>
      {note && (
        <span role="status" className="text-[13px] text-[#B91C1C]">
          {note}
        </span>
      )}
      {open && <PublishDialog lang={lang} propertyId={propertyId} counts={counts} />}
    </>
  );
}

// On the property page while a publish is running: reloads the page when it
// ends, so the status and the sync lines show the result.
export function SyncWatcher({ propertyId }: { propertyId: string }) {
  useSyncPolling(propertyId, true, () => window.location.reload());
  return null;
}
