import { use } from "react";
import { eq } from "drizzle-orm";

import { Shift } from "@/lib/types/fair-registration";
import { ShiftCard } from "./shift-card";
import { map } from "lodash-es";

export interface ShiftsListProps {
	shiftsPromise: Promise<Shift[]>;
}

export function ShiftsList() {
	const shifts = use(import("@/lib/db").then(({ db }) => {
		return db.query.shiftsTable.findMany({
			with: {
				timeSlots: true
			}
		});
	}));

	return (
		<div className="grid auto-rows-min gap-4 md:grid-cols-5">
			{shifts.map((shift) => (
				<ShiftCard key={shift.id} shift={shift} />
			))}
		</div>
	);
}