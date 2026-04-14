"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db, registrationsTable, slotsTable, userSettingsTable } from "../db";
import { getServerSession } from "../auth/get-session";

async function getUserRegistrations(userId: string) {
	return await db.query.registrationsTable.findMany({
		where: eq(registrationsTable.userId, userId),
		with: {
			slot: {
				with: {
					role: true,
				},
			},
		},
	});
}

export async function registerForSlot(slotId: string): Promise<{ success: boolean; requiresContactValidation?: true; error?: string }> {
	const session = await getServerSession();
	if (!session?.user) {
		return { success: false, error: "You must be logged in to register." };
	}

	const userId = session.user.id;

	// Server-side contact validation gate
	if (session.user.memberId) {
		const slotPreview = await db.query.slotsTable.findFirst({
			where: eq(slotsTable.id, slotId),
			columns: { id: true },
			with: { role: { columns: { fairId: true } } },
		});
		const fairId = slotPreview?.role?.fairId;

		if (fairId) {
			const settings = await db.query.userSettingsTable.findFirst({
				where: and(
					eq(userSettingsTable.memberId, session.user.memberId),
					eq(userSettingsTable.fairId, fairId)
				),
			});
			if (!settings?.contactValidated) {
				return { success: false, requiresContactValidation: true as const, error: "Contact details must be confirmed before registering." };
			}
		}
	}

	const result = await db.transaction(async (tx) => {
		// Get the target slot with current registrations
		const slot = await tx.query.slotsTable.findFirst({
			where: eq(slotsTable.id, slotId),
			with: { registrations: true },
		});

		if (!slot) {
			return { success: false, error: "Slot not found." };
		}

		// Check capacity
		if (slot.registrations.length >= slot.numberOfVolunteers) {
			return { success: false, error: "This slot is full." };
		}

		// Check if already registered for this slot
		const existingRegistration = slot.registrations.find(
			(r) => r.userId === userId
		);
		if (existingRegistration) {
			return { success: false, error: "You are already registered for this slot." };
		}

		// Check for overlapping registrations on the same date
		const userRegistrations = await tx.query.registrationsTable.findMany({
			where: eq(registrationsTable.userId, userId),
			with: { slot: { with: { role: true } } },
		});

		const overlapping = userRegistrations.find((reg) => {
			const existing = reg.slot;
			if (existing.date !== slot.date) return false;
			// Overlap: existing.start < new.end AND existing.end > new.start
			return existing.startTime < slot.endTime && existing.endTime > slot.startTime;
		});

		if (overlapping) {
			const roleName = overlapping.slot.role?.name || "another role";
			return {
				success: false,
				error: `Conflicts with your registration for "${roleName}" (${new Date(overlapping.slot.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${new Date(overlapping.slot.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}).`,
			};
		}

		// Register
		await tx.insert(registrationsTable).values({
			slotId,
			userId,
		});

		return { success: true };
	});

	if (result.success) {
		updateTag("roles");
		updateTag("registrations");
	}

	return result;
}

export async function cancelRegistration(registrationId: string): Promise<{ success: boolean; error?: string }> {
	const session = await getServerSession();
	if (!session?.user) {
		return { success: false, error: "You must be logged in." };
	}

	const registration = await db.query.registrationsTable.findFirst({
		where: eq(registrationsTable.id, registrationId),
	});

	if (!registration) {
		return { success: false, error: "Registration not found." };
	}

	if (registration.userId !== session.user.id) {
		return { success: false, error: "You can only cancel your own registrations." };
	}

	await db.delete(registrationsTable).where(eq(registrationsTable.id, registrationId));

	updateTag("registrations");
	updateTag("roles");
	return { success: true };
}

export async function getMyRegistrations() {
	const session = await getServerSession();
	if (!session?.user) {
		return [];
	}

	return await getUserRegistrations(session.user.id);
}
