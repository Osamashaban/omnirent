// Details about the current request, for email links and the "request details"
// box in the reset email.

import { headers } from "next/headers";

export async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "ops.getomnirent.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function requestDetails() {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : "";
  const decode = (value: string | null) => {
    try {
      return value ? decodeURIComponent(value) : "";
    } catch {
      return value ?? "";
    }
  };
  const city = decode(h.get("x-vercel-ip-city"));
  const country = h.get("x-vercel-ip-country") ?? "";
  return {
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    userAgent: ua.slice(0, 300) || null,
    device: [browser, os].filter(Boolean).join(" · "),
    place: [city, country].filter(Boolean).join(", "),
  };
}
