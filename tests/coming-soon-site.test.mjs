// ---------------------------------------------------------------------------
// The two dashboards share one deployment and are told apart by address.
// If this logic breaks, ops.getomnirent.com would show the vendor page (or the
// other way round), so these checks pin which address shows which page.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { COMING_SOON, siteFor } from "../lib/site.ts";

test("ops.getomnirent.com shows the operations dashboard", () => {
  assert.equal(siteFor("ops.getomnirent.com"), "ops");
  assert.equal(siteFor("OPS.getomnirent.com:443"), "ops");
});

test("app.getomnirent.com and the Vercel address show the vendor dashboard", () => {
  assert.equal(siteFor("app.getomnirent.com"), "vendor");
  assert.equal(siteFor("omnirent-sooty.vercel.app"), "vendor");
  assert.equal(siteFor(null), "vendor");
});

test("?site= lets a preview link show either dashboard", () => {
  assert.equal(siteFor("omnirent-git-x.vercel.app", "ops"), "ops");
  assert.equal(siteFor("ops.getomnirent.com", "vendor"), "vendor");
  assert.equal(siteFor("ops.getomnirent.com", "nonsense"), "ops");
});

test("each dashboard has its own title", () => {
  assert.equal(COMING_SOON.ops.title, "Omnirent Operation dashboard");
  assert.equal(COMING_SOON.vendor.title, "Omnirent Vendor dashboard");
});
