"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideProps, CalendarPlus, BookMarked, User, ShieldCheck } from "lucide-react";
import { cn } from "@sdfwa/ui/lib/utils";

type NavItem = {
	href: string;
	label: string;
	icon: React.ComponentType<LucideProps>;
	exact?: boolean;
};

const BASE_NAV: NavItem[] = [
	{ href: "/fair-registration", label: "Sign Up", icon: CalendarPlus, exact: true },
	{ href: "/fair-registration/my-registrations", label: "My Slots", icon: BookMarked },
	{ href: "/fair-registration/profile", label: "Profile", icon: User },
];

export function MobileBottomNav({ isAdmin }: { isAdmin?: boolean }) {
	const pathname = usePathname();

	const items: NavItem[] = isAdmin
		? [...BASE_NAV, { href: "/fair-registration/admin", label: "Admin", icon: ShieldCheck }]
		: BASE_NAV;

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border sm:hidden">
			<div className="flex h-16">
				{items.map(({ href, label, icon: Icon, exact }) => {
					const isActive = exact ? pathname === href : pathname.startsWith(href);
					return (
						<Link
							key={href}
							href={href}
							className={cn(
								"flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors",
								isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
							)}
						>
							<Icon className="size-5" strokeWidth={isActive ? 2 : 1.5} />
							<span className="text-[10px] font-medium">{label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
