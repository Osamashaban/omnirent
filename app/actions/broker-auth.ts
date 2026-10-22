"use server";

// The broker side of app.getomnirent.com: sign in, set a password from the
// invite, forgot password and reset password. Rules come from the build notes
// on the App_Broker_Access design page (version 62) and lib/broker-rules.ts.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { looksLikeEmail, normalizeEmail, passwordIsValid } from "@/lib/login-rules";
import {
  BROKER_FAILURE_WINDOW_MS,
  BROKER_MAX_FAILURES_PER_IP,
  BROKER_MAX_RESETS_PER_EMAIL_PER_HOUR,
  BROKER_MAX_RESETS_PER_IP,
  BROKER_RESET_TTL_MS,
  brokerLinkBase,
  signInLock,
} from "@/lib/broker-rules";
import { endBrokerSession, signOutBrokerUserEverywhere, startBrokerSession } from "@/lib/broker-auth";
import { findUsableBrokerToken } from "@/lib/broker-tokens";
import { hashSecret, newSecret } from "@/lib/tokens";
import { baseUrl, requestDetails } from "@/lib/request-info";
import { sendEmail } from "@/lib/email";
import { brokerResetEmail } from "@/lib/broker-emails";
import { getLang } from "@/lib/lang";

// Used when the email has no account, so a wrong email takes as long as a
// wrong password and the timing does not reveal who has an account.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export type BrokerSignInState = {
  email?: string;
  keep?: boolean;
  emailError?: true;
  passwordError?: true;
  alert?: { kind: "wrong"; attemptsLeft: number } | { kind: "locked" | "deactivated" | "notActivated" };
};

