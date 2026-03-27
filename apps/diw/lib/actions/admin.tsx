'use server';

import * as z from "zod";
import { db, shiftsTable, timeSlotsTable } from "@/lib/db";
import { cache } from "react";
import { eq } from "drizzle-orm/sql/expressions/conditions";

const createShiftSchema = z.object({
	name: z.string().nonempty(),
	timeSlots: z.array(z.object({
		date: z.iso.date(),
		startTime: z.iso.time({ precision: -1 }),
		endTime: z.iso.time({ precision: -1 }),
		numberOfVolunteers: z.number().int().positive(),
	}))
});

export type CreateShiftData = z.infer<typeof createShiftSchema>;

export async function createShift(shiftsData: CreateShiftData) {
	const validatedData = createShiftSchema.safeParse(shiftsData);
	
	if (!validatedData.success) {
		return { success: false, errors: validatedData.error!.issues };
	}

	const { name, timeSlots } = validatedData.data;

	try {
		await db.transaction(async (tx) => {
			const newShift = await tx.insert(shiftsTable).values({ name }).returning();
			const shiftId = newShift[0]!.id;

			const timeSlotInserts = timeSlots.map(slot => ({
				shiftId,
				date: new Date(slot.date),
				startTime: slot.startTime,
				endTime: slot.endTime,
				numberOfVolunteers: slot.numberOfVolunteers
			}));

			await tx.insert(timeSlotsTable).values(timeSlotInserts);
		});

		return { success: true };
	} catch (error) {
		console.error("Error creating shift: ", error);
		return { success: false, errors: [ "An error occurred while creating the shift.", error ] };
	}
}

export async function deleteShift(shiftId: string) {
	try {
		await db.delete(shiftsTable).where(eq(shiftsTable.id, shiftId));
		return { success: true };
	} catch (error) {
		console.error("Error deleting shift: ", error);
		return { success: false, errors: [ "An error occurred while deleting the shift.", error] };
	}
}

export async function renameShift(shiftId: string, newName: string) {
	try {
		await db.update(shiftsTable).set({ name: newName }).where(eq(shiftsTable.id, shiftId));
		return { success: true };
	} catch (error) {
		console.error("Error renaming shift: ", error);
		return { success: false, errors: [ "An error occurred while renaming the shift.", error] };
	}
}

export const getShifts = cache(async () => {
	const slots = await db.query.shiftsTable.findMany({
		with: {
			timeSlots: true
		}
	});

	return slots;
});

export async function addTimeSlot(timeSlotFormData: FormData) {
	const shiftId = timeSlotFormData.get("shiftId") as string;
	const date = timeSlotFormData.get("date") as string;
	const startTime = timeSlotFormData.get("startTime") as string;
	const endTime = timeSlotFormData.get("endTime") as string;
	const numberOfVolunteers = parseInt(timeSlotFormData.get("numberOfVolunteers") as string, 10);

	if (!shiftId || !date || !startTime || !endTime || isNaN(numberOfVolunteers)) {
		return { success: false, errors: [ "All fields are required and must be valid." ] };
	}

	try {
		await db.insert(timeSlotsTable).values({
			shiftId,
			date: new Date(date),
			startTime,
			endTime,
			numberOfVolunteers
		});
		return { success: true };
	} catch (error) {
		console.error("Error adding time slot: ", error);
		return { success: false, errors: [ "An error occurred while adding the time slot.", error ] };
	}
}

export async function deleteTimeSlot(timeSlotId: string) {
	try {
		await db.delete(timeSlotsTable).where(eq(timeSlotsTable.id, timeSlotId));
		return { success: true };
	} catch (error) {
		console.error("Error deleting time slot: ", error);
		return { success: false, errors: [ "An error occurred while deleting the time slot.", error ] };
	}
}

export async function updateTimeSlot(timeSlotId: string, timeSlotData: Omit<CreateShiftData["timeSlots"][number], "shiftId">) {
	const { date, startTime, endTime, numberOfVolunteers } = timeSlotData;

	try {
		await db.update(timeSlotsTable).set({
			date: new Date(date),
			startTime,
			endTime,
			numberOfVolunteers
		}).where(eq(timeSlotsTable.id, timeSlotId));
		return { success: true };
	} catch (error) {
		console.error("Error updating time slot: ", error);
		return { success: false, errors: [ "An error occurred while updating the time slot.", error ] };
	}
}