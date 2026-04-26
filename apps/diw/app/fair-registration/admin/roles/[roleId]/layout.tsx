import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getRoleById } from "@/lib/queries/admin";
import { AdminLayoutClient } from "../../admin-layout-client";

async function RoleBreadcrumbShell({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ roleId: string }>;
}) {
	await connection();

	const { roleId } = await params;
	const role = await getRoleById(roleId);

	if (!role) {
		notFound();
	}

	return (
		<AdminLayoutClient breadcrumbOverrides={{ [roleId]: role.name }}>
			{children}
		</AdminLayoutClient>
	);
}

export default function RoleDetailLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ roleId: string }>;
}) {
	return (
		<Suspense fallback={<AdminLayoutClient>{children}</AdminLayoutClient>}>
			<RoleBreadcrumbShell params={params}>{children}</RoleBreadcrumbShell>
		</Suspense>
	);
}
