// The Ops dashboard's pages (sign in, password reset, Settings) belong to the
// operations site only. On the vendor address (app.getomnirent.com and its
// staging twin) they send people to that site's front page instead, so
// vendors never see a staff login.
// Preview links on vercel.app keep every page reachable for review.

import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").toLowerCase();
  if (host.startsWith("app.")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/forgot-password/:path*", "/reset-password/:path*", "/accept-invite", "/settings/:path*"],
};
