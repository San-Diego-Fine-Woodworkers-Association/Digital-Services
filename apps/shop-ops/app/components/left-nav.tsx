"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
	href: string;
	label: string;
};

type LeftNavProps = {
	items: NavItem[];
};

function pathMatchesNav(pathname: string, href: string) {
	if (pathname === href) return true;
	// Highlight when viewing nested routes under a section (e.g. /reporters/123).
	return pathname.startsWith(`${href}/`);
}

export function LeftNav({ items }: LeftNavProps) {
	const pathname = usePathname() ?? "";

	return (
		<aside className="w-56 shrink-0 rounded-lg border border-border bg-card p-4">
			<h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
				Navigation
			</h2>
			<nav className="space-y-1">
				{items.map((item) => {
					const isActive = pathMatchesNav(pathname, item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							className={`block rounded-md px-3 py-2 text-sm transition-colors ${
								isActive
									? "bg-primary text-primary-foreground"
									: "text-card-foreground hover:bg-accent hover:text-accent-foreground"
							}`}
						>
							{item.label}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
