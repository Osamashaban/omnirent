"use client";

import { PageError } from "@/components/ops/PageError";

export default function CountriesError({ reset }: { error: Error; reset: () => void }) {
  return <PageError reset={reset} />;
}
