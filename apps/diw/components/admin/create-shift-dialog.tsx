"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sdfwa/ui/components/dialog";
import { Field, FieldLabel, } from "@sdfwa/ui/components/field";
import { Input } from "@sdfwa/ui/components/input";
import { Button } from "@sdfwa/ui/components/button";
import { Calendar } from "@sdfwa/ui/components/calendar";

import { CreateShiftData, createShift } from "@/lib/actions/admin";

const makeId = () =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2);

export function CreateShiftDialog({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [timeSlots, setTimeSlots] = useState<(CreateShiftData["timeSlots"][number] & { id: string })[]>([]);

	const getDefaultDates = () => {
		const today = new Date();
		return { from: today, to: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) };
	}

  // state used by generator
  const [selectedDates, setSelectedDates] = useState<{ from: Date | undefined; to?: Date | undefined }>(getDefaultDates());
  const [ranges, setRanges] = useState<
    Array<{ id: string; start: string; end: string }>
  >([{ id: makeId(), start: "", end: "" }]);

  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setName("");
    setTimeSlots([]);
    setSelectedDates({ from: undefined, to: undefined });
    setRanges([{ id: makeId(), start: "", end: "" }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createShift({ name, timeSlots });
      if (result.success) {
        resetForm();
        setOpen(false);
      } else {
        console.error(result.errors);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
          <DialogDescription>
            Enter the details for the new shift.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="grid w-full items-center gap-4 py-4"
        >
          <Field>
            <FieldLabel htmlFor="shift-name">Shift Name</FieldLabel>
            <Input
              id="shift-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <TimeSlotGenerator
            dateRange={selectedDates}
            onDatesChange={setSelectedDates}
            ranges={ranges}
            onRangesChange={setRanges}
            timeSlots={timeSlots}
            setTimeSlots={setTimeSlots}
          />

          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create"}
            </Button>
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TimeSlotGeneratorProps {
  dateRange: { from: Date | undefined; to?: Date | undefined };
  onDatesChange: ({ from, to }: { from: Date | undefined; to?: Date | undefined }) => void;
  ranges: Array<{ id: string; start: string; end: string }>;
  onRangesChange: React.Dispatch<
    React.SetStateAction<Array<{ id: string; start: string; end: string }>>
  >;
  timeSlots: (CreateShiftData["timeSlots"][number] & { id: string })[];
  setTimeSlots: React.Dispatch<
    React.SetStateAction<(CreateShiftData["timeSlots"][number] & { id: string })[]>
  >;
}

function TimeSlotGenerator({
  dateRange,
  onDatesChange,
  ranges,
  onRangesChange,
  timeSlots,
  setTimeSlots,
}: TimeSlotGeneratorProps) {
  const addRange = () =>
    onRangesChange((r) => [
      ...r,
      { id: makeId(), start: "", end: "" },
    ]);

  const updateRange = (
    id: string,
    field: "start" | "end",
    value: string,
  ) => {
    onRangesChange((r) =>
      r.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    );
  };

  const removeRange = (id: string) => {
    onRangesChange((r) => r.filter((x) => x.id !== id));
  };

  const generate = () => {
    if (!dateRange.from || !dateRange.to || ranges.length === 0) return;
    const slots: (CreateShiftData["timeSlots"][number] & { id: string })[] = [];
		const selectedDates: Date[] = [];
		
		for (let d = new Date(dateRange.from); d <= dateRange.to; d.setDate(d.getDate() + 1)) {
			selectedDates.push(new Date(d));
		}
    
		selectedDates.forEach((date) => {
      const iso = date.toISOString().split("T")[0]!;
      ranges.forEach((r) => {
        if (r.start && r.end) {
          slots.push({
						id: makeId(),
            date: iso,
            startTime: r.start,
            endTime: r.end,
            numberOfVolunteers: 1,
          });
        }
      });
    });
    setTimeSlots(slots);
  };

  const grouped = timeSlots.reduce<
    Record<string, (CreateShiftData["timeSlots"][number] & { id: string })[]>
  >((acc, slot) => {
    (acc[slot.date] ??= []).push(slot);
    return acc;
  }, {});

  const removeDate = (date: string) => {
    setTimeSlots((ts) => ts.filter((t) => t.date !== date));
  };

  const updateSlot = (
    id: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setTimeSlots((ts) => {
      const copy = [...ts];
      const slotIndex = copy.findIndex((t) => t.id === id);
			if (slotIndex !== -1) {
				copy[slotIndex] = { ...copy[slotIndex], [field]: value } as typeof copy[number];
			}
      return copy;
    });
  };

  return (
    <div className="w-full">
			{Object.keys(grouped).length > 0 ? (
				<div className="max-h-48 overflow-auto mt-4 border rounded p-2">
          {Object.entries(grouped).map(([date, slots]) => (
            <div key={date} className="mb-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{date}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => removeDate(date)}
                >
                  ×
                </Button>
              </div>
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      updateSlot(slot.id, "startTime", e.target.value)
                    }
                  />
                  <span>to</span>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      updateSlot(slot.id, "endTime", e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
			) : (
				<div>
						<Field>
						<FieldLabel>Pick dates</FieldLabel>
						<Calendar
							mode="range"
							selected={dateRange}
							onSelect={onDatesChange}
							required={true}
							captionLayout="dropdown"
							className="bg-transparent [--cell-size:2.1rem]"
						/>
					</Field>

					<div className="mt-4 space-y-2">
						<h3 className="text-sm font-medium">Time ranges</h3>
						{ranges.map((r) => (
							<div key={r.id} className="flex items-center gap-2">
								<Input
									type="time"
									value={r.start}
									onChange={(e) => updateRange(r.id, "start", e.target.value)}
									required
								/>
								<span>to</span>
								<Input
									type="time"
									value={r.end}
									onChange={(e) => updateRange(r.id, "end", e.target.value)}
									required
								/>
								{ranges.length > 1 && (
									<Button
										variant="ghost"
										size="icon"
										type="button"
										onClick={() => removeRange(r.id)}
									>
										×
									</Button>
								)}
							</div>
						))}
						<Button variant="link" size="sm" type="button" onClick={addRange}>
							Add range
						</Button>
						<div>
							<Button type="button" onClick={generate}>
								Generate slots
							</Button>
						</div>
					</div>
				</div>
			)}
    </div>
  );
}
