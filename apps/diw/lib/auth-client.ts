import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export const { signOut, useSession } = authClient;

export async function memberSignIn({
	email,
	memberId,
	rememberMe = false,
}: {
	email: string;
	memberId: string;
	rememberMe?: boolean;
}) {
	const response = await authClient.$fetch("/sign-in/member", {
		method: "POST",
		body: { email, memberId, rememberMe },
	});
	return response;
}
