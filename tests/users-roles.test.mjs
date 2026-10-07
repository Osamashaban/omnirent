// ---------------------------------------------------------------------------
// Staff sign-in, users and roles.
//
// These pin the promises the Ops dashboard design makes: passwords are never
// stored as typed, a role can use only the modules it was granted, Super Admin
// is granted every module (including ones added later), wrong passwords lock
// the account, and the Users/Roles protections hold.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../lib/password.ts";
import { canAccess } from "../lib/access.ts";
import { MODULES, SUPER_ADMIN_ROLE_ID } from "../lib/modules.ts";
import {
  afterFailedAttempt,
  checkPassword,
  isLocked,
  looksLikeEmail,
  normalizeEmail,
  passwordIsValid,
  shouldWarnAttemptsLeft,
} from "../lib/login-rules.ts";
import { checkUserChange, roleCanBeDeleted } from "../lib/user-rules.ts";
import { DICTS, moduleName } from "../lib/i18n.ts";
import { inviteEmail, resetEmail } from "../lib/email-templates.ts";
import { hashSecret, newSecret } from "../lib/tokens.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function migrationFiles() {
  const dir = join(repoRoot, "prisma", "migrations");
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, sql: readFileSync(join(dir, entry.name, "migration.sql"), "utf8") }));
}

// --- Passwords ---------------------------------------------------------------

