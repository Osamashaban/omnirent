"use client";

import { useCallback, useState } from "react";
import { Toast } from "@/components/ops/Overlay";

// The dark confirmation toast from the design, shown once after a page loads.
export function BrokerToast({ closeLabel, children }: { closeLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);
  return open ? (
    <Toast onClose={close} closeLabel={closeLabel}>
      {children}
    </Toast>
  ) : null;
}
