import { NextResponse, type NextRequest } from "next/server";

// CSRF guard for the REST API (Next 16 `proxy`, formerly `middleware`). Server
// Actions used to get a same-origin check for free; the plain route handlers
// under /api don't, so we add it here.
//
// Cookie-authenticated state-changing requests (POST/PATCH/PUT/DELETE) must come
// from our own origin. Browsers always attach an `Origin` header on cross-site
// state-changing requests, so a mismatch means the request didn't originate from
// our pages. Bearer-token (mobile) requests carry no cookie and aren't
// CSRF-able, so they're exempt.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const authz = request.headers.get("authorization");
  if (authz?.startsWith("Bearer ")) return NextResponse.next();

  // Cookie-authenticated browser writes always carry an Origin, so a missing or
  // mismatched one means the request didn't come from our pages — block it.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let originHost: string | null = null;
  if (origin) {
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
  }
  if (originHost !== host) {
    return NextResponse.json(
      { error: "Cross-origin request blocked." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
