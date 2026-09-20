// ---------------------------------------------------------------------------
// Guards against undocumented configuration.
//
// If application code reads an environment variable that is not listed in
// .env.example, then deploying that code needs a value nobody wrote down, and
// the deployment breaks in a way that is hard to trace. Nobody reviews diffs
// here line by line, so this check does it instead.
//
// It fails the build the moment `process.env.SOMETHING_NEW` appears in app/ or
// lib/ without a matching entry in .env.example.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

// Directories whose code runs in a deployed environment.
const SCANNED_DIRECTORIES = ["app", "lib"];

const SCANNED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

// Variables the hosting platform sets on its own. They are never written into
// .env.example because nobody configures them by hand.
const PLATFORM_PROVIDED = [/^NODE_ENV$/, /^VERCEL(_|$)/];

function isPlatformProvided(name) {
  return PLATFORM_PROVIDED.some((pattern) => pattern.test(name));
}

function collectSourceFiles(directory) {
  let entries;
  try {
    entries = readdirSync(directory);
  } catch {
    return []; // Directory does not exist yet; nothing to scan.
  }

  return entries.flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      return collectSourceFiles(fullPath);
    }
    return SCANNED_EXTENSIONS.some((extension) => entry.endsWith(extension)) ? [fullPath] : [];
  });
}

// Matches `process.env.NAME`, `process.env["NAME"]` and `process.env['NAME']`.
const ENV_REFERENCE = /process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\])/g;

function findEnvReferences() {
  const references = new Map(); // variable name -> set of files referencing it

  for (const directory of SCANNED_DIRECTORIES) {
    for (const file of collectSourceFiles(join(repoRoot, directory))) {
      const contents = readFileSync(file, "utf8");
      for (const match of contents.matchAll(ENV_REFERENCE)) {
        const name = match[1] ?? match[2];
        if (isPlatformProvided(name)) continue;
        const files = references.get(name) ?? new Set();
        files.add(relative(repoRoot, file));
        references.set(name, files);
      }
    }
  }

  return references;
}

function documentedVariables() {
  const contents = readFileSync(join(repoRoot, ".env.example"), "utf8");
  const names = new Set();

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) names.add(match[1]);
  }

  return names;
}

test("every environment variable read by app/ or lib/ is documented in .env.example", () => {
  const referenced = findEnvReferences();
  const documented = documentedVariables();

  const undocumented = [...referenced.entries()]
    .filter(([name]) => !documented.has(name))
    .map(([name, files]) => `  ${name} (read in ${[...files].sort().join(", ")})`);

  assert.deepEqual(
    undocumented,
    [],
    `These environment variables are read by the application but are not documented in .env.example:\n${undocumented.join("\n")}\n\nAdd each one to .env.example with a placeholder value and a comment explaining where the real value comes from.`,
  );
});

test(".env.example documents the database connection strings", () => {
  const documented = documentedVariables();
  assert.ok(documented.has("DATABASE_URL"), ".env.example must document DATABASE_URL");
  assert.ok(documented.has("DIRECT_URL"), ".env.example must document DIRECT_URL");
});

test("the scanner actually detects an undocumented variable", () => {
  // Without this, the first test would still pass if the scanner silently
  // stopped finding anything — a test that cannot fail is not a test.
  const contents = 'const key = process.env.TOTALLY_UNDOCUMENTED_KEY;\n';
  const found = [...contents.matchAll(ENV_REFERENCE)].map((match) => match[1] ?? match[2]);
  assert.deepEqual(found, ["TOTALLY_UNDOCUMENTED_KEY"]);
  assert.equal(documentedVariables().has("TOTALLY_UNDOCUMENTED_KEY"), false);
});
