export const dynamic = "force-dynamic";

import { getActiveFair } from "@/lib/actions/fair";
import { getAllRegistrations } from "@/lib/actions/admin";
import { RegistrationsClient } from "./registrations-client";

export default async function RegistrationsPage() {
	const fair = await getActiveFair();

	if (!fair) {
		return (
			<div>
				<h1 className="text-2xl font-bold mb-4">Registrations</h1>
				<p className="text-muted-foreground">No fair configured.</p>
			</div>
		);
	}

	const registrations = await getAllRegistrations(fair.id);

	return <RegistrationsClient registrations={registrations} />;
}
