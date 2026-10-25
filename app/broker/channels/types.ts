// What the Channels page passes around: the open dialog and the page's
// shared helpers.

import type { ChannelsData, SyncOutcome } from "@/lib/channel-data";
import type { ChannelDict } from "@/lib/channel-i18n";
import type { Lang } from "@/lib/i18n";

export type Dlg =
  | { k: "abb"; wait: boolean }
  | { k: "guide"; p: string; prop?: string | null; re?: boolean }
  | { k: "imp"; p: string; prop: string | null; listings: number; matches: number; bookings: number }
  | { k: "manage"; p: string }
  | { k: "disc"; p: string; blocked: boolean }
  | { k: "pull" }
  | { k: "pick"; p: string; u: string }
  | { k: "create"; p: string; u: string }
  | { k: "rates"; p: string; u: string; fresh: boolean }
  | { k: "act"; outcomes: SyncOutcome[] }
  | { k: "unblock"; p: string; u: string }
  | { k: "cur"; p: string; prop: string; fields: Record<string, string>; currency: string; own: string };

export type Tab = "plat" | "links";

export type Ctx = {
  lang: Lang;
  t: ChannelDict;
  data: ChannelsData;
  sugg: Record<string, string>;
  busy: boolean;
  open: (d: Dlg | null) => void;
  say: (msg: string) => void;
  setTab: (t: Tab) => void;
  // Runs a server action, keeps its fresh data, and returns its answer
  // (null when it failed; the failure toast is shown already).
  run: <R extends { ok: boolean }>(fn: () => Promise<R>) => Promise<Extract<R, { ok: true }> | null>;
  // Starts or stops syncing for these links and shows the outcome.
  sync: (linkIds: string[], on: boolean, unitName?: string) => Promise<void>;
};
