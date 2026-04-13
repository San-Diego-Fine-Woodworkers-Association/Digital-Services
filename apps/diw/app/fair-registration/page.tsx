export const dynamic = "force-dynamic";

import { getActiveFair, getRolesWithSlots } from "@/lib/actions/fair";
import { getMyRegistrations } from "@/lib/actions/registration";
import { getServerSession } from "@/lib/auth/get-session";
import { FairRegistrationClient } from "./fair-registration-client";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ slot?: string }>;
}) {
	const { slot: initialSlotId } = await searchParams;
	const fair = await getActiveFair();

	if (!fair) {
		return (
			<div className="flex flex-1 items-center justify-center p-4">
				<p className="text-muted-foreground">
					No fair is currently active. Check back later.
				</p>
			</div>
		);
	}

	const session = await getServerSession();
	const roles = await getRolesWithSlots(fair.id);
	const userRegistrations = session?.user
		? await getMyRegistrations()
		: [];

	return (
		<FairRegistrationClient
			roles={roles}
			isLoggedIn={!!session?.user}
			userId={session?.user?.id ?? null}
			userRegistrations={userRegistrations}
			fairStartDate={fair.startDate}
			fairEndDate={fair.endDate}
			fairClosedDates={fair.closedDates}
			initialSlotId={initialSlotId}
		/>
	);
}
