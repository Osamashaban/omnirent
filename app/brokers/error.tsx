"use client";

import { PageError } from "@/components/ops/PageError";

export default function BrokersError({ reset }: { error: Error; reset: () => void }) {
  return <PageError reset={reset} />;
}
