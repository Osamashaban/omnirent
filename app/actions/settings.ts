"use server";

// Changes made from Settings › Users and Settings › Roles. Every action checks
// again that the signed-in person's role has the "Users and roles" module:
// hiding a button is not a permission check.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, signOutEverywhere, type CurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { SUPER_ADMIN_ROLE_ID } from "@/lib/modules";
import { checkUserChange, roleCanBeDeleted, roleIsProtected } from "@/lib/user-rules";
import { looksLikeEmail, normalizeEmail } from "@/lib/login-rules";
import { hashSecret, newSecret } from "@/lib/tokens";
import { baseUrl } from "@/lib/request-info";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";
import { getLang } from "@/lib/lang";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function requireManager(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.moduleKeys, "users_roles")) throw new Error("Not allowed");
  return user;
}

async function activeSuperAdminCount() {
  return prisma.user.count({ where: { roleId: SUPER_ADMIN_ROLE_ID, status: "ACTIVE" } });
}

async function sendInvite(userId: string, inviter: CurrentUser) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
  const now = new Date();
  const secret = newSecret();
  await prisma.$transaction([
    // Resending cancels the older link.
    prisma.passwordResetToken.updateMany({
      where: { userId, type: "INVITE", usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: { type: "INVITE", userId, tokenHash: hashSecret(secret), expiresAt: new Date(now.getTime() + INVITE_TTL_MS) },
    }),
    prisma.user.update({ where: { id: userId }, data: { invitedAt: now, invitedById: inviter.id } }),
  ]);
  await sendEmail(
    inviteEmail({
      lang: await getLang(),
      to: user.email,
      firstName: user.name.split(" ")[0],
      inviterName: inviter.name,
      roleName: user.role.name,
      link: `${await baseUrl()}/accept-invite?token=${secret}`,
    }),
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserFormState = {
  done?: { kind: "invited" | "saved"; email: string; userId: string; at: number };
  values?: { name: string; email: string; roleId: string };
  nameError?: "enterName";
  emailError?: "enterEmail" | "enterValidEmail" | "emailTaken";
  roleError?: "chooseRole";
  formError?: "cannotChangeSelf" | "lastSuperAdmin" | "somethingWrong";
};

export async function inviteUser(_prev: UserFormState, form: FormData): Promise<UserFormState> {
  const actor = await requireManager();
  const name = String(form.get("name") ?? "").trim();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const roleId = String(form.get("roleId") ?? "");
  const state: UserFormState = { values: { name, email, roleId } };

  if (!name) state.nameError = "enterName";
  if (!email) state.emailError = "enterEmail";
  else if (!looksLikeEmail(email)) state.emailError = "enterValidEmail";
  if (!roleId || !(await prisma.role.findUnique({ where: { id: roleId } }))) state.roleError = "chooseRole";
  if (!state.emailError && (await prisma.user.findUnique({ where: { email } }))) state.emailError = "emailTaken";
  if (state.nameError || state.emailError || state.roleError) return state;

  const user = await prisma.user.create({ data: { name, email, roleId, status: "INVITED" } });
  await sendInvite(user.id, actor);
  revalidatePath("/settings", "layout");
  return { done: { kind: "invited", email, userId: user.id, at: Date.now() } };
}

export async function updateUser(_prev: UserFormState, form: FormData): Promise<UserFormState> {
  const actor = await requireManager();
  const userId = String(form.get("userId") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const roleId = String(form.get("roleId") ?? "");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { formError: "somethingWrong" };
  const state: UserFormState = { values: { name, email: target.email, roleId } };

  if (!name) state.nameError = "enterName";
  if (!roleId || !(await prisma.role.findUnique({ where: { id: roleId } }))) state.roleError = "chooseRole";
  if (state.nameError || state.roleError) return state;

  const ruleError = checkUserChange({
    actorId: actor.id,
    target,
    newRoleId: roleId,
    activeSuperAdminCount: await activeSuperAdminCount(),
  });
  if (ruleError) return { ...state, formError: ruleError };

  await prisma.user.update({ where: { id: userId }, data: { name, roleId } });
  revalidatePath("/settings", "layout");
  return { done: { kind: "saved", email: target.email, userId, at: Date.now() } };
}

export type RowActionResult = { ok: boolean; message?: "userDeactivated" | "userReactivated" | "inviteResent"; error?: "cannotChangeSelf" | "lastSuperAdmin" | "somethingWrong"; email?: string };

export async function setUserActive(userId: string, active: boolean): Promise<RowActionResult> {
  const actor = await requireManager();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "somethingWrong" };

  const ruleError = checkUserChange({
    actorId: actor.id,
    target,
    newStatus: active ? "ACTIVE" : "DEACTIVATED",
    activeSuperAdminCount: await activeSuperAdminCount(),
  });
  if (ruleError) return { ok: false, error: ruleError };

  if (active) {
    // Someone who never accepted their invite goes back to "invited".
    await prisma.user.update({ where: { id: userId }, data: { status: target.passwordHash ? "ACTIVE" : "INVITED" } });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { status: "DEACTIVATED" } });
    await signOutEverywhere(userId);
  }
  revalidatePath("/settings", "layout");
  return { ok: true, message: active ? "userReactivated" : "userDeactivated", email: target.email };
}

