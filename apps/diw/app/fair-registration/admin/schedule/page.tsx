import { getActiveFair } from "@/lib/actions/fair";
import { getAllRegistrations } from "@/lib/queries/admin";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage() {
	const fair = await getActiveFair();

	if (!fair) {
		return (
			<div>
				<h1 className="text-2xl font-bold mb-4">Schedule</h1>
				<p className="text-muted-foreground">No fair configured.</p>
			</div>
		);
	}

	const registrations = await getAllRegistrations(fair.id);

	return <ScheduleClient fairName={fair.name} registrations={registrations} />;
}
