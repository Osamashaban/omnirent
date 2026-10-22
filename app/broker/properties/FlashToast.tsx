"use client";

import { useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/ops/Overlay";

// The confirmation toast shown after coming back from an action (saved as a
// draft, archived, copied). The "done" note is taken out of the address so a
// refresh doesn't show it again.
export function FlashToast({ closeLabel, children }: { closeLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("done")) return;
    url.searchParams.delete("done");
    window.history.replaceState(null, "", url);
  }, []);
  return open ? (
    <Toast onClose={close} closeLabel={closeLabel}>
      {children}
    </Toast>
  ) : null;
}
