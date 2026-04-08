"use client";

import Link from "next/link";
import { NavButton } from "@sdfwa/ui/components/nav-button";
import { useSession } from "@/lib/auth-client";

type HeaderNavProps = {
	roles: string[] | undefined;
};

export function HeaderNav(props: HeaderNavProps) {
	const { data: session } = useSession();
  const roles = (session as Record<string, unknown>)?.roles as string[] | undefined || props.roles;
  const isAdmin = roles?.includes("admin");

	return (
		<>
			<NavButton asChild><Link href="/fair-registration">Register</Link></NavButton>
			<NavButton asChild><Link href="/fair-registration/my-registrations">My Registrations</Link></NavButton>
			<NavButton asChild><Link href="/fair-registration/profile">Profile</Link></NavButton>
			{isAdmin && (
				<NavButton asChild><Link href="/fair-registration/admin">Admin</Link></NavButton>
			)}
		</>
	);
}
