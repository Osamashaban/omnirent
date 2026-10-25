// Browser translation (e.g. Chrome's "Translate this page") rewrites the text
// React renders; the next update then crashes the page with "Application
// error: a client-side exception has occurred". The app is already in Arabic
// and English, so the root layout turns automatic translation off.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("the root <html> opts out of browser translation", () => {
  assert.match(layout, /<html[^>]*\stranslate="no"/);
});

test("the root metadata tells Google Translate not to translate", () => {
  assert.match(layout, /other:\s*\{\s*google:\s*"notranslate"\s*\}/);
});
