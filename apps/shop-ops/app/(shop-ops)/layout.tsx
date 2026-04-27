import { LeftNav } from "@/app/components/left-nav";

import { SHOP_OPS_NAV } from "./nav-config";

export default function ShopOpsLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="mx-auto flex max-w-6xl gap-8 p-8">
			<LeftNav items={SHOP_OPS_NAV} />
			<section className="min-w-0 flex-1">
				<h1 className="text-2xl font-semibold tracking-tight">Shop Ops</h1>
				{children}
			</section>
		</main>
	);
}
