import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Skeleton } from "@sdfwa/ui/components/skeleton";
import { getRoleById } from "@/lib/queries/admin";
import { getActiveFair } from "@/lib/actions/fair";
import { RoleDetailClient } from "./role-detail-client";

async function RoleDetailContent({
	params,
}: {
	params: Promise<{ roleId: string }>;
}) {
	await connection();

	const { roleId } = await params;
	const [role, fair] = await Promise.all([getRoleById(roleId), getActiveFair()]);

	if (!role) {
		notFound();
	}

	return (
		<RoleDetailClient
			role={role}
			fairStartDate={fair?.startDate ?? ""}
			fairEndDate={fair?.endDate ?? ""}
			fairClosedDates={fair?.closedDates ?? []}
		/>
	);
}

function RoleDetailFallback() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-9 w-48" />
			<Skeleton className="h-64 w-full" />
		</div>
	);
}

export default function RoleDetailPage({
	params,
}: {
	params: Promise<{ roleId: string }>;
}) {
	return (
		<Suspense fallback={<RoleDetailFallback />}>
			<RoleDetailContent params={params} />
		</Suspense>
	);
}
