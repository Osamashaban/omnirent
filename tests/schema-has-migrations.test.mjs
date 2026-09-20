// ---------------------------------------------------------------------------
// Guards against a schema change that never became a migration.
//
// Editing prisma/schema.prisma changes nothing on its own — the database only
// changes when a migration runs. So a model added to the schema without a
// matching migration file looks finished, passes a build, and then fails at
// runtime against a table that was never created.
//
// Nobody reviews diffs here line by line, so this check does it instead: every
// model in the schema must have a CREATE TABLE somewhere in prisma/migrations.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const migrationsDirectory = join(repoRoot, "prisma", "migrations");

// Matches `model Listing {` at the start of a line, ignoring commented-out ones.
const MODEL_DECLARATION = /^\s*model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gm;

// Matches `CREATE TABLE "Listing"`, with or without IF NOT EXISTS, and with or
// without a schema prefix such as `public.`.
const CREATE_TABLE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"([^"]+)"/gi;

function declaredModels() {
  const schema = readFileSync(join(repoRoot, "prisma", "schema.prisma"), "utf8");

  // Strip `//` comments so a commented-out model is not counted as declared.
  const uncommented = schema
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

  return new Set([...uncommented.matchAll(MODEL_DECLARATION)].map((match) => match[1]));
}

function migrationSqlFiles() {
  let entries;
  try {
    entries = readdirSync(migrationsDirectory);
  } catch {
    return []; // No migrations directory yet.
  }

  return entries
    .map((entry) => join(migrationsDirectory, entry))
    .filter((path) => statSync(path).isDirectory())
    .map((path) => join(path, "migration.sql"))
    .filter((path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    });
}

function tablesCreatedByMigrations() {
  const tables = new Set();

  for (const file of migrationSqlFiles()) {
    const sql = readFileSync(file, "utf8");
    for (const match of sql.matchAll(CREATE_TABLE)) {
      tables.add(match[1]);
    }
  }

  return tables;
}

test("every model in the schema is created by a migration", () => {
  const models = declaredModels();
  const tables = tablesCreatedByMigrations();

  const missing = [...models].filter((model) => !tables.has(model)).sort();

  assert.deepEqual(
    missing,
    [],
    `These models are declared in prisma/schema.prisma but no migration creates them:\n${missing
      .map((name) => `  ${name}`)
      .join(
        "\n",
      )}\n\nEditing the schema does not change the database. Generate a migration and commit it alongside the schema change.`,
  );
});

test("at least one migration exists", () => {
  // Without this, the check above would pass trivially if the migrations
  // directory went missing entirely.
  //
  // This deliberately does not also require at least one model. It did until
  // the temporary tables were removed, at which point the schema legitimately
  // declared none and the assertion became wrong rather than protective. The
  // job it was doing — proving the model parser still works, so an empty
  // result means "no models" and not "parser broken" — is done by the test
  // below, against a fixed sample that does not depend on what the schema
  // happens to contain today.
  assert.ok(migrationSqlFiles().length > 0, "no migration.sql files were found");
});

test("the parsers actually detect a model and a created table", () => {
  // A check that cannot fail is not a check. Prove both halves still match.
  const schemaSample = "model SampleThing {\n  id String @id\n}\n";
  const foundModels = [...schemaSample.matchAll(MODEL_DECLARATION)].map((match) => match[1]);
  assert.deepEqual(foundModels, ["SampleThing"]);

  const sqlSample = 'CREATE TABLE "SampleThing" (\n    "id" TEXT NOT NULL\n);\n';
  const foundTables = [...sqlSample.matchAll(CREATE_TABLE)].map((match) => match[1]);
  assert.deepEqual(foundTables, ["SampleThing"]);

  // And prove the real schema does not happen to contain the sample name, so
  // the assertion above is testing the parser rather than the repository.
  assert.equal(declaredModels().has("SampleThing"), false);
});
