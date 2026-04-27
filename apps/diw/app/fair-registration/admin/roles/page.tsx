import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@sdfwa/ui/components/skeleton";
import { getActiveFair, getRolesWithSlots } from "@/lib/actions/fair";
import { AdminLayoutClient } from "../admin-layout-client";
import { RolesListClient } from "./roles-list-client";

async function RolesContent() {
	await connection();

	const fair = await getActiveFair();

	if (!fair) {
		return (
			<div>
				<h1 className="text-2xl font-bold mb-4">Roles</h1>
				<p className="text-muted-foreground">
					No fair configured. Create a fair first in Fair Settings.
				</p>
			</div>
		);
	}

	const roles = await getRolesWithSlots(fair.id);

	return <RolesListClient fairId={fair.id} roles={roles} />;
}

function RolesFallback() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-9 w-48" />
			<Skeleton className="h-64 w-full" />
		</div>
	);
}

export default function RolesPage() {
	return (
		<AdminLayoutClient>
			<Suspense fallback={<RolesFallback />}>
				<RolesContent />
			</Suspense>
		</AdminLayoutClient>
	);
}
