import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Protect admin routes - check for shared auth session cookie
	if (pathname.startsWith("/fair-registration/admin")) {
		const sessionCookie =
			request.cookies.get("better-auth.session_token") ||
			request.cookies.get("__Secure-better-auth.session_token");

		if (!sessionCookie) {
			const authBase =
				process.env.AUTH_BASE_URL ?? "https://auth.sdfwa.org";
			const loginUrl = new URL(`${authBase}/login`);
			loginUrl.searchParams.set("redirect", pathname);
			return NextResponse.redirect(loginUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/fair-registration/admin/:path*"],
};
