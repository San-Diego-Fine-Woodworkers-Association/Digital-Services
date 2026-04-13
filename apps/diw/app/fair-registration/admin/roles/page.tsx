import { getActiveFair, getRolesWithSlots } from "@/lib/actions/fair";
import { AdminLayoutClient } from "../admin-layout-client";
import { RolesListClient } from "./roles-list-client";

export default async function RolesPage() {
	const fair = await getActiveFair();

	if (!fair) {
		return (
			<AdminLayoutClient>
				<div>
					<h1 className="text-2xl font-bold mb-4">Roles</h1>
					<p className="text-muted-foreground">
						No fair configured. Create a fair first in Fair Settings.
					</p>
				</div>
			</AdminLayoutClient>
		);
	}

	const roles = await getRolesWithSlots(fair.id);

	return (
		<AdminLayoutClient>
			<RolesListClient fairId={fair.id} roles={roles} />
		</AdminLayoutClient>
	);
}
