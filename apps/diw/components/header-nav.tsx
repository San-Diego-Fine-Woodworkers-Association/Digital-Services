"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavButton } from "@sdfwa/ui/components/nav-button";
import { useSession } from "@sdfwa/auth-client/client";
import { hasGroup } from "@sdfwa/auth-client";

const ADMIN_GROUP = "digital-services";

type HeaderNavProps = {
	groups: string[];
};

export function HeaderNav(props: HeaderNavProps) {
	const session = useSession();
	const pathname = usePathname();
	const groups =
		session.status === "authenticated" ? session.data.user.groups : props.groups;
	const isAdmin = hasGroup(groups, ADMIN_GROUP);

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
