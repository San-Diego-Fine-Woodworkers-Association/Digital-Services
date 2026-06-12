"use client";

import Link from "next/link";
import { Button } from "@sdfwa/ui/components/button";
import { AccountButton } from "@/components/account-button";
import { useSession } from "@sdfwa/auth-client/client";
import { useAppConfig } from "@/lib/app-config";

type HeaderActionsProps = {
	user: { name: string; email: string } | undefined;
};

export function HeaderActions({ user: propsUser }: HeaderActionsProps) {
	const session = useSession();
	const { authBaseUrl, appBaseUrl } = useAppConfig();

	const user =
		session.status === "authenticated"
			? { name: session.data.user.email, email: session.data.user.email }
			: propsUser;

	if (!user) {
		const redirectAbs =
			typeof window !== "undefined"
				? window.location.origin + window.location.pathname
				: `${appBaseUrl}/fair-registration`;
		const signInHref = `${authBaseUrl}/login?redirect=${encodeURIComponent(redirectAbs)}`;
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
									`${authBaseUrl}/api/auth/sign-out`,
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
