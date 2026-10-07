// ---------------------------------------------------------------------------
// The one rule for "may this person use this module?".
//
// A role may use exactly the modules it has been granted, and nothing else.
// Every role, Super Admin included, follows this same rule.
// ---------------------------------------------------------------------------

import type { ModuleKey } from "./modules";

export function canAccess(
  grantedModuleKeys: readonly string[] | null | undefined,
  module: ModuleKey | (string & {}),
): boolean {
  if (!grantedModuleKeys) return false;
  return grantedModuleKeys.includes(module);
}
