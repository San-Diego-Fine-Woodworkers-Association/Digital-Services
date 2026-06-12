"use client";

import Link from "next/link";
import { Button } from "@sdfwa/ui/components/button";
import { AccountButton } from "@/components/account-button";
import { useSession } from "@sdfwa/auth-client/client";

type HeaderActionsProps = {
	user: { name: string; email: string } | undefined;
};

export function HeaderActions(props: HeaderActionsProps) {
	const session = useSession();

	const user =
		session.status === "authenticated"
			? { name: session.data.user.email, email: session.data.user.email }
			: props.user;

	if (!user) {
		const authBase = process.env.NEXT_PUBLIC_AUTH_BASE_URL;
		const appBase = process.env.NEXT_PUBLIC_BASE_URL;
		const redirectAbs =
			typeof window !== "undefined"
				? window.location.origin + window.location.pathname
				: `${appBase}/fair-registration`;
		const signInHref = `${authBase}/login?redirect=${encodeURIComponent(redirectAbs)}`;
		return (
			<Button variant="outline" asChild>
				<Link href={signInHref}>Sign In</Link>
			</Button>
		);
	}

	return (
		<AccountButton
			firstName={user.name?.split(" ")[0] || ""}
			lastName={user.name?.split(" ").slice(1).join(" ") || ""}
			dropdownGroups={[
				{
					items: [{ label: "Profile", href: "/fair-registration/profile" }],
				},
				{
					items: [
						{
							label: "Sign Out",
							onClick: async () => {
								await fetch(
									`${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/api/auth/sign-out`,
									{
										method: "POST",
										credentials: "include",
										headers: { "Content-Type": "application/json" },
										body: "{}",
									},
								);
								// Hard navigation so useSession remounts and re-fetches
								// instead of holding onto its stale "authenticated" state.
								window.location.assign("/fair-registration");
							},
						},
					],
				},
			]}
		/>
	);
}
