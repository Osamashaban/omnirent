// ---------------------------------------------------------------------------
// The one rule for "may this person use this feature?".
//
// Super Admin may use everything, always, including features that did not
// exist when the role was created. Any other role may use exactly the features
// it has been granted, and nothing else.
// ---------------------------------------------------------------------------

import type { FeatureKey } from "./features";

export type RoleAccess = {
  isSuperAdmin: boolean;
  // Keys of the features this role has been granted.
  featureKeys: readonly string[];
};

export function canAccess(role: RoleAccess | null | undefined, feature: FeatureKey | (string & {})): boolean {
  if (!role) return false;
  if (role.isSuperAdmin) return true;
  return role.featureKeys.includes(feature);
}
