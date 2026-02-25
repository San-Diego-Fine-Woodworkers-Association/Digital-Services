"use server";

import get from "lodash-es/get";
import { db, shiftsTable, timeSlotsTable } from "../db";
import { Shift, TimeSlot } from "../types/fair-registration";
import { refresh } from "next/cache";

export async function getShifts() {
	return await db.query.shiftsTable.findMany({
		with: {
			timeSlots: true
		}
	});
}

export async function getShiftById(shiftId: string) {
	return await db.query.shiftsTable.findFirst({
		where: (shift, { eq }) => eq(shift.id, shiftId),
		with: {
			timeSlots: true
		}
	});
}

export async function createShift({ shift, timeSlots }: { shift: Omit<Shift, "id">, timeSlots: Omit<TimeSlot, "id" | "shiftId">[] }) {
	await db.transaction(async (tx) => {
		const createdShift: { id: string }[] = await tx.insert(shiftsTable).values({
			...shift,
			startTime: shift.startTime.toISOString(),
			endTime: shift.endTime.toISOString()
		}).returning({ id: shiftsTable.id });
		const shiftId = get(createdShift, [0, "id"]);

		await tx.insert(timeSlotsTable).values(
			timeSlots.map((timeSlot) => ({
				...timeSlot,
				shiftId,
				date: timeSlot.date.toISOString(),
				startTime: timeSlot.startTime.toISOString(),
				endTime: timeSlot.endTime.toISOString()
			}))
		);
	});

	refresh();
}