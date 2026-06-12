import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { corsHeaders } from "@/lib/cors";

const PUBLIC_API_PREFIXES = ["/api/user", "/api/session", "/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }
  const res = NextResponse.next();
  corsHeaders(origin).forEach((v, k) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: ["/api/user/:path*", "/api/session/:path*", "/api/auth/:path*"],
};
