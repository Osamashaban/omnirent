// The database client must wait long enough for a sleeping Neon database to
// wake up (see lib/db.ts). This checks the connection string helper.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../lib/db.ts", import.meta.url), "utf8");
const body = source.match(/export function withWakeUpTimeout[\s\S]*?\n}/)[0]
  .replace("export function", "function")
  .replace(/: string \| undefined/g, "");
const withWakeUpTimeout = new Function(`${body}; return withWakeUpTimeout;`)();

test("adds connect_timeout after existing query parameters", () => {
  assert.equal(withWakeUpTimeout("postgresql://u:p@h/db?sslmode=require"), "postgresql://u:p@h/db?sslmode=require&connect_timeout=20");
});
test("adds connect_timeout when there are no parameters", () => {
  assert.equal(withWakeUpTimeout("postgresql://u:p@h/db"), "postgresql://u:p@h/db?connect_timeout=20");
});
test("keeps a connect_timeout that is already set", () => {
  assert.equal(withWakeUpTimeout("postgresql://u:p@h/db?connect_timeout=5"), "postgresql://u:p@h/db?connect_timeout=5");
});
test("leaves a missing URL alone", () => {
  assert.equal(withWakeUpTimeout(undefined), undefined);
});
test("the Prisma client uses it", () => {
  assert.match(source, /datasourceUrl: withWakeUpTimeout\(process\.env\.DATABASE_URL\)/);
});
