import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/ops/AuthShell";
import { getDict } from "@/lib/lang";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Omnirent Ops · Sign in" };

type Props = { searchParams: Promise<{ email?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await getCurrentUser()) redirect("/");
  const [{ lang, t }, { email }] = await Promise.all([getDict(), searchParams]);
  const back = email ? `/login?email=${encodeURIComponent(email)}` : "/login";
  return (
    <AuthShell lang={lang} t={t} back={back}>
      <LoginForm t={lang} initialEmail={email ?? ""} />
    </AuthShell>
  );
}
