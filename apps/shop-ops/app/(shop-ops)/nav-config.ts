export type ShopOpsNavItem = {
	href: string;
	label: string;
};

export const SHOP_OPS_NAV: ShopOpsNavItem[] = [
	{ href: "/reporters", label: "Reporters" },
	{ href: "/tool", label: "Tool" },
	{ href: "/maintainer", label: "Maintainer" },
	{ href: "/tool-maintainer", label: "Tool Maintainer" },
	{ href: "/statuses", label: "Statuses" },
	{ href: "/log-entry", label: "Log Entry" },
];
