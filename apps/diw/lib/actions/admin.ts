"use server";

import { eq, and, notInArray, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db, fairDetailsTable, rolesTable, slotsTable, registrationsTable } from "../db";
import { requireAdmin } from "../auth/get-session";

// Fair actions

export async function createFair(data: { name: string; startDate: string; endDate: string; closedDates?: string[] }) {
	await requireAdmin();
	await db.insert(fairDetailsTable).values({ ...data, closedDates: data.closedDates ?? [] });
	updateTag("fair");
}

export async function updateFair(
	fairId: string,
	data: { name?: string; startDate?: string; endDate?: string; closedDates?: string[] }
) {
	await requireAdmin();

	// If dates are changing, figure out which dates are being removed
	if (data.startDate !== undefined || data.endDate !== undefined || data.closedDates !== undefined) {
		const fair = await db.query.fairDetailsTable.findFirst({
			where: eq(fairDetailsTable.id, fairId),
		});

		if (fair) {
			// Compute the new set of open dates
			const newStart = data.startDate ?? fair.startDate;
			const newEnd = data.endDate ?? fair.endDate;
			const newClosed = new Set(data.closedDates ?? fair.closedDates);

			const newOpenDates = new Set<string>();
			const current = new Date(newStart + "T12:00:00");
			const end = new Date(newEnd + "T12:00:00");
			while (current <= end) {
				const dateStr = current.toISOString().split("T")[0]!;
				if (!newClosed.has(dateStr)) {
					newOpenDates.add(dateStr);
				}
				current.setDate(current.getDate() + 1);
			}

			// Find all roles for this fair, then delete slots+registrations on removed dates
			const roles = await db.query.rolesTable.findMany({
				where: eq(rolesTable.fairId, fairId),
			});

			if (roles.length > 0) {
				const roleIds = roles.map((r) => r.id);
				// Get all slots for these roles that are NOT on an open date
				const slotsToRemove = await db.query.slotsTable.findMany({
					where: and(
						inArray(slotsTable.roleId, roleIds),
						notInArray(slotsTable.date, Array.from(newOpenDates))
					),
				});

				if (slotsToRemove.length > 0) {
					const slotIds = slotsToRemove.map((s) => s.id);
					await db.delete(registrationsTable).where(inArray(registrationsTable.slotId, slotIds));
					await db.delete(slotsTable).where(inArray(slotsTable.id, slotIds));
				}
			}
		}
	}

	await db.update(fairDetailsTable).set(data).where(eq(fairDetailsTable.id, fairId));
	updateTag("fair");
	updateTag("roles");
	updateTag("registrations");
}

// Role actions

export async function createRoleForFair(fairId: string, data: { name: string; numberOfVolunteers: number }) {
	await requireAdmin();
	const result = await db.insert(rolesTable).values({ ...data, fairId }).returning({ id: rolesTable.id });
	updateTag("roles");
	return result[0];
}

export async function updateRole(roleId: string, data: { name?: string; numberOfVolunteers?: number }) {
	await requireAdmin();
	await db.update(rolesTable).set(data).where(eq(rolesTable.id, roleId));
	updateTag("roles");
}

export async function deleteRole(roleId: string) {
	await requireAdmin();
	// Delete all slots (and their registrations) for this role first
	const slots = await db.query.slotsTable.findMany({
		where: eq(slotsTable.roleId, roleId),
	});
	for (const slot of slots) {
		await db.delete(registrationsTable).where(eq(registrationsTable.slotId, slot.id));
	}
	await db.delete(slotsTable).where(eq(slotsTable.roleId, roleId));
	await db.delete(rolesTable).where(eq(rolesTable.id, roleId));
	updateTag("roles");
	updateTag("registrations");
}

// Slot actions

export async function generateSlots(
	roleId: string,
	data: {
		dates: string[];
		timeRanges: { startTime: string; endTime: string }[];
		numberOfVolunteers: number;
	}
) {
	await requireAdmin();

	const slots: { roleId: string; date: string; startTime: Date; endTime: Date; numberOfVolunteers: number }[] = [];

	for (const date of data.dates) {
		for (const range of data.timeRanges) {
			slots.push({
				roleId,
				date,
				startTime: new Date(`${date}T${range.startTime}`),
				endTime: new Date(`${date}T${range.endTime}`),
				numberOfVolunteers: data.numberOfVolunteers,
			});
		}
	}

	if (slots.length > 0) {
		await db.insert(slotsTable).values(slots);
	}

	updateTag("roles");
	return { count: slots.length };
}

export async function addSlot(
	roleId: string,
	data: { date: string; startTime: string; endTime: string; numberOfVolunteers: number }
) {
	await requireAdmin();
	await db.insert(slotsTable).values({
		roleId,
		date: data.date,
		startTime: new Date(`${data.date}T${data.startTime}`),
		endTime: new Date(`${data.date}T${data.endTime}`),
		numberOfVolunteers: data.numberOfVolunteers,
	});
	updateTag("roles");
}

export async function deleteSlot(slotId: string) {
	await requireAdmin();
	await db.delete(registrationsTable).where(eq(registrationsTable.slotId, slotId));
	await db.delete(slotsTable).where(eq(slotsTable.id, slotId));
	updateTag("roles");
	updateTag("registrations");
}

// Registration actions (admin)

export async function adminDeleteRegistration(registrationId: string) {
	await requireAdmin();
	await db.delete(registrationsTable).where(eq(registrationsTable.id, registrationId));
	updateTag("registrations");
}
