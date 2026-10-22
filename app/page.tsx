// ---------------------------------------------------------------------------
// Front page.
//
// The same page answers on every address; lib/site.ts decides from the
// address which dashboard it is. The operations dashboard sends people to sign
// in (or into the dashboard once signed in); the vendor dashboard still shows
// its coming-soon page.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { COMING_SOON, siteFor } from "@/lib/site";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { getDict } from "@/lib/lang";
import { AppShell } from "@/components/ops/AppShell";
import { ComingSoon } from "@/components/ComingSoon";

type Props = { searchParams: Promise<{ site?: string }> };

async function currentSite(searchParams: Props["searchParams"]) {
  const [{ site }, headerList] = await Promise.all([searchParams, headers()]);
  return siteFor(headerList.get("x-forwarded-host") ?? headerList.get("host"), site);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const site = await currentSite(searchParams);
  if (site === "ops") return { title: "Omnirent Ops" };
  const copy = COMING_SOON[site];
  return { title: `${copy.title} · Coming soon`, description: copy.description };
}

export default async function Home({ searchParams }: Props) {
  const site = await currentSite(searchParams);
  if (site === "ops") return <OpsHome />;
  return <ComingSoon />;
}

// The Ops dashboard has no home screen yet, so signing in lands on the first
// module the role can use. Other roles see a short notice: either they have no
// modules at all, or only modules whose screens haven't been built yet.
async function OpsHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (canAccess(user.moduleKeys, "brokers")) redirect("/brokers");
  if (canAccess(user.moduleKeys, "users_roles")) redirect("/settings/users");
  if (canAccess(user.moduleKeys, "property_types")) redirect("/settings/property-types");
  if (canAccess(user.moduleKeys, "countries_cities")) redirect("/settings/countries");
  const { lang, t } = await getDict();
  const [title, body] =
    user.moduleKeys.length === 0 ? [t.noModulesTitle, t.noModulesBody] : [t.comingSoonTitle, t.comingSoonBody];
  return (
    <AppShell user={user} lang={lang} t={t} active="users" back="/" title={title}>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center">
        <p className="m-0 text-[17px] font-semibold">{title}</p>
        <p className="m-0 max-w-[420px] text-[14px] leading-[1.6] text-[#4B5563]">{body}</p>
      </div>
    </AppShell>
  );
}
