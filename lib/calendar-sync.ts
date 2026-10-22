// Sending calendar saves to Channex. Server only. A save is sent right after
// it is stored; if a property fails, the save stays "failed" with the values
// kept, and Retry sends it again. Changes are always saved in Omnirent first.

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { AriValues } from "./calendar-rules";

// The Channex client is built in the "Save and publish" release
// (lib/channex-ari.ts, pushAri). Until it is merged, no property is on
// Channex, saves carry no values, and this is never reached.
// TODO(channex-publish): call pushAri(propertyId, values) from lib/channex-ari.
async function pushAri(_propertyId: string, _values: AriValues): Promise<void> {
  throw new Error("Channex is not connected yet");
}

export async function sendChange(changeId: string): Promise<boolean> {
  const change = await prisma.calendarChange.findUnique({ where: { id: changeId } });
  if (!change || change.status === "LIVE") return true;
  const values = change.values as Record<string, AriValues>;
  const previous = (change.error ?? null) as Record<string, string> | null;
  // On a retry only the properties that failed are sent again.
  const propertyIds = Object.keys(values).filter((id) => !previous || id in previous);
  const errors: Record<string, string> = {};
  for (const propertyId of propertyIds) {
    try {
      await pushAri(propertyId, values[propertyId]);
    } catch (e) {
      errors[propertyId] = e instanceof Error ? e.message.slice(0, 300) : "failed";
    }
  }
  const ok = Object.keys(errors).length === 0;
  await prisma.calendarChange.update({
    where: { id: changeId },
    data: {
      status: ok ? "LIVE" : "FAILED",
      error: ok ? Prisma.DbNull : (errors as Prisma.InputJsonValue),
      attempts: { increment: 1 },
      sentAt: ok ? new Date() : null,
    },
  });
  return ok;
}

// Sends every failed save of a broker again, oldest first, so later values win.
export async function retryFailed(brokerId: string): Promise<number> {
  const failed = await prisma.calendarChange.findMany({
    where: { brokerId, status: "FAILED" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  let left = 0;
  for (const f of failed) if (!(await sendChange(f.id))) left++;
  return left;
}
