import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { getDict } from "@/lib/lang";
import { formatLastLogin } from "@/lib/dates";
import { moduleName } from "@/lib/i18n";
import { SUPER_ADMIN_ROLE_ID } from "@/lib/modules";
import { AppShell } from "@/components/ops/AppShell";
import { SettingsHeader } from "@/components/ops/SettingsHeader";
import { UsersView, type UserRow } from "./UsersView";

export const metadata: Metadata = { title: "Omnirent Ops · Users" };

type Props = { searchParams: Promise<{ q?: string; role?: string; status?: string }> };

const STATUSES = ["ACTIVE", "INVITED", "DEACTIVATED"] as const;

export default async function UsersPage({ searchParams }: Props) {
  const me = await requireModule("users_roles");
  const [{ lang, t }, params] = await Promise.all([getDict(), searchParams]);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({ include: { role: true }, orderBy: { name: "asc" } }),
    prisma.role.findMany({
      orderBy: { createdAt: "asc" },
      include: { modules: { include: { module: true }, orderBy: { module: { sortOrder: "asc" } } } },
    }),
  ]);

  const q = (params.q ?? "").trim().toLowerCase();
  const roleFilter = roles.some((r) => r.id === params.role) ? params.role! : "";
  const statusFilter = (STATUSES as readonly string[]).includes(params.status ?? "") ? params.status! : "";
  const filtered = users.filter(
    (u) =>
      (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)) &&
      (!roleFilter || u.roleId === roleFilter) &&
      (!statusFilter || u.status === statusFilter),
  );

  const activeSuperAdmins = users.filter((u) => u.roleId === SUPER_ADMIN_ROLE_ID && u.status === "ACTIVE").length;
  const rows: UserRow[] = filtered.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId,
    roleName: u.role.name,
    status: u.status,
    lastLogin: formatLastLogin(u.lastLoginAt, lang, t),
    isMe: u.id === me.id,
    isLastSuperAdmin: u.roleId === SUPER_ADMIN_ROLE_ID && u.status === "ACTIVE" && activeSuperAdmins <= 1,
  }));
  const roleOptions = roles.map((r) => ({
    id: r.id,
    name: r.name,
    modules: r.modules.map((g) => moduleName(t, g.module)).join(lang === "ar" ? "، " : ", "),
  }));

  const query = new URLSearchParams(Object.entries({ q: params.q ?? "", role: roleFilter, status: statusFilter }).filter(([, v]) => v));
  const back = `/settings/users${query.size ? `?${query}` : ""}`;

  return (
    <AppShell user={me} lang={lang} t={t} active="users" back={back} title={t.usersAndRoles}>
      <SettingsHeader t={t} active="users" userCount={users.length} roleCount={roles.length} />
      <UsersView
        lang={lang}
        rows={rows}
        totalUsers={users.length}
        roles={roleOptions}
        filters={{ q: params.q ?? "", role: roleFilter, status: statusFilter }}
      />
    </AppShell>
  );
}
