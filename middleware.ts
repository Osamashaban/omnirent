// One deployment serves both dashboards. This keeps each site's pages on its
// own address:
//
// - The vendor address (app.getomnirent.com and its staging twin) is the
//   broker dashboard. Its pages live under app/broker, and every address there
//   is served from that folder: app.getomnirent.com/login shows
//   app/broker/login. So vendors never see an Ops page or a staff login.
// - The operations address (ops.*) never shows a broker page.
// - Preview links on vercel.app keep every page reachable for review: the
//   broker pages are under /broker there.

import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").toLowerCase();
  const { pathname } = request.nextUrl;
  const isBrokerPath = pathname === "/broker" || pathname.startsWith("/broker/");

  if (host.startsWith("app.")) {
    if (isBrokerPath) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/broker" : `/broker${pathname}`;
    return NextResponse.rewrite(url);
  }
  if (host.startsWith("ops.") && isBrokerPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js internals and files with an extension (icons,
  // images, fonts).
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
