import { redirect } from "next/navigation";

// Settings has no page of its own: send people to the home page, which opens
// the first Settings page their role can use.
export default function SettingsPage() {
  redirect("/");
}
