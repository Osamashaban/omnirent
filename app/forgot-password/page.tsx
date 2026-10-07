import type { Metadata } from "next";
import { AuthShell } from "@/components/ops/AuthShell";
import { getDict } from "@/lib/lang";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Omnirent Ops · Forgot password" };

type Props = { searchParams: Promise<{ email?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const [{ lang, t }, { email }] = await Promise.all([getDict(), searchParams]);
  return (
    <AuthShell lang={lang} t={t} back={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}>
      <ForgotForm lang={lang} initialEmail={email ?? ""} />
    </AuthShell>
  );
}
