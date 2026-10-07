// ---------------------------------------------------------------------------
// Sign-in accounts and who may use what.
//
// These pin three promises: passwords are never stored as typed, a role can
// use only the features it was granted, and Super Admin is granted every
// feature, including ones added by later migrations.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../lib/password.ts";
import { canAccess } from "../lib/access.ts";
import { FEATURES } from "../lib/features.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

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

test("a role can use only the features it was granted", () => {
  const role = { featureKeys: ["vendor_dashboard"] };
  assert.equal(canAccess(role, "vendor_dashboard"), true);
  assert.equal(canAccess(role, "ops_dashboard"), false);
  assert.equal(canAccess(role, "users_roles"), false);
  assert.equal(canAccess({ featureKeys: [] }, "vendor_dashboard"), false);
});

test("no role means no access", () => {
  assert.equal(canAccess(null, "vendor_dashboard"), false);
  assert.equal(canAccess(undefined, "vendor_dashboard"), false);
});

test("migrations create the Super Admin role and every feature the code knows about", () => {
  const dir = join(repoRoot, "prisma", "migrations");
  const sql = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readFileSync(join(dir, entry.name, "migration.sql"), "utf8"))
    .join("\n");

  assert.match(sql, /INSERT INTO "Role"[^;]*'Super Admin'/);
  const missing = FEATURES.filter((feature) => !sql.includes(`'${feature.key}'`)).map((feature) => feature.key);
  assert.deepEqual(missing, [], "features listed in lib/features.ts but never inserted by a migration");
});


test("every migration that adds a feature also grants it to Super Admin", () => {
  const dir = join(repoRoot, "prisma", "migrations");
  const offenders = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const sql = readFileSync(join(dir, entry.name, "migration.sql"), "utf8");
      const addsFeature = /INSERT INTO "Feature"/.test(sql);
      const grantsAll = /INSERT INTO "RoleFeature"[^;]*SELECT\s+'role_super_admin',\s*"id"\s+FROM\s+"Feature"/.test(sql);
      return addsFeature && !grantsAll;
    })
    .map((entry) => entry.name);
  assert.deepEqual(offenders, [], "these migrations add features without granting them to Super Admin");
});
