export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRoleById } from "@/lib/actions/fair-registration";
import { getActiveFair } from "@/lib/actions/fair";
import { RoleDetailClient } from "./role-detail-client";

export default async function RoleDetailPage({
	params,
}: {
	params: Promise<{ roleId: string }>;
}) {
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
