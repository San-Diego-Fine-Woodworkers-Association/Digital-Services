"use client";

import { startCase } from 'lodash-es';
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from "@sdfwa/ui/components/breadcrumb";

function buildBreadcrumbs(crumbs: { label: string; segment: string }[]) {
	return crumbs.reduce((acc, { label, segment }, index) => {
		const href = crumbs.slice(0, index + 1).map(c => c.segment).join("/");

		return [...acc, { label, href: "/fair-registration/admin/" + href }];
	}, [] as { label: string; href: string }[]);
}

export function AdminLayoutClient({
	children,
	breadcrumbOverrides,
}: {
	children: React.ReactNode;
	breadcrumbOverrides?: Record<string, string>;
}) {
	const pathname = usePathname();
	const segments = pathname
		.replace("/fair-registration/admin", "")
		.split("/")
		.filter(Boolean)
		.map(segment => ({ segment, label: breadcrumbOverrides?.[segment] ?? startCase(segment) }));

	const isRoot = segments.length === 0;
	const crumbs = buildBreadcrumbs(segments);

	return (
		<div className="flex flex-1 flex-col min-w-0">
			{!isRoot && segments.length > 0 && (
				<div className="border-b px-4 py-3">
					<Breadcrumb className="max-w-[1200px] mx-auto w-full">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/fair-registration/admin">Dashboard</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							{crumbs.map((crumb, i) => {
								const isLast = i === crumbs.length - 1;
								return (
									<span key={crumb.href} className="contents">
										<BreadcrumbSeparator />
										<BreadcrumbItem>
											{isLast ? (
												<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
											) : (
												<BreadcrumbLink asChild>
													<Link href={crumb.href}>{crumb.label}</Link>
												</BreadcrumbLink>
											)}
										</BreadcrumbItem>
									</span>
								);
							})}
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			)}
			<div className="flex flex-1 flex-col p-4 min-w-0">
				<div className="mx-auto w-full max-w-[1200px] min-w-0">{children}</div>
			</div>
		</div>
	);
}
