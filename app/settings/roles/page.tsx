import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { getDict } from "@/lib/lang";
import { moduleDescription, moduleName } from "@/lib/i18n";
import { roleIsProtected } from "@/lib/user-rules";
import { AppShell } from "@/components/ops/AppShell";
import { SettingsHeader } from "@/components/ops/SettingsHeader";
import { RolesView } from "./RolesView";

export const metadata: Metadata = { title: "Omnirent Ops · Roles" };

export default async function RolesPage() {
  const me = await requireModule("users_roles");
  const { lang, t } = await getDict();

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
