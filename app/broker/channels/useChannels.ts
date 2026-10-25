"use client";

// The state both channel screens share (the Channels page and the Channels tab
// on a property page): the data, the open dialog, the toast, and the helpers
// that run server actions and start or stop syncing.

import { useCallback, useEffect, useMemo, useState } from "react";
import { platformById } from "@/lib/channel-catalog";
import { suggestions } from "@/lib/channel-rules";
import { CHANNEL_DICTS } from "@/lib/channel-i18n";
import type { ChannelsData } from "@/lib/channel-data";
import type { Lang } from "@/lib/i18n";
import { setSyncing } from "@/app/actions/channels";
import type { Ctx, Dlg, Tab } from "./types";

export function useChannels(lang: Lang, initial: ChannelsData, setTab: (t: Tab) => void) {
  const t = CHANNEL_DICTS[lang];
  const [data, setData] = useState(initial);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setData(initial), [initial]);
  const sugg = useMemo(() => suggestions(data), [data]);

  const say = useCallback((msg: string) => setToast(msg), []);
  const closeToast = useCallback(() => setToast(null), []);

  const run = useCallback(
    async <R extends { ok: boolean }>(fn: () => Promise<R>): Promise<Extract<R, { ok: true }> | null> => {
      setBusy(true);
      try {
        const r = await fn();
        if (!r.ok) {
          if ((r as { error?: string }).error === "signedOut") window.location.reload();
          else setToast(t.failed);
          return null;
        }
        const d = (r as { data?: ChannelsData }).data;
        if (d) setData(d);
        return r as Extract<R, { ok: true }>;
      } catch {
        setToast(t.failed);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const sync = useCallback(
    async (linkIds: string[], on: boolean, unitName?: string) => {
      if (!linkIds.length) return setToast(t.noLinks);
      const r = await run(() => setSyncing({ linkIds, on }));
      if (!r) return;
      if (!on) return setToast(unitName ? t.syncStopped(unitName) : t.syncStoppedN(linkIds.length));
      const bad = r.outcomes.filter((o) => !o.ok);
      if (bad.length) setDlg({ k: "act", outcomes: r.outcomes });
      else if (r.outcomes.length === 1) {
        setDlg(null);
        setToast(t.syncStartedOn(platformById(r.outcomes[0].platform)?.name ?? ""));
      } else setToast(t.syncStarted(r.outcomes.length));
    },
    [run, t],
  );

  const ctx: Ctx = { lang, t, data, sugg, busy, open: setDlg, say, setTab, run, sync };
  return { ctx, dlg, setDlg, toast, setToast, closeToast };
}
