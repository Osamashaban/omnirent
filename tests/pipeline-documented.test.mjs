// ---------------------------------------------------------------------------
// Guards the feature pipeline that both partners' Claudes follow.
//
// Two partners ship to one production, each through their own Claude. The only
// thing keeping those Claudes in step is PIPELINE.md, reached from CLAUDE.md.
// If the link disappears, or a step or brief section is dropped in an edit,
// one Claude quietly starts working differently from the other. This check
// fails the build instead.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(join(repoRoot, file), "utf8");

test("CLAUDE.md sends every agent to PIPELINE.md", () => {
  assert.match(read("CLAUDE.md"), /`PIPELINE\.md`/);
});

test("the pipeline lists all 15 steps, in order", () => {
  const pipeline = read("PIPELINE.md");
  const checklist = pipeline.split("## Feature status checklist")[1].split("\n## ")[0];
  const numbers = [...checklist.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
  assert.deepEqual(numbers, Array.from({ length: 15 }, (_, i) => i + 1));
});

test("the brief keeps its 10 sections and the deploy line", () => {
  const pipeline = read("PIPELINE.md");
  const brief = pipeline.split("## The 5-minute brief")[1].split("\n## ")[0];
  const numbers = [...brief.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
  assert.deepEqual(numbers, Array.from({ length: 10 }, (_, i) => i + 1));
  assert.match(brief, /Reply "deploy" to ship\./);
});

test("the parallel-work safeguards are still written down", () => {
  const pipeline = read("PIPELINE.md");
  assert.match(pipeline, /label\s+`shipping`/, "the one-release-at-a-time lock");
  assert.match(pipeline, /### Approval between partners/);
  assert.match(pipeline, /up to date with `main`/);
});
