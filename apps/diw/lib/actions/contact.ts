"use server";

import { and, eq } from "drizzle-orm";
import { db, userSettingsTable } from "@/lib/db";
import { getSession, getUser } from "@/lib/auth/session";

export async function getContactInfo(fairId: string): Promise<{
	contactValidated: boolean;
	address: string;
	phone: string;
} | null> {
	const session = await getSession();
	if (!session) return null;
	if (!session.user.memberId) {
		return { contactValidated: true, address: "", phone: "" };
	}

	const [currentUser, settings] = await Promise.all([
		getUser(),
		db.query.userSettingsTable.findFirst({
			where: and(
				eq(userSettingsTable.memberId, session.user.memberId),
				eq(userSettingsTable.fairId, fairId)
			),
		}),
	]);

	const member =
		currentUser && "member" in currentUser ? currentUser.member : null;

	return {
		contactValidated: settings?.contactValidated ?? false,
		address: member?.address ?? "",
		phone: member?.phone ?? "",
	};
}

export async function confirmContactDetails(
	fairId: string
): Promise<{ success: boolean; error?: string }> {
	const session = await getSession();
	if (!session) return { success: false, error: "You must be logged in." };
	if (!session.user.memberId) return { success: true };

	await db
		.insert(userSettingsTable)
		.values({ memberId: session.user.memberId, fairId, contactValidated: true })
		.onConflictDoUpdate({
			target: userSettingsTable.memberId,
			set: { fairId, contactValidated: true },
		});

	return { success: true };
}
