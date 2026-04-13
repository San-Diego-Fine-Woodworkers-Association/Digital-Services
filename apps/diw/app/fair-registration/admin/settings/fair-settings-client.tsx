"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@sdfwa/ui/components/button";
import { Card, CardContent } from "@sdfwa/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@sdfwa/ui/components/field";
import { Input } from "@sdfwa/ui/components/input";
import { Calendar } from "@sdfwa/ui/components/calendar";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from "@sdfwa/ui/components/alert-dialog";
import { toast } from "@sdfwa/ui/components/sonner";
import { createFair, updateFair } from "@/lib/actions/admin";

interface Fair {
	id: string;
	name: string;
	startDate: string;
	endDate: string;
	closedDates: string[];
}

function toDateString(date: Date) {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function getDatesInRange(startDate: string, endDate: string): string[] {
	if (!startDate || !endDate) return [];
	const dates: string[] = [];
	const current = new Date(startDate + "T12:00:00");
	const end = new Date(endDate + "T12:00:00");
	while (current <= end) {
		dates.push(current.toISOString().split("T")[0]!);
		current.setDate(current.getDate() + 1);
	}
	return dates;
}

function computeOpenDates(fair: Fair | null): string[] {
	if (!fair) return [];
	const closedSet = new Set(fair.closedDates);
	return getDatesInRange(fair.startDate, fair.endDate).filter(
		(d) => !closedSet.has(d)
	);
}

export function FairSettingsClient({ fair }: { fair: Fair | null }) {
	const router = useRouter();
	const [name, setName] = useState(fair?.name || "");
	const [selectedDates, setSelectedDates] = useState<Date[]>(() =>
		computeOpenDates(fair).map((d) => new Date(d + "T12:00:00"))
	);
	const [loading, setLoading] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [anchorDate, setAnchorDate] = useState<Date | null>(null);
	const shiftRangeHandled = useRef(false);

	const initialName = fair?.name || "";
	const initialOpenDates = useMemo(() => computeOpenDates(fair), [fair]);
	const isDirty = useMemo(() => {
		if (name !== initialName) return true;
		const currentSorted = selectedDates.map(toDateString).sort().join(",");
		const initialSorted = [...initialOpenDates].sort().join(",");
		return currentSorted !== initialSorted;
	}, [name, initialName, selectedDates, initialOpenDates]);

	const sortedDateStrings = useMemo(
		() => selectedDates.map(toDateString).sort(),
		[selectedDates]
	);

	const startDate = sortedDateStrings[0] ?? "";
	const endDate = sortedDateStrings[sortedDateStrings.length - 1] ?? "";

	const closedDates = useMemo(() => {
		if (!startDate || !endDate) return [];
		const selectedSet = new Set(sortedDateStrings);
		return getDatesInRange(startDate, endDate).filter(
			(d) => !selectedSet.has(d)
		);
	}, [startDate, endDate, sortedDateStrings]);

	const defaultMonth = useMemo(() => {
		if (selectedDates.length > 0) {
			return new Date(
				Math.min(...selectedDates.map((d) => d.getTime()))
			);
		}
		return new Date();
	}, [selectedDates]);

	// Dates that were previously open but are no longer selected
	const removedDates = useMemo(() => {
		const currentSet = new Set(sortedDateStrings);
		return initialOpenDates.filter((d) => !currentSet.has(d)).sort();
	}, [sortedDateStrings, initialOpenDates]);

	const datesChanged = removedDates.length > 0;

	function handleDayClick(day: Date, _modifiers: unknown, e: React.MouseEvent) {
		if (e.shiftKey && anchorDate) {
			shiftRangeHandled.current = true;
			const dateStr = toDateString(day);
			const anchor = toDateString(anchorDate);
			const [start, end] = anchor <= dateStr ? [anchor, dateStr] : [dateStr, anchor];
			const range = getDatesInRange(start, end);
			setSelectedDates((prev) => {
				const existing = new Set(prev.map(toDateString));
				const toAdd = range
					.filter((d) => !existing.has(d))
					.map((d) => new Date(d + "T12:00:00"));
				return [...prev, ...toAdd];
			});
		} else {
			setAnchorDate(day);
		}
	}

	function handleCalendarSelect(dates: Date[] | undefined) {
		if (shiftRangeHandled.current) {
			shiftRangeHandled.current = false;
			return;
		}
		setSelectedDates(dates ?? []);
	}

	function handleFormSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (sortedDateStrings.length === 0) return;
		// If editing an existing fair and dates were removed, confirm first
		if (fair && datesChanged) {
			setConfirmOpen(true);
			return;
		}
		doSave();
	}

	async function doSave() {
		setConfirmOpen(false);
		setLoading(true);

		try {
			if (fair) {
				await updateFair(fair.id, {
					name,
					startDate,
					endDate,
					closedDates,
				});
				toast.success("Fair settings updated.");
			} else {
				await createFair({
					name,
					startDate,
					endDate,
					closedDates,
				});
				toast.success("Fair created.");
			}
			router.refresh();
		} catch {
			toast.error("Failed to save fair settings.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Fair Settings</h1>
			<form onSubmit={handleFormSubmit}>
				<div className="flex flex-col gap-6">
					<Card className="max-w-lg">
						<CardContent className="p-6">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="name">Fair Name</FieldLabel>
									<Input
										id="name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="San Diego County Fair 2026"
										required
									/>
								</Field>
							</FieldGroup>
						</CardContent>
					</Card>

					<div>
						<p className="text-sm font-medium mb-2">
							Fair Dates
							<span className="text-muted-foreground font-normal ml-2">
								{sortedDateStrings.length === 0
									? "Select dates on the calendar."
									: `${sortedDateStrings.length} day${sortedDateStrings.length !== 1 ? "s" : ""} selected.`}
								{closedDates.length > 0 && (
									<> {closedDates.length} gap day{closedDates.length !== 1 ? "s" : ""} within range.</>
								)}
							</span>
						</p>
						<Card className="w-fit">
							<CardContent className="p-4">
								<Calendar
									mode="multiple"
									selected={selectedDates}
									onSelect={handleCalendarSelect}
									onDayClick={handleDayClick}
									defaultMonth={defaultMonth}
									numberOfMonths={2}
								/>
							</CardContent>
						</Card>
						{closedDates.length > 0 && (
							<p className="text-xs text-muted-foreground mt-2">
								Gap days (not included): {closedDates.map((d) =>
									new Date(d + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })
								).join(", ")}
							</p>
						)}
					</div>

		<div>
						<Button
							type="submit"
							disabled={loading || sortedDateStrings.length === 0 || (fair != null && !isDirty)}
						>
							{loading ? "Saving..." : fair ? "Update Fair" : "Create Fair"}
						</Button>
					</div>
				</div>
			</form>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Dates Removed</AlertDialogTitle>
						<AlertDialogDescription>
							You are removing {removedDates.length} date{removedDates.length !== 1 ? "s" : ""} from the fair: {removedDates.map((d) =>
								new Date(d + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })
							).join(", ")}. Any time slots and volunteer registrations on {removedDates.length === 1 ? "this date" : "these dates"} will be permanently deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={doSave}
						>
							Remove Dates &amp; Save
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
