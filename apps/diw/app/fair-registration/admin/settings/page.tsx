export const dynamic = "force-dynamic";

import { getActiveFair } from "@/lib/actions/fair";
import { FairSettingsClient } from "./fair-settings-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Fair Settings'
}

export default async function FairSettingsPage() {
	const fair = await getActiveFair();
	return <FairSettingsClient fair={fair || null} />;
}
