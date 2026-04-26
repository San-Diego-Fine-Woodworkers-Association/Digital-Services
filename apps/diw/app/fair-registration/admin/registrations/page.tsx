import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@sdfwa/ui/components/skeleton";
import { getActiveFair, getRolesWithSlots } from "@/lib/actions/fair";
import { getAllRegistrations } from "@/lib/queries/admin";
import { RegistrationsClient } from "./registrations-client";

async function RegistrationsContent() {
	await connection();

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

function RegistrationsFallback() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-9 w-48" />
			<Skeleton className="h-64 w-full" />
		</div>
	);
}

export default function RegistrationsPage() {
	return (
		<Suspense fallback={<RegistrationsFallback />}>
			<RegistrationsContent />
		</Suspense>
	);
}
