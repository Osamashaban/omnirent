// ---------------------------------------------------------------------------
// Sign-in rules from the Ops dashboard design, kept free of the database so
// they can be tested directly.
//
// - 5 wrong passwords within 15 minutes lock the account for 15 minutes.
// - From the 3rd wrong attempt, the error says how many attempts are left.
// - Passwords: 8+ characters, an upper and a lower case letter, a number.
// ---------------------------------------------------------------------------

export const MAX_FAILED_ATTEMPTS = 5;
export const FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const LOCK_DURATION_MS = 15 * 60 * 1000;
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type LockState = {
  failedLoginCount: number;
  lastFailedLoginAt: Date | null;
  lockedUntil: Date | null;
};

export function isLocked(state: LockState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

// What to store after a wrong password, and how many attempts remain.
export function afterFailedAttempt(state: LockState, now: Date) {
  const withinWindow =
    state.lastFailedLoginAt !== null && now.getTime() - state.lastFailedLoginAt.getTime() < FAILURE_WINDOW_MS;
  const failedLoginCount = (withinWindow ? state.failedLoginCount : 0) + 1;
  const locked = failedLoginCount >= MAX_FAILED_ATTEMPTS;
  return {
    failedLoginCount: locked ? 0 : failedLoginCount,
    lastFailedLoginAt: now,
    lockedUntil: locked ? new Date(now.getTime() + LOCK_DURATION_MS) : null,
    locked,
    attemptsLeft: locked ? 0 : MAX_FAILED_ATTEMPTS - failedLoginCount,
  };
}

// Show "N attempts left" only from the 3rd failure onwards.
export function shouldWarnAttemptsLeft(attemptsLeft: number): boolean {
  return attemptsLeft > 0 && attemptsLeft <= MAX_FAILED_ATTEMPTS - 3;
}

export type PasswordChecks = { length: boolean; cases: boolean; number: boolean };

export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    cases: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function passwordIsValid(password: string): boolean {
  const checks = checkPassword(password);
  return checks.length && checks.cases && checks.number;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
