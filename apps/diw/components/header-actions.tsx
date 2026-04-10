"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@sdfwa/ui/components/button";
import { AccountButton } from "@/components/account-button";
import { useSession, signOut } from "@/lib/auth-client";
import { User } from "better-auth";

type HeaderActionsProps = {
	user: User | undefined;
};

export function HeaderActions(props: HeaderActionsProps) {
	const session = useSession();
	const router = useRouter();

	const user = session.data?.user || props.user;

	if (!user) {
		return (
			<Button variant="outline" asChild>
				<Link href="/fair-registration/login">Sign In</Link>
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
								await signOut();
								router.push("/fair-registration");
								router.refresh();
							},
						},
					],
				},
			]}
		/>
	);
}
