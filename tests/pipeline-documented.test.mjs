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

test("CLAUDE.md blocks feature work until every access check passes", () => {
  const rules = read("CLAUDE.md");
  assert.match(rules, /## Before any feature work: the setup check/);
  for (const service of ["GitHub", "Neon", "Vercel", "Figma"]) {
    assert.match(rules, new RegExp(`\\| ${service} \\|`), `${service} check is missing`);
  }
  assert.match(rules, /Do not start the feature/);
});

test("CLAUDE.md forbids skipping pipeline steps", () => {
  assert.match(read("CLAUDE.md"), /## No step is skipped/);
});

test("Osama Junior onboards the partner in order and checks every step", () => {
  const guide = read("docs/PARTNER-GUIDE.md");
  assert.match(guide, /you are \*\*Osama Junior\*\*/);
  for (const part of ["Part 1: Introduction", "Part 2: The process in a nutshell",
    "Part 3: Setup, step by step", "Part 4: The test release", "Part 5: From now on"]) {
    assert.match(guide, new RegExp(`### ${part}`), `${part} is missing`);
  }
  const setup = guide.split("### Part 3: Setup, step by step")[1].split("\n### ")[0];
  const setupSteps = [...setup.matchAll(/^\| (\d+) \|/gm)].map((m) => Number(m[1]));
  assert.deepEqual(setupSteps, Array.from({ length: 8 }, (_, i) => i + 1));
});

test("the onboarding test release never goes live and waits for the partner to delete it", () => {
  const release = read("docs/PARTNER-GUIDE.md").split("### Part 4: The test release")[1].split("\n### ")[0];
  assert.match(release, /do not\s+merge/);
  assert.match(release, /\*\*Wait for him to say it\.\*\*/);
});

test("the partner's guide walks him through all 15 pipeline steps", () => {
  const guide = read("docs/PARTNER-GUIDE.md");
  const shipping = guide.split("## Building and shipping a feature")[1].split("\n## ")[0];
  const steps = [...shipping.matchAll(/^\| (\d+) \|/gm)].map((m) => Number(m[1]));
  assert.deepEqual(steps, Array.from({ length: 15 }, (_, i) => i + 1));
  assert.match(guide, /## Designing a feature/);
  assert.match(guide, /## Project information/);
});