test("a stored password is a hash, not the password", async () => {
  const stored = await hashPassword("correct horse battery");
  assert.ok(!stored.includes("correct horse battery"));
  assert.match(stored, /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
});

test("the right password is accepted and a wrong one is refused", async () => {
  const stored = await hashPassword("correct horse battery");
  assert.equal(await verifyPassword("correct horse battery", stored), true);
  assert.equal(await verifyPassword("correct horse batterY", stored), false);
  assert.equal(await verifyPassword("", stored), false);
});

test("the same password hashes differently each time", async () => {
  assert.notEqual(await hashPassword("same"), await hashPassword("same"));
});

test("a damaged stored value refuses every password instead of crashing", async () => {
  for (const stored of ["", "plaintext", "scrypt$0$8$1$abc$def", "bcrypt$1$2$3$4$5"]) {
    assert.equal(await verifyPassword("plaintext", stored), false, stored);
  }
});

test("password rules: 8+ characters, upper and lower case, a number", () => {
  assert.equal(passwordIsValid("NorthCoast26"), true);
  assert.equal(passwordIsValid("Short1A"), false, "too short");
  assert.equal(passwordIsValid("northcoast26"), false, "no upper case");
  assert.equal(passwordIsValid("NORTHCOAST26"), false, "no lower case");
  assert.equal(passwordIsValid("NorthCoast"), false, "no number");
  assert.deepEqual(checkPassword("sahel26"), { length: false, cases: false, number: true });
});

test("emails are trimmed and lowercased before lookup", () => {
  assert.equal(normalizeEmail("  Info@GetOmnirent.com "), "info@getomnirent.com");
  assert.equal(looksLikeEmail("info@getomnirent.com"), true);
  assert.equal(looksLikeEmail("info@getomnirent"), false);
  assert.equal(looksLikeEmail("not an email"), false);
});

// --- Lockout -----------------------------------------------------------------

test("5 wrong passwords within 15 minutes lock the account for 15 minutes", () => {
  const start = new Date("2026-10-07T10:00:00Z");
  let state = { failedLoginCount: 0, lastFailedLoginAt: null, lockedUntil: null };
  for (let i = 1; i <= 4; i++) {
    const next = afterFailedAttempt(state, new Date(start.getTime() + i * 60_000));
    assert.equal(next.locked, false, `attempt ${i}`);
    assert.equal(next.attemptsLeft, 5 - i);
    state = next;
  }
  const fifth = afterFailedAttempt(state, new Date(start.getTime() + 5 * 60_000));
  assert.equal(fifth.locked, true);
  assert.equal(isLocked(fifth, new Date(start.getTime() + 6 * 60_000)), true);
  assert.equal(isLocked(fifth, new Date(start.getTime() + 21 * 60_000)), false);
});

test("wrong passwords spread more than 15 minutes apart don't add up", () => {
  const first = afterFailedAttempt({ failedLoginCount: 4, lastFailedLoginAt: new Date("2026-10-07T10:00:00Z"), lockedUntil: null }, new Date("2026-10-07T10:20:00Z"));
  assert.equal(first.locked, false);
  assert.equal(first.failedLoginCount, 1);
});

test("the attempts-left warning shows from the 3rd failure", () => {
  assert.equal(shouldWarnAttemptsLeft(4), false); // after 1st failure
  assert.equal(shouldWarnAttemptsLeft(3), false); // after 2nd
  assert.equal(shouldWarnAttemptsLeft(2), true); // after 3rd
  assert.equal(shouldWarnAttemptsLeft(1), true); // after 4th
});

// --- Access ------------------------------------------------------------------

test("a role can use only the modules it was granted", () => {
  const granted = ["ops_dashboard"];
  assert.equal(canAccess(granted, "ops_dashboard"), true);
  assert.equal(canAccess(granted, "users_roles"), false);
  assert.equal(canAccess([], "ops_dashboard"), false);
  assert.equal(canAccess(null, "ops_dashboard"), false);
});

test("migrations create the Super Admin role and every module the code knows about", () => {
  const sql = migrationFiles().map((m) => m.sql).join("\n");
  assert.match(sql, new RegExp(`INSERT INTO "Role"[^;]*'${SUPER_ADMIN_ROLE_ID}', 'Super Admin'`));
  const missing = MODULES.filter((m) => !sql.includes(`'${m.key}'`)).map((m) => m.key);
  assert.deepEqual(missing, [], "modules listed in lib/modules.ts but never inserted by a migration");
});

test("every migration that adds a module also grants it to Super Admin", () => {
  const offenders = migrationFiles()
    .filter(({ sql }) => /INSERT INTO "Module"/.test(sql))
    .filter(({ sql }) => !/INSERT INTO "RoleModule"[^;]*SELECT\s+'role_super_admin',\s*"id"\s+FROM\s+"Module"/.test(sql))
    .map((m) => m.name);
  assert.deepEqual(offenders, [], "these migrations add modules without granting them to Super Admin");
});

test("no vendor module exists: this release is Ops only", () => {
  assert.equal(MODULES.some((m) => m.key.includes("vendor")), false);
});

// --- Users and roles protections ---------------------------------------------

const admin = { id: "u_admin", roleId: SUPER_ADMIN_ROLE_ID, status: "ACTIVE" };
const agent = { id: "u_agent", roleId: "role_ops", status: "ACTIVE" };

test("nobody can change their own role or deactivate themselves", () => {
  assert.equal(checkUserChange({ actorId: "u_agent", target: agent, newRoleId: "role_cs", activeSuperAdminCount: 2 }), "cannotChangeSelf");
  assert.equal(checkUserChange({ actorId: "u_agent", target: agent, newStatus: "DEACTIVATED", activeSuperAdminCount: 2 }), "cannotChangeSelf");
  // Saving your own name with the same role is fine.
  assert.equal(checkUserChange({ actorId: "u_agent", target: agent, newRoleId: "role_ops", activeSuperAdminCount: 2 }), null);
});

test("the last active Super Admin can't be deactivated or moved", () => {
  assert.equal(checkUserChange({ actorId: "u_other", target: admin, newStatus: "DEACTIVATED", activeSuperAdminCount: 1 }), "lastSuperAdmin");
  assert.equal(checkUserChange({ actorId: "u_other", target: admin, newRoleId: "role_ops", activeSuperAdminCount: 1 }), "lastSuperAdmin");
  assert.equal(checkUserChange({ actorId: "u_other", target: admin, newStatus: "DEACTIVATED", activeSuperAdminCount: 2 }), null);
  assert.equal(checkUserChange({ actorId: "u_admin", target: agent, newStatus: "DEACTIVATED", activeSuperAdminCount: 1 }), null);
});

test("a role can be deleted only when nobody has it, and never Super Admin", () => {
  assert.equal(roleCanBeDeleted("role_ops", 0), true);
  assert.equal(roleCanBeDeleted("role_ops", 2), false);
  assert.equal(roleCanBeDeleted(SUPER_ADMIN_ROLE_ID, 0), false);
});

// --- Language and emails -----------------------------------------------------

test("Arabic and English have the same text keys", () => {
  assert.deepEqual(Object.keys(DICTS.en).sort(), Object.keys(DICTS.ar).sort());
});

test("built-in modules are named in the viewer's language", () => {
  assert.equal(moduleName(DICTS.ar, { key: "users_roles", name: "Users and roles" }), "المستخدمون والأدوار");
  assert.equal(moduleName(DICTS.en, { key: "users_roles", name: "Users and roles" }), "Users and roles");
  assert.equal(moduleName(DICTS.ar, { key: "future_module", name: "Future" }), "Future");
});

test("emails carry the link and never inject names as HTML", () => {
  const invite = inviteEmail({
    lang: "en",
    to: "a@b.co",
    firstName: "Youssef",
    inviterName: "<script>x</script>",
    roleName: "Ops",
    link: "https://ops.getomnirent.com/accept-invite?token=abc",
  });
  assert.ok(invite.html.includes("https://ops.getomnirent.com/accept-invite?token=abc"));
  assert.ok(!invite.html.includes("<script>"));
  const reset = resetEmail({ lang: "ar", to: "a@b.co", firstName: "منى", link: "https://x/reset?token=1", device: "Chrome", place: "Cairo", when: "now" });
  assert.match(reset.html, /dir="rtl"/);
  assert.ok(reset.text.includes("https://x/reset?token=1"));
});

test("link secrets are random and only their hash is stored", () => {
  const secret = newSecret();
  assert.notEqual(secret, newSecret());
  assert.ok(secret.length >= 40);
  assert.equal(hashSecret(secret), hashSecret(secret));
  assert.ok(!hashSecret(secret).includes(secret));
});
