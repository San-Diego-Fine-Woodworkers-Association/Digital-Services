"use server";

import { and, eq } from "drizzle-orm";
import { db, userSettingsTable } from "@/lib/db";
import { user as userTable } from "@/lib/db/auth-schema";
import { getServerSession } from "@/lib/auth/get-session";
import { isValidPhone } from "@/lib/utils/members";

export async function getContactInfo(fairId: string): Promise<{
	contactValidated: boolean;
	address: string;
	phone: string;
} | null> {
	const session = await getServerSession();
	if (!session?.user) return null;

	const [currentUser, settings] = await Promise.all([
		db.query.user.findFirst({
			where: eq(userTable.id, session.user.id),
			columns: { address: true, phone: true },
		}),
		session.user.memberId
			? db.query.userSettingsTable.findFirst({
					where: and(
						eq(userSettingsTable.memberId, session.user.memberId),
						eq(userSettingsTable.fairId, fairId)
					),
				})
			: null,
	]);

	return {
		contactValidated: session.user.memberId
			? (settings?.contactValidated ?? false)
			: true,
		address: currentUser?.address ?? "",
		phone: currentUser?.phone ?? "",
	};
}

export async function confirmContactDetails(
	fairId: string,
	address: string,
	phone: string
): Promise<{ success: boolean; error?: string }> {
	const session = await getServerSession();
	if (!session?.user) return { success: false, error: "You must be logged in." };
	if (!session.user.memberId) return { success: true };

	const trimmedAddress = address.trim();
	const trimmedPhone = phone.trim();

	if (!trimmedAddress) return { success: false, error: "Address is required." };
	if (!isValidPhone(trimmedPhone)) return { success: false, error: "Please enter a valid phone number." };

	await db.transaction(async (tx) => {
		await tx
			.update(userTable)
			.set({ address: trimmedAddress, phone: trimmedPhone })
			.where(eq(userTable.id, session.user.id));

		await tx
			.insert(userSettingsTable)
			.values({ memberId: session.user.memberId!, fairId, contactValidated: true })
			.onConflictDoUpdate({
				target: userSettingsTable.memberId,
				set: { fairId, contactValidated: true },
			});
	});

	return { success: true };
}
