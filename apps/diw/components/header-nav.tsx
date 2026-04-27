"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavButton } from "@sdfwa/ui/components/nav-button";
import { useSession } from "@/lib/auth-client";

type HeaderNavProps = {
	roles: string[] | undefined;
};

export function HeaderNav(props: HeaderNavProps) {
	const { data: session } = useSession();
	const pathname = usePathname();
	const roles = (session as Record<string, unknown>)?.roles as string[] | undefined || props.roles;
	const isAdmin = roles?.includes("admin");

	const isActive = (href: string, exact = false) =>
		exact ? pathname === href : pathname.startsWith(href);

	return (
		<>
			<NavButton asChild isActive={isActive("/fair-registration", true)}>
				<Link href="/fair-registration">Sign Up</Link>
			</NavButton>
			<NavButton asChild isActive={isActive("/fair-registration/my-registrations")}>
				<Link href="/fair-registration/my-registrations">My Slots</Link>
			</NavButton>
			<NavButton asChild isActive={isActive("/fair-registration/profile")}>
				<Link href="/fair-registration/profile">Profile</Link>
			</NavButton>
			{isAdmin && (
				<NavButton asChild isActive={isActive("/fair-registration/admin")}>
					<Link href="/fair-registration/admin">Admin</Link>
				</NavButton>
			)}
		</>
	);
}
