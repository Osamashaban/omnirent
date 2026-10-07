"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { resendReset } from "@/app/actions/auth";
import { DICTS, type Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ops/icons";
import { secondaryButtonClass } from "@/components/ops/ui";

const WAIT_SECONDS = 60;

// Resend unlocks 60 seconds after the page opens (countdown on the button).
export function ResendButton({ lang, email }: { lang: Lang; email: string }) {
  const t = DICTS[lang];
  const [left, setLeft] = useState(WAIT_SECONDS);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return (
    <form action={resendReset} onSubmit={() => setLeft(WAIT_SECONDS)} className="m-0">
      <input type="hidden" name="email" value={email} />
      <Submit disabled={left > 0}>
        {left > 0 ? (
          <>
            {t.resendIn}
            <span dir="ltr">{`0:${String(left).padStart(2, "0")}`}</span>
          </>
        ) : (
          t.resend
        )}
      </Submit>
    </form>
  );
}

function Submit({ disabled, children }: { disabled: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={`${secondaryButtonClass} h-12 w-full disabled:cursor-not-allowed disabled:text-[#6B7280]`}>
      {pending && <Spinner />}
      {children}
    </button>
  );
}
