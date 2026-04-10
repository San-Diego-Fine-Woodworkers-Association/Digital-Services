import { CreateShiftDialog } from "@/components/admin/create-shift-dialog";
import { AdminPage } from "@/components/admin/page";
import { db, shiftsTable } from "@/lib/db";
import { Button } from "@sdfwa/ui/components/button";
import { CalendarCog } from "lucide-react";

export default async function Page() {
	const shifts = await db.select().from(shiftsTable);

	return (
		<AdminPage title="Shifts and Slots">
			{shifts.length === 0 ? (
				<div className="flex h-full flex-col items-center justify-center gap-2">
					<h2 className="text-2xl font-semibold">No Shifts</h2>
					<p className="text-sm text-muted-foreground">Create a shift to get started.</p>
					
					<CreateShiftDialog>
						<Button size="lg" className="mt-2">
							<CalendarCog className="mr-2" />
							Create Shift
						</Button>
					</CreateShiftDialog>
				</div>
			) : (
				<div className="grid auto-rows-min gap-4 md:grid-cols-5">
					{shifts.map((shift) => (
						<div key={shift.id} className="bg-muted/50 aspect-square rounded-xl" />
					))}
				</div>
			)}
		</AdminPage>
	)
}