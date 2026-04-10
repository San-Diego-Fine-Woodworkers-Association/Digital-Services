"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@sdfwa/ui/components/tooltip";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@sdfwa/ui/components/dialog";
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
import { registerForSlot, cancelRegistration } from "@/lib/actions/registration";
import { getGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar-links";

interface RegisterButtonProps {
	slotId: string;
	isFull: boolean;
	isLoggedIn: boolean;
	isRegistered: boolean;
	registrationId: string | null;
	conflictReason: string | null;
	roleName: string;
	date: string;
	startTime: Date | string;
	endTime: Date | string;
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

export function RegisterButton({
	slotId,
	isFull,
	isLoggedIn,
	isRegistered,
	registrationId,
	conflictReason,
	roleName,
	date,
	startTime,
	endTime,
}: RegisterButtonProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [successOpen, setSuccessOpen] = useState(false);
	const [cancelOpen, setCancelOpen] = useState(false);

	const calendarEvent = {
		title: `${roleName} — SDFWA Fair`,
		date,
		startTime,
		endTime,
		description: `Volunteer shift: ${roleName}`,
	};

	const slotLabel = `${roleName} on ${formatDate(date)}, ${formatTime(startTime)} – ${formatTime(endTime)}`;

	async function handleRegister() {
		setConfirmOpen(false);
		setLoading(true);

		const result = await registerForSlot(slotId);
		if (!result.success) {
			toast.error(result.error || "Registration failed.");
		} else {
			toast.success("Registered!");
			setSuccessOpen(true);
			router.refresh();
		}

		setLoading(false);
	}

	async function handleCancel() {
		if (!registrationId) return;
		setCancelOpen(false);
		setLoading(true);

		const result = await cancelRegistration(registrationId);
		if (!result.success) {
			toast.error(result.error || "Cancellation failed.");
		} else {
			toast.success("Registration cancelled.");
			router.refresh();
		}

		setLoading(false);
	}

	// Determine which button to show
	let button: React.ReactNode;

	if (isRegistered) {
		button = (
			<Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)} disabled={loading}>
				{loading ? "Cancelling..." : "Cancel"}
			</Button>
		);
	} else if (isFull) {
		button = (
			<Button size="sm" disabled variant="outline">
				Full
			</Button>
		);
	} else if (conflictReason) {
		button = (
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<Button size="sm" disabled variant="outline">
							Conflict
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent className="max-w-xs">
					<p>{conflictReason}</p>
				</TooltipContent>
			</Tooltip>
		);
	} else {
		button = (
			<Button
				size="sm"
				onClick={() => {
					if (!isLoggedIn) {
						router.push(`/fair-registration/login?redirect=/fair-registration`);
						return;
					}
					setConfirmOpen(true);
				}}
				disabled={loading}
			>
				{loading ? "Registering..." : "Register"}
			</Button>
		);
	}

	return (
		<>
			{button}

			{/* Confirm registration dialog */}
			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Confirm Registration</DialogTitle>
						<DialogDescription>
							Sign up for <span className="font-medium text-foreground">{slotLabel}</span>?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>
							Go Back
						</Button>
						<Button onClick={handleRegister}>
							Register
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Success + add to calendar dialog */}
			<Dialog open={successOpen} onOpenChange={setSuccessOpen}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>You&apos;re Registered!</DialogTitle>
						<DialogDescription>
							You&apos;re signed up for <span className="font-medium text-foreground">{slotLabel}</span>. Add it to your calendar so you don&apos;t forget.
						</DialogDescription>
					</DialogHeader>
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
					<DialogFooter>
						<Button variant="outline" onClick={() => setSuccessOpen(false)}>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Cancel registration confirmation */}
			<AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Registration</AlertDialogTitle>
						<AlertDialogDescription>
							You will be removed from {slotLabel}. Your spot will become available for other volunteers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Registration</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleCancel}
						>
							Cancel Registration
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
