import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getServerSession() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	return session;
}

export async function requireAuth() {
	const session = await getServerSession();
	if (!session?.user) throw new Error("Unauthorized");
	return session;
}

export async function requireAdmin() {
	const session = await requireAuth();
	const roles = (session as Record<string, unknown>)?.roles as string[] | undefined;
	if (!roles?.includes("admin")) throw new Error("Forbidden");
	return session;
}
