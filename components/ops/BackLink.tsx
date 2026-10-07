import Link from "next/link";
import { Arrow } from "./icons";

// "Back to sign in". The arrow points toward the start of the line, so it
// flips with the language.
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-11 items-center gap-1.5 self-start text-[14px] font-medium text-[#3B6D11] no-underline hover:text-[#27500A]"
    >
      <Arrow className="ltr:rotate-180" />
      {children}
    </Link>
  );
}

export function IconBadge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" }) {
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-full ${
        tone === "green" ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FEF3C7] text-[#B45309]"
      }`}
    >
      {children}
    </div>
  );
}
