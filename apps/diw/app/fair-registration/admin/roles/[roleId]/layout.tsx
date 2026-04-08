import { notFound } from "next/navigation";
import { getRoleById } from "@/lib/actions/fair-registration";
import { AdminLayoutClient } from "../../admin-layout-client";

export default async function RoleDetailLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ roleId: string }>;
}) {
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
