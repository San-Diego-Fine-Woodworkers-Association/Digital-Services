"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@sdfwa/ui/components/dropdown-menu";
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
import { getGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar-links";

interface RegistrationWithSlot {
	id: string;
	slotId: string;
	userId: string;
	slot: {
		id: string;
		date: string;
		startTime: Date | string;
		endTime: Date | string;
		numberOfVolunteers: number;
		role: {
			id: string;
			name: string;
		} | null;
	};
}

interface MyRegistrationsClientProps {
	registrations: RegistrationWithSlot[];
}

function formatTime(dateStr: Date | string) {
	return new Date(dateStr).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

export function MyRegistrationsClient({
	registrations,
}: MyRegistrationsClientProps) {
	const router = useRouter();
	const [cancellingId, setCancellingId] = useState<string | null>(null);
	const [cancelTarget, setCancelTarget] = useState<RegistrationWithSlot | null>(null);

	async function handleCancel(reg: RegistrationWithSlot) {
		setCancelTarget(null);
		setCancellingId(reg.id);

		const result = await cancelRegistration(reg.id);
		if (!result.success) {
			toast.error(result.error || "Failed to cancel registration.");
		} else {
			toast.success("Registration cancelled.");
			router.refresh();
		}

		setCancellingId(null);
	}

	if (registrations.length === 0) {
		return (
			<div className="p-4 mx-auto w-full max-w-[1200px]">
				<h1 className="text-2xl font-bold mb-4">My Registrations</h1>
				<p className="text-muted-foreground">You have no registrations yet.</p>
			</div>
		);
	}

	// Group by date
	const grouped = new Map<string, RegistrationWithSlot[]>();
	for (const reg of registrations) {
		const date = reg.slot.date;
		if (!grouped.has(date)) {
			grouped.set(date, []);
		}
		grouped.get(date)!.push(reg);
	}

	const sortedDates = Array.from(grouped.entries()).sort(
		([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
	);

	return (
		<div className="p-4 mx-auto w-full max-w-[1200px]">
			<h1 className="text-2xl font-bold mb-4">My Registrations</h1>
			<div className="flex flex-col gap-6">
				{sortedDates.map(([date, regs]) => (
					<div key={date}>
						<h2 className="text-lg font-semibold mb-3">{formatDate(date)}</h2>
						<div className="border rounded-lg overflow-hidden">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50">
										<th className="text-left font-medium px-3 py-2">Role</th>
										<th className="text-left font-medium px-3 py-2">Time</th>
										<th className="px-3 py-2" />
									</tr>
								</thead>
								<tbody>
									{regs
										.sort(
											(a, b) =>
												new Date(a.slot.startTime).getTime() -
												new Date(b.slot.startTime).getTime()
										)
										.map((reg) => (
											<tr key={reg.id} className="border-b last:border-b-0">
												<td className="px-3 py-2 font-medium">
													{reg.slot.role?.name || "Unknown Role"}
												</td>
												<td className="px-3 py-2">
													{formatTime(reg.slot.startTime)} – {formatTime(reg.slot.endTime)}
												</td>
												<td className="px-3 py-2 text-right">
													<div className="flex items-center justify-end gap-2">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="outline" size="sm">
																	<CalendarPlus className="size-3.5" />
																	Add to Calendar
																	<ChevronDown className="size-3" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={() => {
																		const roleName = reg.slot.role?.name || "Volunteer Shift";
																		window.open(getGoogleCalendarUrl({
																			title: `${roleName} — SDFWA Fair`,
																			date: reg.slot.date,
																			startTime: reg.slot.startTime,
																			endTime: reg.slot.endTime,
																			description: `Volunteer shift: ${roleName}`,
																		}), "_blank");
																	}}
																>
																	Google Calendar
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={() => {
																		const roleName = reg.slot.role?.name || "Volunteer Shift";
																		downloadIcsFile({
																			title: `${roleName} — SDFWA Fair`,
																			date: reg.slot.date,
																			startTime: reg.slot.startTime,
																			endTime: reg.slot.endTime,
																			description: `Volunteer shift: ${roleName}`,
																		});
																	}}
																>
																	Apple Calendar (.ics)
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
														<Button
															variant="outline"
															size="sm"
															onClick={() => setCancelTarget(reg)}
															disabled={cancellingId === reg.id}
														>
															{cancellingId === reg.id ? "Cancelling..." : "Cancel"}
														</Button>
													</div>
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					</div>
				))}
			</div>

			<AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Registration</AlertDialogTitle>
						<AlertDialogDescription>
							You will be removed from the {cancelTarget?.slot.role?.name || "Unknown Role"} slot on {cancelTarget ? formatDate(cancelTarget.slot.date) : ""} ({cancelTarget ? formatTime(cancelTarget.slot.startTime) + " – " + formatTime(cancelTarget.slot.endTime) : ""}). Your spot will become available for other volunteers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Registration</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => cancelTarget && handleCancel(cancelTarget)}
						>
							Cancel Registration
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
