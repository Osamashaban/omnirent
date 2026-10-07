"use server";

// Sign in, sign out, forgot password, reset password and accept invite.
// Rules come from the build notes on the Ops_Dashboard_Login design page.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { endSession, signOutEverywhere, startSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  afterFailedAttempt,
  isLocked,
  looksLikeEmail,
  normalizeEmail,
  passwordIsValid,
  shouldWarnAttemptsLeft,
} from "@/lib/login-rules";
import { LANG_COOKIE, langFrom } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { hashSecret, newSecret } from "@/lib/tokens";
import { findUsableToken } from "@/lib/auth-tokens";
import { baseUrl, requestDetails } from "@/lib/request-info";
import { sendEmail } from "@/lib/email";
import { passwordChangedEmail, resetEmail } from "@/lib/email-templates";
import { formatDateTime } from "@/lib/dates";

export type SignInState = {
  email?: string;
  emailError?: "enterEmail" | "enterValidEmail";
  passwordError?: "enterPassword";
  formError?: "wrongCredentials" | "lockedOut";
  attemptsLeft?: number;
};

// Used when the email has no account, so a wrong email takes as long as a
// wrong password and the timing does not reveal who has an account.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const state: SignInState = { email };

  if (!email) state.emailError = "enterEmail";
  else if (!looksLikeEmail(email)) state.emailError = "enterValidEmail";
  if (!password) state.passwordError = "enterPassword";
  if (state.emailError || state.passwordError) return state;

  const now = new Date();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    await verifyPassword(password, DUMMY_HASH);
    return { ...state, formError: "wrongCredentials" };
  }
  if (isLocked(user, now)) return { ...state, formError: "lockedOut" };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const next = afterFailedAttempt(user, now);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: next.failedLoginCount,
        lastFailedLoginAt: next.lastFailedLoginAt,
        lockedUntil: next.lockedUntil,
      },
    });
    if (next.locked) return { ...state, formError: "lockedOut" };
    return {
      ...state,
      formError: "wrongCredentials",
      attemptsLeft: shouldWarnAttemptsLeft(next.attemptsLeft) ? next.attemptsLeft : undefined,
    };
  }

  // A deactivated (or not yet accepted) account gets the same message as a
  // wrong password, as the design asks.
  if (user.status !== "ACTIVE") return { ...state, formError: "wrongCredentials" };

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lastFailedLoginAt: null, lockedUntil: null, lastLoginAt: now },
  });
  await startSession(user.id);
  redirect("/");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

export async function setLanguage(form: FormData) {
  const lang = langFrom(String(form.get("lang") ?? ""));
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const back = String(form.get("back") ?? "/");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

export type ForgotState = { email?: string; emailError?: "enterEmail" | "enterValidEmail" };

const RESET_TTL_MS = 60 * 60 * 1000;
const MAX_RESETS_PER_HOUR = 5;

export async function requestReset(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (!email) return { email, emailError: "enterEmail" };
  if (!looksLikeEmail(email)) return { email, emailError: "enterValidEmail" };

  await sendResetLinkIfAllowed(email);
  // Same answer whether or not the email has an account.
  redirect(`/forgot-password/sent?email=${encodeURIComponent(email)}`);
}

export async function resendReset(form: FormData) {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (looksLikeEmail(email)) await sendResetLinkIfAllowed(email);
  redirect(`/forgot-password/sent?email=${encodeURIComponent(email)}`);
}

async function sendResetLinkIfAllowed(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;

  const now = new Date();
  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, type: "RESET", createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_RESETS_PER_HOUR) return;

  const details = await requestDetails();
  const secret = newSecret();
  await prisma.$transaction([
    // A new request cancels older links.
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, type: "RESET", usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        type: "RESET",
        userId: user.id,
        tokenHash: hashSecret(secret),
        expiresAt: new Date(now.getTime() + RESET_TTL_MS),
        requestIp: details.ip,
        userAgent: details.userAgent,
      },
    }),
  ]);

  const lang = await getLang();
  await sendEmail(
    resetEmail({
      lang,
      to: user.email,
      firstName: user.name.split(" ")[0],
      link: `${await baseUrl()}/reset-password?token=${secret}`,
      device: details.device,
      place: details.place,
      when: formatDateTime(now, lang),
    }),
  );
}

// ---------------------------------------------------------------------------
// Reset password and accept invite share the same form.
// ---------------------------------------------------------------------------

export type SetPasswordState = {
  error?: "passwordTooWeak" | "passwordsDontMatch" | "samePassword" | "expired";
};

function checkNewPassword(password: string, confirm: string): SetPasswordState["error"] | undefined {
  if (!passwordIsValid(password)) return "passwordTooWeak";
  if (password !== confirm) return "passwordsDontMatch";
  return undefined;
}

export async function resetPassword(_prev: SetPasswordState, form: FormData): Promise<SetPasswordState> {
  const token = await findUsableToken(String(form.get("token") ?? ""), "RESET");
  if (!token) return { error: "expired" };

  const password = String(form.get("password") ?? "");
  const error = checkNewPassword(password, String(form.get("confirm") ?? ""));
  if (error) return { error };
  if (token.user.passwordHash && (await verifyPassword(password, token.user.passwordHash))) {
    return { error: "samePassword" };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: now } }),
  ]);
  await signOutEverywhere(token.userId);

  const lang = await getLang();
  await sendEmail(
    passwordChangedEmail({
      lang,
      to: token.user.email,
      firstName: token.user.name.split(" ")[0],
      when: formatDateTime(now, lang),
    }),
  );
  redirect(`/reset-password/done?email=${encodeURIComponent(token.user.email)}`);
}

export async function acceptInvite(_prev: SetPasswordState, form: FormData): Promise<SetPasswordState> {
  const token = await findUsableToken(String(form.get("token") ?? ""), "INVITE");
  if (!token) return { error: "expired" };

  const password = String(form.get("password") ?? "");
  const error = checkNewPassword(password, String(form.get("confirm") ?? ""));
  if (error) return { error };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash: await hashPassword(password), status: "ACTIVE" },
    }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
  ]);
  redirect(`/login?email=${encodeURIComponent(token.user.email)}`);
}
