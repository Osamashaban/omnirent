"use client";

import { PageError } from "@/components/ops/PageError";

export default function PropertyTypesError({ reset }: { error: Error; reset: () => void }) {
  return <PageError reset={reset} />;
}
