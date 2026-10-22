import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { getDict } from "@/lib/lang";
import { moduleDescription, moduleName } from "@/lib/i18n";
import { roleIsProtected } from "@/lib/user-rules";
import { AppShell } from "@/components/ops/AppShell";
import { NoAccess } from "@/components/ops/PageStates";
import { SettingsHeader } from "@/components/ops/SettingsHeader";
import { RolesView } from "./RolesView";

export const metadata: Metadata = { title: "Omnirent Ops · Roles" };

export default async function RolesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { lang, t } = await getDict();

  if (!canAccess(me.moduleKeys, "users_roles")) {
    return (
      <AppShell user={me} lang={lang} t={t} active="users" back="/settings/roles" title={t.usersAndRoles}>
        <NoAccess t={t} roleName={me.roleName} />
      </AppShell>
    );
  }

  const [roles, modules, userCount] = await Promise.all([
    prisma.role.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        modules: { include: { module: true }, orderBy: { module: { sortOrder: "asc" } } },
        _count: { select: { users: true } },
      },
    }),
    prisma.module.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.count(),
  ]);

  return (
    <AppShell user={me} lang={lang} t={t} active="users" back="/settings/roles" title={t.usersAndRoles}>
      <SettingsHeader t={t} active="roles" userCount={userCount} roleCount={roles.length} />
      <RolesView
        lang={lang}
        roles={roles.map((r) => ({
          id: r.id,
          name: r.name,
          isProtected: roleIsProtected(r.id),
          userCount: r._count.users,
          moduleIds: r.modules.map((g) => g.moduleId),
          moduleNames: r.modules.map((g) => moduleName(t, g.module)),
        }))}
        modules={modules.map((m) => ({ id: m.id, name: moduleName(t, m), description: moduleDescription(t, m) }))}
      />
    </AppShell>
  );
}