export async function resendInvite(userId: string): Promise<RowActionResult> {
  const actor = await requireManager();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.status !== "INVITED") return { ok: false, error: "somethingWrong" };
  await sendInvite(userId, actor);
  revalidatePath("/settings", "layout");
  return { ok: true, message: "inviteResent", email: target.email };
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type RoleFormState = {
  done?: { at: number; roleId: string; name: string };
  values?: { name: string; moduleIds: string[] };
  nameError?: "enterRoleName" | "roleNameTaken";
  modulesError?: "pickOneModule";
  formError?: "somethingWrong";
};

export async function saveRole(_prev: RoleFormState, form: FormData): Promise<RoleFormState> {
  await requireManager();
  const roleId = String(form.get("roleId") ?? "") || null;
  const name = String(form.get("name") ?? "").trim();
  const requested = form.getAll("moduleIds").map(String);
  const modules = await prisma.module.findMany({ where: { id: { in: requested } } });
  const moduleIds = modules.map((m) => m.id);
  const state: RoleFormState = { values: { name, moduleIds } };

  if (roleId && roleIsProtected(roleId)) return { ...state, formError: "somethingWrong" };
  if (!name) state.nameError = "enterRoleName";
  else {
    const clash = await prisma.role.findFirst({ where: { name: { equals: name, mode: "insensitive" }, NOT: roleId ? { id: roleId } : undefined } });
    if (clash) state.nameError = "roleNameTaken";
  }
  if (moduleIds.length === 0) state.modulesError = "pickOneModule";
  if (state.nameError || state.modulesError) return state;

  const saved = await prisma.$transaction(async (tx) => {
    const role = roleId
      ? await tx.role.update({ where: { id: roleId }, data: { name } })
      : await tx.role.create({ data: { name } });
    await tx.roleModule.deleteMany({ where: { roleId: role.id } });
    await tx.roleModule.createMany({ data: moduleIds.map((moduleId) => ({ roleId: role.id, moduleId })) });
    return role;
  });
  revalidatePath("/settings", "layout");
  return { done: { at: Date.now(), roleId: saved.id, name: saved.name } };
}

export async function deleteRole(roleId: string): Promise<{ ok: boolean; userCount?: number }> {
  await requireManager();
  const userCount = await prisma.user.count({ where: { roleId } });
  if (!roleCanBeDeleted(roleId, userCount)) return { ok: false, userCount };
  await prisma.role.delete({ where: { id: roleId } });
  revalidatePath("/settings", "layout");
  return { ok: true };
}
