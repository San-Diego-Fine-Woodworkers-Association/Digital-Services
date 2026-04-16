import { getActiveFair, getRolesWithSlots } from "@/lib/actions/fair";
import { getAllRegistrations } from "@/lib/queries/admin";
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

	const [registrations, roles] = await Promise.all([
		getAllRegistrations(fair.id),
		getRolesWithSlots(fair.id),
	]);

	return <RegistrationsClient registrations={registrations} roles={roles} />;
}
