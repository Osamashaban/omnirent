// ---------------------------------------------------------------------------
// Every part of the system a role can be given access to.
//
// The database holds the same list (the Feature table), which is what the
// roles screen will show. This copy lets code name a feature without a typo
// slipping through: canAccess(role, "users_roles") is checked by TypeScript.
//
// Adding a feature means adding it here AND inserting it in a migration that
// also grants it to Super Admin; tests fail if either step is missing.
// ---------------------------------------------------------------------------

export const FEATURES = [
  { key: "vendor_dashboard", name: "Vendor dashboard" },
  { key: "ops_dashboard", name: "Operations dashboard" },
  { key: "users_roles", name: "Users and roles" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
