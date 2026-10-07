// ---------------------------------------------------------------------------
// Who is signed in.
//
// Signing in creates a Session row and puts its random secret in an httpOnly
// cookie. Every request looks the session up again, so deactivating a user or
// deleting their sessions signs them out everywhere on their next click.
// ---------------------------------------------------------------------------

import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "./db";
import { hashSecret, newSecret } from "./tokens";
import { SESSION_DURATION_MS } from "./login-rules";
import { canAccess } from "./access";
import type { ModuleKey } from "./modules";

export const SESSION_COOKIE = "omni_session";

export async function startSession(userId: string) {
  const secret = newSecret();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await prisma.session.create({ data: { userId, tokenHash: hashSecret(secret), expiresAt, userAgent } });
  (await cookies()).set(SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const secret = jar.get(SESSION_COOKIE)?.value;
  if (secret) await prisma.session.deleteMany({ where: { tokenHash: hashSecret(secret) } });
  jar.delete(SESSION_COOKIE);
}

export async function signOutEverywhere(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  moduleKeys: string[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSecret(secret) },
    include: { user: { include: { role: { include: { modules: { include: { module: true } } } } } } },
  });
  if (!session || session.expiresAt.getTime() <= Date.now() || session.user.status !== "ACTIVE") return null;

  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    moduleKeys: user.role.modules.map((grant) => grant.module.key),
  };
}

// For pages: send signed-out visitors to sign in, and hide pages the role
// has no access to.
export async function requireModule(module: ModuleKey): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccess(user.moduleKeys, module)) notFound();
  return user;
}
