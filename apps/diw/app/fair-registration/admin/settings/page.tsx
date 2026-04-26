import { Suspense } from "react";
import { Metadata } from "next";
import { connection } from "next/server";
import { Skeleton } from "@sdfwa/ui/components/skeleton";
import { getActiveFair } from "@/lib/actions/fair";
import { FairSettingsClient } from "./fair-settings-client";

export const metadata: Metadata = {
  title: 'Fair Settings'
}

async function FairSettingsContent() {
	await connection();
	const fair = await getActiveFair();
	return <FairSettingsClient fair={fair || null} />;
}

function FairSettingsFallback() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-9 w-48" />
			<Skeleton className="h-64 w-full" />
		</div>
	);
}

export default function FairSettingsPage() {
	return (
		<Suspense fallback={<FairSettingsFallback />}>
			<FairSettingsContent />
		</Suspense>
	);
}
