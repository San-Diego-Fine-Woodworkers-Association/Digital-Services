import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Protect admin routes - check for session cookie
	if (pathname.startsWith("/fair-registration/admin")) {
		const sessionCookie =
			request.cookies.get("better-auth.session_token") ||
			request.cookies.get("__Secure-better-auth.session_token");

		if (!sessionCookie) {
			const loginUrl = new URL("/fair-registration/login", request.url);
			loginUrl.searchParams.set("redirect", pathname);
			return NextResponse.redirect(loginUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/fair-registration/admin/:path*"],
};
