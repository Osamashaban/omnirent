// ---------------------------------------------------------------------------
// Every part of the system a role can be given access to.
//
// The database holds the same list (the Module table), which is what the role
// editor shows. This copy lets code name a module without a typo slipping
// through: canAccess(keys, "users_roles") is checked by TypeScript.
//
// Adding a module means adding it here AND inserting it in a migration that
// also grants it to Super Admin; tests fail if either step is missing.
// ---------------------------------------------------------------------------

export const MODULES = [
  { key: "ops_dashboard", name: "Operations dashboard" },
  { key: "users_roles", name: "Users and roles" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

// The Super Admin role. Seeded by the first migration and protected: it cannot
// be renamed, edited or deleted from the Roles tab. Its access still comes from
// RoleModule rows like every other role.
export const SUPER_ADMIN_ROLE_ID = "role_super_admin";
