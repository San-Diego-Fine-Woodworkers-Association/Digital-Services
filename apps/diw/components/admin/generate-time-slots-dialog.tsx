import { addTimeSlot } from "@/lib/actions/admin";
import { Button } from "@sdfwa/ui/components/button";
import { DatePickerInput } from "@sdfwa/ui/components/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@sdfwa/ui/components/dialog";
import { Field, FieldLabel } from "@sdfwa/ui/components/field";
import { Input } from "@sdfwa/ui/components/input";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function GenerateTimeSlotsDialog({
	shiftId,
	children,
}: Readonly<{ shiftId: string, children: React.ReactNode }>) {
	const [isPending, startTransition] = useTransition()
	const [open, setOpen] = useState(false);

	const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		startTransition(async () => {
			const formData = new FormData(e.currentTarget);
			const result = await addTimeSlot(formData);
			if (result.success) {
				toast.success("Time slot created successfully!");
				setOpen(false);
			} else {
				const errorMessage = Array.isArray(result.errors)
					? result.errors.map(err => typeof err === 'string' ? err : JSON.stringify(err)).join(", ")
					: result.errors;
				toast.error(errorMessage);
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Multiple Time Slots</DialogTitle>
          <DialogDescription>
            Enter the details for the time slots you want to generate. You can create multiple time slots at once by specifying a date range and time ranges.
          </DialogDescription>
        </DialogHeader>

        <form className="grid w-full gap-4 py-4" onSubmit={onSubmit}>
					<Field><Input id="shiftId" value={shiftId} hidden /></Field>

					<Field>
            <FieldLabel htmlFor="date">Slot Date</FieldLabel>
            <DatePickerInput id="date" />
          </Field>

					<Field>
						<FieldLabel htmlFor="numberOfVolunteers">Number of Volunteers</FieldLabel>
						<Input id="numberOfVolunteers" type="number" min={1} />
					</Field>

					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="start-time">Start Time</FieldLabel>
							<Input id="startTime" type="time" />
						</Field>

						<Field>
							<FieldLabel htmlFor="end-time">End Time</FieldLabel>
							<Input id="endTime" type="time" />
						</Field>
					</div>

					<Button type="submit" className="ml-auto" disabled={isPending}>
						{isPending ? "Creating…" : "Create Time Slot"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	)
}