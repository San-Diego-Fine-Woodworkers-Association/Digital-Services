"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@sdfwa/ui/components/field";
import { Input } from "@sdfwa/ui/components/input";
import { toast } from "@sdfwa/ui/components/sonner";
import { generateSlots } from "@/lib/actions/admin";

interface TimeRange {
	startTime: string;
	endTime: string;
}

function getDatesInRange(startDate: string, endDate: string): string[] {
	const dates: string[] = [];
	const current = new Date(startDate + "T12:00:00");
	const end = new Date(endDate + "T12:00:00");
	while (current <= end) {
		dates.push(current.toISOString().split("T")[0]!);
		current.setDate(current.getDate() + 1);
	}
	return dates;
}

function formatTimeDisplay(time: string) {
	const [h, m] = time.split(":");
	const d = new Date();
	d.setHours(Number(h), Number(m));
	return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function SlotGenerator({
	roleId,
	defaultVolunteers,
	fairStartDate = "",
	fairEndDate = "",
	closedDates = [],
	onComplete,
}: {
	roleId: string;
	defaultVolunteers: number;
	fairStartDate?: string;
	fairEndDate?: string;
	closedDates?: string[];
	onComplete?: () => void;
}) {
	const closedSet = new Set(closedDates);
	const router = useRouter();
	const [volunteers, setVolunteers] = useState(defaultVolunteers);
	const [timeRanges, setTimeRanges] = useState<TimeRange[]>([]);
	const [newStart, setNewStart] = useState("");
	const [newEnd, setNewEnd] = useState("");
	const [loading, setLoading] = useState(false);

	function handleAddRange() {
		if (!newStart || !newEnd || newStart >= newEnd) return;
		setTimeRanges((prev) => [
			...prev,
			{ startTime: newStart, endTime: newEnd },
		].sort((a, b) => a.startTime.localeCompare(b.startTime)));
		setNewStart("");
		setNewEnd("");
	}

	function handleRemoveRange(index: number) {
		setTimeRanges((prev) => prev.filter((_, i) => i !== index));
	}

	const openDates = fairStartDate && fairEndDate
		? getDatesInRange(fairStartDate, fairEndDate).filter((d) => !closedSet.has(d))
		: [];
	const dateCount = openDates.length;
	const totalSlots = dateCount * timeRanges.length;
	const canGenerate = fairStartDate && fairEndDate && timeRanges.length > 0 && dateCount > 0;

	async function handleGenerate() {
		if (!fairStartDate || !fairEndDate || timeRanges.length === 0) return;
		setLoading(true);
		const result = await generateSlots(roleId, {
			dates: openDates,
			timeRanges,
			numberOfVolunteers: volunteers,
		});
		setTimeRanges([]);
		setLoading(false);
		toast.success(`Generated ${result.count} slot${result.count !== 1 ? "s" : ""}.`);
		router.refresh();
		onComplete?.();
	}

	return (
		<div>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="genVolunteers">Volunteers per Slot</FieldLabel>
					<Input
						id="genVolunteers"
						type="number"
						min={1}
						value={volunteers}
						onChange={(e) => setVolunteers(Number(e.target.value))}
						required
					/>
				</Field>
			</FieldGroup>

			{/* Time ranges */}
			<div className="mt-4">
				<p className="text-sm font-medium mb-2">Time Slots</p>

				{timeRanges.length > 0 && (
					<div className="border rounded-lg overflow-hidden mb-3">
						<table className="w-full text-sm">
							<tbody>
								{timeRanges.map((range, i) => (
									<tr key={i} className="border-b last:border-b-0">
										<td className="px-3 py-2">
											{formatTimeDisplay(range.startTime)} – {formatTimeDisplay(range.endTime)}
										</td>
										<td className="px-3 py-2 text-right w-10">
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												onClick={() => handleRemoveRange(i)}
											>
												<Trash2 className="size-3.5" />
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<div className="flex items-end gap-2">
					<Field className="flex-1">
						<FieldLabel htmlFor="newStart">Start</FieldLabel>
						<Input
							id="newStart"
							type="time"
							value={newStart}
							onChange={(e) => setNewStart(e.target.value)}
						/>
					</Field>
					<Field className="flex-1">
						<FieldLabel htmlFor="newEnd">End</FieldLabel>
						<Input
							id="newEnd"
							type="time"
							value={newEnd}
							onChange={(e) => setNewEnd(e.target.value)}
						/>
					</Field>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleAddRange}
						disabled={!newStart || !newEnd || newStart >= newEnd}
						className="shrink-0"
					>
						<Plus className="size-3.5" />
						Add
					</Button>
				</div>
			</div>

			{/* Summary + Generate */}
			{canGenerate && (
				<div className="mt-4 flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						{timeRanges.length} slot{timeRanges.length !== 1 ? "s" : ""} &times; {dateCount} day{dateCount !== 1 ? "s" : ""} = {totalSlots} total
					</p>
					<Button
						type="button"
						onClick={handleGenerate}
						disabled={loading}
					>
						{loading ? "Generating..." : `Generate ${totalSlots} Slot${totalSlots !== 1 ? "s" : ""}`}
					</Button>
				</div>
			)}
		</div>
	);
}
