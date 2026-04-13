"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@sdfwa/ui/components/dialog";
import { getGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar-links";

export interface ConfirmDialogSlot {
	slotId: string;
	roleName: string;
	date: string;
	startTime: Date | string;
	endTime: Date | string;
}

interface ConfirmDialogProps {
	slot: ConfirmDialogSlot | null;
	phase: "confirm" | "success" | null;
	loading: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

function formatTime(d: Date | string) {
	return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(d: string) {
	return new Date(d + "T12:00:00").toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

export function ConfirmDialog({ slot, phase, loading, onConfirm, onClose }: ConfirmDialogProps) {
	const slotLabel = slot
		? `${slot.roleName} on ${formatDate(slot.date)}, ${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`
		: "";

	const calendarEvent = slot
		? {
				title: `${slot.roleName} — SDFWA Fair`,
				date: slot.date,
				startTime: slot.startTime,
				endTime: slot.endTime,
				description: `Volunteer shift: ${slot.roleName}`,
			}
		: null;

	return (
		<>
			<Dialog open={phase === "confirm"} onOpenChange={(open) => { if (!open) onClose(); }}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Confirm Registration</DialogTitle>
						<DialogDescription>
							Sign up for <span className="font-medium text-foreground">{slotLabel}</span>?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={onClose} disabled={loading}>
							Cancel
						</Button>
						<Button onClick={onConfirm} disabled={loading}>
							{loading ? "Registering..." : "Register"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={phase === "success"} onOpenChange={(open) => { if (!open) onClose(); }}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>You&apos;re Registered!</DialogTitle>
						<DialogDescription>
							You&apos;re signed up for{" "}
							<span className="font-medium text-foreground">{slotLabel}</span>. Add it to your
							calendar so you don&apos;t forget.
						</DialogDescription>
					</DialogHeader>
					{calendarEvent && (
						<div className="flex flex-col gap-2">
							<Button
								variant="outline"
								className="justify-start"
								onClick={() => window.open(getGoogleCalendarUrl(calendarEvent), "_blank")}
							>
								<CalendarPlus className="size-4" />
								Google Calendar
							</Button>
							<Button
								variant="outline"
								className="justify-start"
								onClick={() => downloadIcsFile(calendarEvent)}
							>
								<CalendarPlus className="size-4" />
								Apple Calendar (.ics)
							</Button>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={onClose}>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
