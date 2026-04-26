import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@sdfwa/ui/components/skeleton";
import { getActiveFair } from "@/lib/actions/fair";
import { getAllRegistrations } from "@/lib/queries/admin";
import { ScheduleClient } from "./schedule-client";

async function ScheduleContent() {
	await connection();

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

function ScheduleFallback() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-9 w-48" />
			<Skeleton className="h-64 w-full" />
		</div>
	);
}

export default function SchedulePage() {
	return (
		<Suspense fallback={<ScheduleFallback />}>
			<ScheduleContent />
		</Suspense>
	);
}
