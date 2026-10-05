// ---------------------------------------------------------------------------
// Coming-soon page.
//
// The same page answers on every address; lib/site.ts decides from the
// address whether to show the operations dashboard or the vendor dashboard.
// Replace this with the first real screen of each dashboard.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { headers } from "next/headers";
import { COMING_SOON, siteFor } from "@/lib/site";

type Props = { searchParams: Promise<{ site?: string }> };

async function currentSite(searchParams: Props["searchParams"]) {
  const [{ site }, headerList] = await Promise.all([searchParams, headers()]);
  return siteFor(headerList.get("x-forwarded-host") ?? headerList.get("host"), site);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const copy = COMING_SOON[await currentSite(searchParams)];
  return { title: `${copy.title} · Coming soon`, description: copy.description };
}

export default async function ComingSoon({ searchParams }: Props) {
  const copy = COMING_SOON[await currentSite(searchParams)];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div aria-hidden className="glow" />
      <div className="relative w-full max-w-xl rounded-[16px] border border-[color:var(--surface-200)] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-12">
        {/* The wordmark is live text rather than the logo SVG: an SVG shown as an
            image cannot load the brand font, so its letters render misspaced. */}
        <div className="flex items-center gap-3" aria-label="Omnirent">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG mark from the design system */}
          <img src="/brand/logo-mark.svg" alt="" width={40} height={40} />
          <span className="font-[family-name:var(--font-dm-sans)] text-[20px] font-medium tracking-[-0.015em]">
            <span className="text-[color:var(--omni-primary-dark)]">Omni</span>
            <span className="text-[color:var(--p-primary)]">rent</span>
          </span>
        </div>

        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--p-primary)]">
          Coming soon
        </p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-[color:var(--text-primary)]">
          {copy.title}
        </h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-[color:var(--text-secondary)]">
          {copy.description}
        </p>

        <div lang="ar" dir="rtl" className="mt-8 border-t border-[color:var(--surface-200)] pt-8">
          <p className="text-[13px] font-bold text-[color:var(--p-primary)]">قريبًا</p>
          <h2 className="mt-2 text-[24px] font-bold leading-[1.35] text-[color:var(--text-primary)]">
            {copy.titleAr}
          </h2>
          <p className="mt-2 text-[16px] leading-[1.7] text-[color:var(--text-secondary)]">
            {copy.descriptionAr}
          </p>
        </div>
      </div>
    </main>
  );
}
