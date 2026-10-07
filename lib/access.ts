// ---------------------------------------------------------------------------
// The one rule for "may this person use this feature?".
//
// A role may use exactly the features it has been granted, and nothing else.
// Every role, Super Admin included, follows this same rule.
// ---------------------------------------------------------------------------

import type { FeatureKey } from "./features";

export type RoleAccess = {
  // Keys of the features this role has been granted.
  featureKeys: readonly string[];
};

export function canAccess(role: RoleAccess | null | undefined, feature: FeatureKey | (string & {})): boolean {
  if (!role) return false;
  return role.featureKeys.includes(feature);
}
