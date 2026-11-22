"use client";

import Link from "next/link";
import { Plus } from "@/components/broker/booking-icons";

// The green "+" in the phone top bar: opens a new direct booking.
export function PhoneNewButton({ label }: { label: string }) {
  return (
    <Link href="/broker/bookings?new=1" scroll={false} aria-label={label} className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-[#639922] text-white">
      <Plus size={22} />
    </Link>
  );
}
