// ---------------------------------------------------------------------------
// Protections on the Users and Roles tabs, kept free of the database so they
// can be tested directly. The server actions call these before every change.
//
// - Nobody can change their own role or deactivate themselves.
// - The last active Super Admin can't be deactivated or moved to another role,
//   so there is always someone who can manage users.
// - Super Admin itself can't be renamed, edited or deleted.
// - A role can only be deleted when nobody has it.
// ---------------------------------------------------------------------------

import { SUPER_ADMIN_ROLE_ID } from "./modules.ts";

export type UserChange = {
  actorId: string;
  target: { id: string; roleId: string; status: "INVITED" | "ACTIVE" | "DEACTIVATED" };
  newRoleId?: string;
  newStatus?: "ACTIVE" | "DEACTIVATED";
  // Active users who currently have the Super Admin role.
  activeSuperAdminCount: number;
};

export type RuleError = "cannotChangeSelf" | "lastSuperAdmin";

export function checkUserChange(change: UserChange): RuleError | null {
  const { actorId, target, newRoleId, newStatus, activeSuperAdminCount } = change;
  const rolesChanges = newRoleId !== undefined && newRoleId !== target.roleId;
  const deactivates = newStatus === "DEACTIVATED" && target.status !== "DEACTIVATED";

  if (target.id === actorId && (rolesChanges || deactivates)) return "cannotChangeSelf";

  const isActiveSuperAdmin = target.roleId === SUPER_ADMIN_ROLE_ID && target.status === "ACTIVE";
  if (isActiveSuperAdmin && (rolesChanges || deactivates) && activeSuperAdminCount <= 1) return "lastSuperAdmin";

  return null;
}

export function roleIsProtected(roleId: string): boolean {
  return roleId === SUPER_ADMIN_ROLE_ID;
}

export function roleCanBeDeleted(roleId: string, userCount: number): boolean {
  return !roleIsProtected(roleId) && userCount === 0;
}
