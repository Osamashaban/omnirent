// ---------------------------------------------------------------------------
// Broker sign-in and Ops › Brokers rules from the Broker signup design
// (version 62), kept free of the database so they can be tested directly.
//
// - 3 wrong passwords within 15 minutes lock sign-in for 15 minutes. The
//   error says how many attempts are left from the first wrong one.
// - The count is kept per email, whether or not the email has an account, so
//   the answers never reveal who is a broker.
// - One address (IP) gets at most 20 wrong sign-ins and 10 reset requests in
//   15 minutes, whatever emails it tries.
// - An invite link lasts 7 days, a reset link 60 minutes; both work once.
// ---------------------------------------------------------------------------

export const BROKER_MAX_FAILED_ATTEMPTS = 3;
export const BROKER_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const BROKER_LOCK_DURATION_MS = 15 * 60 * 1000;
export const BROKER_MAX_FAILURES_PER_IP = 20;
export const BROKER_MAX_RESETS_PER_IP = 10;
export const BROKER_MAX_RESETS_PER_EMAIL_PER_HOUR = 5;

export const BROKER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const BROKER_RESET_TTL_MS = 60 * 60 * 1000;

// "Keep me signed in" keeps the session 30 days; otherwise it ends when the
// browser closes, and at the latest after 12 hours.
export const BROKER_LONG_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const BROKER_SHORT_SESSION_MS = 12 * 60 * 60 * 1000;

export type Attempt = { kind: "SIGN_IN_FAILED" | "SIGN_IN_OK"; createdAt: Date };

// Given one email's recent sign-in attempts (any order), is sign-in locked,
// and how many wrong attempts are left? Only failures since the last success
// and inside the 15-minute window count.
export function signInLock(attempts: readonly Attempt[], now: Date) {
  const sorted = [...attempts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const lastOk = sorted.filter((a) => a.kind === "SIGN_IN_OK").pop();
  const failures = sorted.filter(
    (a) =>
      a.kind === "SIGN_IN_FAILED" &&
      now.getTime() - a.createdAt.getTime() < BROKER_FAILURE_WINDOW_MS &&
      (!lastOk || a.createdAt.getTime() > lastOk.createdAt.getTime()),
  );
  if (failures.length >= BROKER_MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(failures[failures.length - 1].createdAt.getTime() + BROKER_LOCK_DURATION_MS);
    return { locked: lockedUntil.getTime() > now.getTime(), attemptsLeft: 0, lockedUntil };
  }
  return { locked: false, attemptsLeft: BROKER_MAX_FAILED_ATTEMPTS - failures.length, lockedUntil: null };
}

// "Invite expired" is not stored: it is an invited broker whose newest link
// has run out (or who has no link at all).
export type ListStatus = "ACTIVE" | "INVITED" | "EXPIRED" | "DEACTIVATED";

export function brokerListStatus(
  broker: { status: "ACTIVE" | "DEACTIVATED" },
  user: { status: "INVITED" | "ACTIVE" | "DEACTIVATED" } | null,
  latestInviteExpiresAt: Date | null,
  now: Date,
): ListStatus {
  if (broker.status === "DEACTIVATED" || !user || user.status === "DEACTIVATED") return "DEACTIVATED";
  if (user.status === "ACTIVE") return "ACTIVE";
  return latestInviteExpiresAt && latestInviteExpiresAt.getTime() > now.getTime() ? "INVITED" : "EXPIRED";
}

// Which row actions the design offers for each status.
export function brokerActions(status: ListStatus) {
  return {
    resend: status === "INVITED" || status === "EXPIRED",
    reactivate: status === "DEACTIVATED",
    deactivate: status === "ACTIVE" || status === "INVITED",
  };
}

// Mobile numbers are stored in E.164: "+" and 10 to 15 digits. People type
// spaces, dashes or a leading 00; those are accepted and removed.
export function normalizeMobile(input: string): string | null {
  let value = input.trim().replace(/[\s\-().]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!/^\+[1-9]\d{9,14}$/.test(value)) return null;
  return value;
}

// "+201005552841" -> "+20 100 555 2841", as the design shows Egyptian numbers.
// Other countries show as stored.
export function formatMobile(e164: string): string {
  const eg = /^\+20(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return eg ? `+20 ${eg[1]} ${eg[2]} ${eg[3]}` : e164;
}

// Approximate units is optional; anything that is not a whole number from 1
// to 100,000 is treated as "not set".
export function parseApproxUnits(input: string): number | null {
  const value = input.trim();
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= 100000 ? n : null;
}

// Two letters for the company tile: "Nile Stays" -> "NS".
export function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Links in broker emails point at the broker site. From ops.getomnirent.com
// (or its staging twin) that is the matching app.* address; on app.* it is
// the same address; on a preview link it is the same address under /broker.
export function brokerLinkBase(origin: string): string {
  const url = new URL(origin);
  if (url.hostname.startsWith("ops.")) {
    url.hostname = `app.${url.hostname.slice(4)}`;
    return url.origin;
  }
  if (url.hostname.startsWith("app.")) return url.origin;
  return `${url.origin}/broker`;
}
