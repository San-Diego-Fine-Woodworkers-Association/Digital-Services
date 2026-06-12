import { cookies } from "next/headers";
import {
	getServerSession as fetchSession,
	getCurrentUser as fetchCurrentUser,
} from "@sdfwa/auth-client/server";
import { hasGroup } from "@sdfwa/auth-client";
import type { CurrentUser, Session } from "@sdfwa/auth-client/types";

export const ADMIN_GROUP = "digital-services";

export function loginUrl(redirectPath: string): string {
	const authBase = process.env.AUTH_BASE_URL ?? "https://auth.sdfwa.org";
	const appBase = process.env.APP_BASE_URL ?? "https://diw.sdfwa.org";
	const absolute = redirectPath.startsWith("http")
		? redirectPath
		: `${appBase}${redirectPath.startsWith("/") ? "" : "/"}${redirectPath}`;
	return `${authBase}/login?redirect=${encodeURIComponent(absolute)}`;
}

async function cookieHeader(): Promise<string> {
	return (await cookies())
		.getAll()
		.map((c) => `${c.name}=${c.value}`)
		.join("; ");
}

export async function getSession(): Promise<Session | null> {
	return fetchSession(await cookieHeader());
}

export async function getUser(): Promise<CurrentUser | null> {
	return fetchCurrentUser(await cookieHeader());
}

export function isAdmin(session: Session | null | undefined): boolean {
	return hasGroup(session?.user.groups ?? [], ADMIN_GROUP);
}

export async function requireSession(): Promise<Session> {
	const s = await getSession();
	if (!s) throw new Error("Unauthorized");
	return s;
}

export async function requireAdmin(): Promise<Session> {
	const s = await requireSession();
	if (!isAdmin(s)) throw new Error("Forbidden");
	return s;
}
