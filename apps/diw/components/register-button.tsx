"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@sdfwa/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@sdfwa/ui/components/tooltip";
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
import { cancelRegistration } from "@/lib/actions/registration";

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
	isRegistering?: boolean;
	onRegisterClick: () => void;
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
	isRegistering = false,
	onRegisterClick,
}: RegisterButtonProps) {
	const router = useRouter();
	const [cancelling, setCancelling] = useState(false);
	const [cancelOpen, setCancelOpen] = useState(false);

	const slotLabel = `${roleName} on ${formatDate(date)}, ${formatTime(startTime)} – ${formatTime(endTime)}`;

	async function handleCancel() {
		if (!registrationId) return;
		setCancelOpen(false);
		setCancelling(true);

		const result = await cancelRegistration(registrationId);
		if (!result.success) {
			toast.error(result.error || "Cancellation failed.");
		} else {
			toast.success("Registration cancelled.");
			router.refresh();
		}

		setCancelling(false);
	}

	let button: React.ReactNode;

	if (isRegistered) {
		button = (
			<Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)} disabled={cancelling}>
				{cancelling ? "Cancelling..." : "Cancel"}
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
		button = !isLoggedIn ? (
			<Button size="sm" asChild>
				<Link
					href={`/fair-registration/login?redirect=${encodeURIComponent("/fair-registration?slot=" + slotId)}`}
				>
					Register
				</Link>
			</Button>
		) : (
			<Button size="sm" onClick={onRegisterClick} disabled={isRegistering}>
				{isRegistering ? "Registering..." : "Register"}
			</Button>
		);
	}

	return (
		<>
			{button}

			<AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Registration</AlertDialogTitle>
						<AlertDialogDescription>
							You will be removed from {slotLabel}. Your spot will become available for other
							volunteers.
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
