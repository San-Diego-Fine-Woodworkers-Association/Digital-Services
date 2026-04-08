"use server";

import get from "lodash-es/get";
import { revalidatePath } from "next/cache";
import { db, rolesTable, slotsTable } from "../db";
import { Role, Slot } from "../types/fair-registration";

export async function getRoles() {
	return await db.query.rolesTable.findMany({
		with: {
			slots: true
		}
	});
}

export async function getRoleById(roleId: string) {
	return await db.query.rolesTable.findFirst({
		where: (role, { eq }) => eq(role.id, roleId),
		with: {
			slots: true
		}
	});
}

export async function createRole({ role, slots }: { role: Omit<Role, "id" | "slots">, slots: Omit<Slot, "id" | "roleId">[] }) {
	await db.transaction(async (tx) => {
		const createdRole: { id: string }[] = await tx.insert(rolesTable).values({
			...role,
		}).returning({ id: rolesTable.id });
		const roleId = get(createdRole, [0, "id"]);

		if (slots.length > 0) {
			await tx.insert(slotsTable).values(
				slots.map((slot) => ({
					...slot,
					roleId,
					startTime: new Date(slot.startTime),
					endTime: new Date(slot.endTime)
				}))
			);
		}
	});

	revalidatePath("/fair-registration");
}
