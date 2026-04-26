import { getActiveFair, getRolesWithSlots } from "@/lib/actions/fair";
import { getMyRegistrations } from "@/lib/actions/registration";
import { getContactInfo } from "@/lib/actions/contact";
import { getServerSession } from "@/lib/auth/get-session";
import { FairRegistrationClient } from "./fair-registration-client";

export default async function Page() {
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
	const [userRegistrations, contactInfo] = await Promise.all([
		session?.user ? getMyRegistrations() : Promise.resolve([]),
		session?.user ? getContactInfo(fair.id) : Promise.resolve(null),
	]);

	return (
		<FairRegistrationClient
			roles={roles}
			isLoggedIn={!!session?.user}
			userId={session?.user?.id ?? null}
			userRegistrations={userRegistrations}
			fairStartDate={fair.startDate}
			fairEndDate={fair.endDate}
			fairClosedDates={fair.closedDates}
			fairId={fair.id}
			contactValidated={contactInfo?.contactValidated ?? true}
			initialAddress={contactInfo?.address ?? ""}
			initialPhone={contactInfo?.phone ?? ""}
		/>
	);
}
