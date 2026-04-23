import Link from "next/link";

export type NavItem = {
	key: string;
	label: string;
};

type LeftNavProps = {
	items: NavItem[];
	selectedKey: string;
};

export function LeftNav({ items, selectedKey }: LeftNavProps) {
	return (
		<aside className="w-56 shrink-0 rounded-lg border border-border bg-card p-4">
			<h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
				Navigation
			</h2>
			<nav className="space-y-1">
				{items.map((item) => {
					const isActive = selectedKey === item.key;
					return (
						<Link
							key={item.key}
							href={`/?section=${item.key}`}
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