export async function brokerSignIn(_prev: BrokerSignInState, form: FormData): Promise<BrokerSignInState> {
  const email = normalizeEmail(String(form.get("email") ?? "")).slice(0, 254);
  const password = String(form.get("password") ?? "");
  const keep = form.get("keep") === "on";
  const state: BrokerSignInState = { email, keep };

  if (!looksLikeEmail(email)) state.emailError = true;
  if (!password) state.passwordError = true;
  if (state.emailError || state.passwordError) return state;

  const now = new Date();
  const { ip } = await requestDetails();
  const since = new Date(now.getTime() - BROKER_FAILURE_WINDOW_MS);

  if (ip) {
    const fromIp = await prisma.brokerAuthAttempt.count({
      where: { ip, kind: "SIGN_IN_FAILED", createdAt: { gt: since } },
    });
    if (fromIp >= BROKER_MAX_FAILURES_PER_IP) return { ...state, alert: { kind: "locked" } };
  }

  const attempts = await prisma.brokerAuthAttempt.findMany({
    where: { email, kind: { in: ["SIGN_IN_FAILED", "SIGN_IN_OK"] }, createdAt: { gt: since } },
    select: { kind: true, createdAt: true },
  });
  const lock = signInLock(attempts as { kind: "SIGN_IN_FAILED" | "SIGN_IN_OK"; createdAt: Date }[], now);
  if (lock.locked) return { ...state, alert: { kind: "locked" } };

  const user = await prisma.brokerUser.findUnique({ where: { email }, include: { broker: true } });

  // Someone invited who hasn't set a password yet, as the design asks.
  if (user && user.status === "INVITED" && !user.passwordHash && user.broker.status === "ACTIVE") {
    return { ...state, alert: { kind: "notActivated" } };
  }

  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) {
    await prisma.brokerAuthAttempt.create({ data: { kind: "SIGN_IN_FAILED", email, ip } });
    const left = lock.attemptsLeft - 1;
    return { ...state, alert: left <= 0 ? { kind: "locked" } : { kind: "wrong", attemptsLeft: left } };
  }

  // Only someone who knows the password learns that the account is off.
  if (user.status !== "ACTIVE" || user.broker.status !== "ACTIVE") return { ...state, alert: { kind: "deactivated" } };

  await prisma.$transaction([
    prisma.brokerAuthAttempt.create({ data: { kind: "SIGN_IN_OK", email, ip } }),
    prisma.brokerAuthAttempt.deleteMany({ where: { email, createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
    prisma.brokerUser.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
  ]);
  await startBrokerSession(user.id, keep);
  redirect("/broker");
}

export async function brokerSignOut() {
  await endBrokerSession();
  redirect("/broker/login");
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

export type BrokerForgotState = { email?: string; emailError?: true };

export async function brokerRequestReset(_prev: BrokerForgotState, form: FormData): Promise<BrokerForgotState> {
  const email = normalizeEmail(String(form.get("email") ?? "")).slice(0, 254);
  if (!looksLikeEmail(email)) return { email, emailError: true };
  await sendResetLinkIfAllowed(email);
  // Same answer whether or not the email has an account.
  redirect(`/broker/forgot-password/sent?email=${encodeURIComponent(email)}`);
}

async function sendResetLinkIfAllowed(email: string) {
  const now = new Date();
  const details = await requestDetails();
  if (details.ip) {
    const fromIp = await prisma.brokerAuthAttempt.count({
      where: { ip: details.ip, kind: "RESET_REQUEST", createdAt: { gt: new Date(now.getTime() - BROKER_FAILURE_WINDOW_MS) } },
    });
    if (fromIp >= BROKER_MAX_RESETS_PER_IP) return;
  }
  await prisma.brokerAuthAttempt.create({ data: { kind: "RESET_REQUEST", email, ip: details.ip } });

  const user = await prisma.brokerUser.findUnique({ where: { email }, include: { broker: true } });
  if (!user || user.status !== "ACTIVE" || user.broker.status !== "ACTIVE") return;

  const recent = await prisma.brokerToken.count({
    where: { brokerUserId: user.id, type: "RESET", createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
  });
  if (recent >= BROKER_MAX_RESETS_PER_EMAIL_PER_HOUR) return;

  const secret = newSecret();
  await prisma.$transaction([
    // A new request cancels older links.
    prisma.brokerToken.updateMany({ where: { brokerUserId: user.id, type: "RESET", usedAt: null }, data: { usedAt: now } }),
    prisma.brokerToken.create({
      data: {
        type: "RESET",
        brokerUserId: user.id,
        tokenHash: hashSecret(secret),
        expiresAt: new Date(now.getTime() + BROKER_RESET_TTL_MS),
        requestIp: details.ip,
        userAgent: details.userAgent,
      },
    }),
  ]);
  await sendEmail(
    brokerResetEmail({
      lang: await getLang(),
      to: user.email,
      firstName: user.name.split(" ")[0],
      link: `${brokerLinkBase(await baseUrl())}/reset-password?token=${secret}`,
    }),
  );
}

// ---------------------------------------------------------------------------
// Set password (from the invite) and reset password
// ---------------------------------------------------------------------------

export type BrokerPasswordState = {
  passwordError?: true;
  confirmError?: true;
  termsError?: true;
  expired?: true;
};

function checkNewPassword(form: FormData): BrokerPasswordState {
  const password = String(form.get("password") ?? "");
  const state: BrokerPasswordState = {};
  if (!passwordIsValid(password) || password.length > 200) state.passwordError = true;
  if (!password || password !== String(form.get("confirm") ?? "")) state.confirmError = true;
  return state;
}

export async function brokerAcceptInvite(_prev: BrokerPasswordState, form: FormData): Promise<BrokerPasswordState> {
  const token = await findUsableBrokerToken(String(form.get("token") ?? ""), "INVITE");
  if (!token) return { expired: true };

  const state = checkNewPassword(form);
  if (form.get("terms") !== "on") state.termsError = true;
  if (state.passwordError || state.confirmError || state.termsError) return state;

  const now = new Date();
  const passwordHash = await hashPassword(String(form.get("password")));
  await prisma.$transaction([
    prisma.brokerUser.update({
      where: { id: token.brokerUserId },
      data: { passwordHash, status: "ACTIVE", activatedAt: now, lastLoginAt: now },
    }),
    // This link, and any older one still around, can't be used again.
    prisma.brokerToken.updateMany({
      where: { brokerUserId: token.brokerUserId, type: "INVITE", usedAt: null },
      data: { usedAt: now },
    }),
  ]);
  await startBrokerSession(token.brokerUserId, true);
  redirect("/broker/welcome?new=1");
}

export async function brokerResetPassword(_prev: BrokerPasswordState, form: FormData): Promise<BrokerPasswordState> {
  const token = await findUsableBrokerToken(String(form.get("token") ?? ""), "RESET");
  if (!token) return { expired: true };

  const state = checkNewPassword(form);
  if (state.passwordError || state.confirmError) return state;

  const now = new Date();
  await prisma.$transaction([
    prisma.brokerUser.update({
      where: { id: token.brokerUserId },
      data: { passwordHash: await hashPassword(String(form.get("password"))) },
    }),
    prisma.brokerToken.update({ where: { id: token.id }, data: { usedAt: now } }),
  ]);
  // Saving a new password signs the broker out on every other device.
  await signOutBrokerUserEverywhere(token.brokerUserId);
  redirect("/broker/reset-password/done");
}
