// ---------------------------------------------------------------------------
// Which broker is signed in to the broker dashboard (app.getomnirent.com).
//
// Works like lib/auth.ts for Ops users, with its own table and cookie, so the
// two never mix: an Ops session is never a broker session, and the other way
// round. Every request looks the session up again, so deactivating a broker
// (or their company) signs them out on their next click.
// ---------------------------------------------------------------------------

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Broker, BrokerUser } from "@prisma/client";
import { prisma } from "./db";
import { hashSecret, newSecret } from "./tokens";
import { BROKER_LONG_SESSION_MS, BROKER_SHORT_SESSION_MS } from "./broker-rules";

export const BROKER_SESSION_COOKIE = "omni_broker_session";

export async function startBrokerSession(brokerUserId: string, keepSignedIn: boolean) {
  const secret = newSecret();
  const expiresAt = new Date(Date.now() + (keepSignedIn ? BROKER_LONG_SESSION_MS : BROKER_SHORT_SESSION_MS));
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await prisma.brokerSession.create({ data: { brokerUserId, tokenHash: hashSecret(secret), expiresAt, userAgent } });
  (await cookies()).set(BROKER_SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Without "Keep me signed in" the cookie ends when the browser closes.
    ...(keepSignedIn ? { expires: expiresAt } : {}),
  });
}

export async function endBrokerSession() {
  const jar = await cookies();
  const secret = jar.get(BROKER_SESSION_COOKIE)?.value;
  if (secret) await prisma.brokerSession.deleteMany({ where: { tokenHash: hashSecret(secret) } });
  jar.delete(BROKER_SESSION_COOKIE);
}

export async function signOutBrokerUserEverywhere(brokerUserId: string) {
  await prisma.brokerSession.deleteMany({ where: { brokerUserId } });
}

// Signs out everyone at the company, e.g. when Ops deactivates it.
export async function signOutBrokerEverywhere(brokerId: string) {
  await prisma.brokerSession.deleteMany({ where: { brokerUser: { brokerId } } });
}

export type CurrentBroker = { user: BrokerUser; broker: Broker };

export async function getCurrentBroker(): Promise<CurrentBroker | null> {
  const secret = (await cookies()).get(BROKER_SESSION_COOKIE)?.value;
  if (!secret) return null;
  const session = await prisma.brokerSession.findUnique({
    where: { tokenHash: hashSecret(secret) },
    include: { brokerUser: { include: { broker: true } } },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  const { broker, ...user } = session.brokerUser;
  if (user.status !== "ACTIVE" || broker.status !== "ACTIVE") return null;
  return { user, broker };
}

// For broker pages: signed-out visitors go to the broker sign-in.
export async function requireBroker(): Promise<CurrentBroker> {
  const current = await getCurrentBroker();
  if (!current) redirect("/broker/login");
  return current;
}
