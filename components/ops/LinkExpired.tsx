import Link from "next/link";
import { BackLink, IconBadge } from "./BackLink";
import { AlertCircle } from "./icons";
import { primaryButtonClass } from "./ui";

export function LinkExpired({
  title,
  body,
  action,
  backLabel,
  help,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  backLabel: string;
  help: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <IconBadge tone="amber">
        <AlertCircle size={26} />
      </IconBadge>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[28px] font-bold leading-[1.2] tracking-[-0.02em] min-[900px]:text-[32px]">{title}</h1>
        <p className="m-0 text-[15px] leading-[1.6] text-[#4B5563] min-[900px]:text-[16px]">{body}</p>
      </div>
      {action && (
        <Link href={action.href} className={primaryButtonClass}>
          {action.label}
        </Link>
      )}
      <BackLink href="/login">{backLabel}</BackLink>
      <p className="m-0 text-[14px] text-[#4B5563]">{help}</p>
    </div>
  );
}
