// The "Channel sync" lines (Property, Unit types, Rates, House policy, Photos
// and content) with each part's state, used in the publishing dialog and on
// the property page.

import type { Lang } from "@/lib/i18n";
import type { PropertyDict } from "@/lib/property-i18n";
import { SYNC_STAGES, type StageState, type SyncError, type SyncStage } from "@/lib/channex-payload";
import { AlertCircle, CheckCircle, Refresh } from "@/components/ops/icons";
import { Clock } from "@/components/broker/property-icons";

export type SyncCounts = { units: number; rates: number };

export function stageLabel(p: PropertyDict, stage: SyncStage, counts: SyncCounts): string {
  const i = SYNC_STAGES.indexOf(stage);
  const label = p.syncSteps[i];
  return stage === "units" ? p.syncCount(label, counts.units) : stage === "rates" ? p.syncCount(label, counts.rates) : label;
}

export function SyncLines({
  p,
  states,
  counts,
  big = false,
}: {
  p: PropertyDict;
  states: Record<SyncStage, StageState>;
  counts: SyncCounts;
  big?: boolean;
}) {
  const failed = SYNC_STAGES.find((s) => states[s] === "failed");
  const icon = big ? 20 : 18;
  return (
    <ul aria-live="polite" className={`m-0 flex list-none flex-col p-0 ${big ? "gap-3 text-[15px]" : "gap-2.5 text-[14px]"}`}>
      {SYNC_STAGES.map((s) => {
        const state = states[s];
        const word =
          state === "done"
            ? p.syncDone
            : state === "sending"
              ? p.syncSending
              : state === "failed"
                ? p.syncFailedState
                : state === "notSynced"
                  ? p.notSynced
                  : failed
                    ? p.waitingFor(p.syncSteps[SYNC_STAGES.indexOf(failed)])
                    : p.syncWaiting;
        return (
          <li key={s} className={`flex items-center ${big ? "gap-3" : "gap-2.5"}`}>
            {state === "done" ? (
              <CheckCircle size={icon} className="flex-none text-[#15803D]" />
            ) : state === "sending" ? (
              <Refresh size={icon} className="flex-none animate-spin text-[#1D4ED8] [animation-duration:1.2s] motion-reduce:animate-none" />
            ) : state === "failed" ? (
              <AlertCircle size={icon} className="flex-none text-[#B91C1C]" />
            ) : state === "notSynced" ? (
              <span aria-hidden="true" className="mx-[5px] h-2 w-2 flex-none rounded-full bg-[#D1D5DB]" />
            ) : (
              <Clock size={icon} className={`flex-none ${big ? "text-[#9CA3AF]" : "text-[#6B7280]"}`} />
            )}
            <span className="flex-1">{stageLabel(p, s, counts)}</span>
            <span className={`text-[#6B7280] ${big ? "text-[13px]" : ""}`}>{word}</span>
          </li>
        );
      })}
    </ul>
  );
}

// "just now", "2 min ago", "3 hours ago"...
export function timeAgo(when: Date, now: Date, lang: Lang, p: PropertyDict): string {
  const seconds = Math.round((now.getTime() - when.getTime()) / 1000);
  if (seconds < 60) return p.justNow;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto", style: lang === "en" ? "short" : "long" });
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

// Keeps what the broker typed (a phone number, say) in its own direction
// inside an Arabic sentence.
const isolate = (text: string) => `\u2068${text}\u2069`;

// Why the last publish failed, in the broker's language.
export function failureText(p: PropertyDict, error: SyncError | null, short = false): string {
  if (error?.field) {
    const label = p.syncFields[error.field];
    return short ? p.syncFailedFieldShort(label, error.message) : p.syncFailedField(label, isolate(error.value ?? ""), error.message);
  }
  if (error?.kind === "refused") return p.syncRefused(error.message);
  return p.syncUnreachable;
}
