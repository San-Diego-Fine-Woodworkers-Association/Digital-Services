"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@sdfwa/ui/components/sidebar";
import { Card, CardContent } from "@sdfwa/ui/components/card";
import { toast } from "@sdfwa/ui/components/sonner";
import { RegistrationSidebar } from "@/components/registration-sidebar";
import { RegisterButton } from "@/components/register-button";
import { ConfirmDialog } from "@/components/registration/confirm-dialog";
import { registerForSlot } from "@/lib/actions/registration";
import { confirmContactDetails } from "@/lib/actions/contact";

interface Registration {
	id: string;
	userId: string;
	slotId: string;
}

interface SlotWithRegistrations {
	id: string;
	roleId: string;
	date: string;
	startTime: Date | string;
	endTime: Date | string;
	numberOfVolunteers: number;
	registrations: Registration[];
}

interface RoleWithSlots {
	id: string;
	name: string;
	numberOfVolunteers: number;
	fairId: string;
	slots: SlotWithRegistrations[];
}

interface UserRegistration {
	slot: {
		date: string;
		startTime: Date | string;
		endTime: Date | string;
		role: { name: string } | null;
	};
}

interface FairRegistrationClientProps {
	roles: RoleWithSlots[];
	isLoggedIn: boolean;
	userId: string | null;
	userRegistrations: UserRegistration[];
	fairStartDate: string;
	fairEndDate: string;
	fairClosedDates: string[];
	initialSlotId?: string;
	fairId: string;
	contactValidated: boolean;
	initialAddress: string;
	initialPhone: string;
}

function formatTime(dateStr: Date | string) {
	return new Date(dateStr).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatDate(dateStr: string) {
	return new Date(dateStr + "T12:00:00").toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

function getConflictReason(
	slot: SlotWithRegistrations,
	userRegistrations: UserRegistration[]
): string | null {
	for (const reg of userRegistrations) {
		const existing = reg.slot;
		if (existing.date !== slot.date) continue;
		const existStart = new Date(existing.startTime).getTime();
		const existEnd = new Date(existing.endTime).getTime();
		const slotStart = new Date(slot.startTime).getTime();
		const slotEnd = new Date(slot.endTime).getTime();
		if (existStart < slotEnd && existEnd > slotStart) {
			const roleName = existing.role?.name || "another role";
			return `Conflicts with "${roleName}" (${formatTime(existing.startTime)} – ${formatTime(existing.endTime)})`;
		}
	}
	return null;
}

export function FairRegistrationClient({
	roles,
	isLoggedIn,
	userId,
	userRegistrations,
	fairStartDate,
	fairEndDate,
	fairClosedDates,
	initialSlotId,
	fairId,
	contactValidated,
	initialAddress,
	initialPhone,
}: FairRegistrationClientProps) {
	const router = useRouter();
	const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

	const [pendingSlotId, setPendingSlotId] = useState<string | null>(() => initialSlotId ?? null);
	const [dialogPhase, setDialogPhase] = useState<"confirm" | "contact" | "success" | null>(() =>
		initialSlotId ? "confirm" : null
	);
	const [registering, setRegistering] = useState(false);
	const [contactValidatedLocal, setContactValidatedLocal] = useState(contactValidated);

	// Strip the ?slot= param from the URL immediately on mount so it doesn't pollute history.
	useEffect(() => {
		if (initialSlotId) {
			router.replace("/fair-registration");
		}
	}, [initialSlotId, router]);

	const pendingSlot = useMemo(() => {
		if (!pendingSlotId) return null;
		for (const role of roles) {
			const slot = role.slots.find((s) => s.id === pendingSlotId);
			if (slot) {
				return {
					slotId: slot.id,
					roleName: role.name,
					date: slot.date,
					startTime: slot.startTime,
					endTime: slot.endTime,
				};
			}
		}
		return null;
	}, [pendingSlotId, roles]);

	function handleRegisterClick(slotId: string) {
		setPendingSlotId(slotId);
		setDialogPhase("confirm");
	}

	async function handleConfirm() {
		if (!pendingSlotId) return;
		if (!contactValidatedLocal) {
			setDialogPhase("contact");
			return;
		}
		setRegistering(true);

		const result = await registerForSlot(pendingSlotId);
		if (!result.success) {
			if (result.requiresContactValidation) {
				setDialogPhase("contact");
			} else {
				toast.error(result.error || "Registration failed.");
				setDialogPhase(null);
			}
		} else {
			toast.success("Registered!");
			setDialogPhase("success");
			router.refresh();
		}

		setRegistering(false);
	}

	async function handleContactConfirm(address: string, phone: string) {
		if (!pendingSlotId) return;
		setRegistering(true);

		const contactResult = await confirmContactDetails(fairId, address, phone);
		if (!contactResult.success) {
			toast.error(contactResult.error || "Failed to save contact details.");
			setRegistering(false);
			return;
		}

		setContactValidatedLocal(true);

		const regResult = await registerForSlot(pendingSlotId);
		if (!regResult.success) {
			toast.error(regResult.error || "Registration failed.");
			setDialogPhase(null);
		} else {
			toast.success("Registered!");
			setDialogPhase("success");
			router.refresh();
		}

		setRegistering(false);
	}

	function handleDialogClose() {
		setDialogPhase(null);
		setPendingSlotId(null);
	}

	// All unique dates sorted
	const allDates = useMemo(() => {
		const dateSet = new Set<string>();
		for (const role of roles) {
			for (const slot of role.slots) {
				dateSet.add(slot.date);
			}
		}
		return Array.from(dateSet).sort(
			(a, b) => new Date(a).getTime() - new Date(b).getTime()
		);
	}, [roles]);

	const roleNames = useMemo(
		() => [...new Set(roles.map((r) => r.name))],
		[roles]
	);

	const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);

	function handleToggleRoleName(name: string) {
		setSelectedRoleNames((prev) =>
			prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
		);
	}

	function handleSelectDate(date: string) {
		const el = dateRefs.current[date];
		if (!el) return;
		const container = el.closest("[data-slot='sidebar-inset']");
		if (container) {
			const headerHeight = 56; // h-14 sticky header
			const elTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
			container.scrollTo({ top: elTop - headerHeight, behavior: "smooth" });
		}
	}

	// Build feed: date -> roles -> slots
	const feed = useMemo(() => {
		const filteredRoles = roles.filter(
			(r) =>
				selectedRoleNames.length === 0 || selectedRoleNames.includes(r.name)
		);

		return allDates.map((date) => {
			const roleEntries: { role: RoleWithSlots; slots: SlotWithRegistrations[] }[] = [];

			for (const role of filteredRoles) {
				const slots = role.slots
					.filter((s) => s.date === date)
					.sort(
						(a, b) =>
							new Date(a.startTime).getTime() -
							new Date(b.startTime).getTime()
					);

				if (slots.length > 0) {
					roleEntries.push({ role, slots });
				}
			}

			return { date, roleEntries };
		}).filter((d) => d.roleEntries.length > 0);
	}, [roles, allDates, selectedRoleNames]);

	const hasSlots = roles.some((r) => r.slots.length > 0);

	if (!hasSlots) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
				<p className="text-muted-foreground">
					No slots available yet. Check back later.
				</p>
			</div>
		);
	}

	return (
		<>
			<SidebarProvider open={true} onOpenChange={() => {}} className="h-full overflow-hidden">
				<RegistrationSidebar
					dates={allDates}
					fairStartDate={fairStartDate}
					fairEndDate={fairEndDate}
					fairClosedDates={fairClosedDates}
					onSelectDate={handleSelectDate}
					roleNames={roleNames}
					selectedRoleNames={selectedRoleNames}
					onToggleRoleName={handleToggleRoleName}
					onClearRoleFilter={() => setSelectedRoleNames([])}
				/>
				<SidebarInset className="overflow-y-auto">
					<header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
						<SidebarTrigger className="-ml-1 md:hidden" />
						<h1 className="text-base font-semibold">Sign Up for Slots</h1>
					</header>
					<div className="flex flex-1 flex-col p-4 gap-8 mx-auto w-full">
						{feed.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<p className="text-muted-foreground">
									No slots match your filters.
								</p>
							</div>
						) : (
							feed.map(({ date, roleEntries }) => (
								<div
									key={date}
									ref={(el) => { dateRefs.current[date] = el; }}
									className="scroll-mt-16"
								>
									<h2 className="text-lg font-semibold mb-4 sticky top-14 bg-background py-2 z-[5] border-b">
										{formatDate(date)}
									</h2>
									<div className="flex flex-col gap-5 pl-[1px]">
										{roleEntries.map(({ role, slots }) => (
											<div key={role.id}>
												<h3 className="text-sm font-medium text-muted-foreground mb-2">
													{role.name}
												</h3>
												<div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-none">
													<div className="flex gap-2 w-max">
														{slots.map((slot) => {
															const spotsLeft =
																slot.numberOfVolunteers -
																slot.registrations.length;
															const isFull = spotsLeft <= 0;
															const userReg = userId
																? slot.registrations.find((r) => r.userId === userId)
																: undefined;
															const isRegistered = !!userReg;
															const conflictReason = isRegistered
																? null
																: getConflictReason(slot, userRegistrations);

															return (
																<Card
																	key={slot.id}
																	className={`shrink-0 w-52 my-2 ${
																		isRegistered
																			? "border-primary bg-primary/5"
																			: isFull
																				? "opacity-60"
																				: ""
																	}`}
																>
																	<CardContent className="p-3">
																		<div className="flex flex-col gap-2">
																			<div>
																				<span className="font-medium text-sm">
																					{formatTime(slot.startTime)} –{" "}
																					{formatTime(slot.endTime)}
																				</span>
																				<div
																					className={`text-xs ${
																						isRegistered
																							? "text-primary font-medium"
																							: isFull
																								? "text-destructive"
																								: spotsLeft <= 2
																									? "text-yellow-600"
																									: "text-green-600"
																					}`}
																				>
																					{isRegistered
																						? "Registered"
																						: isFull
																							? "Full"
																							: `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
																				</div>
																			</div>
																			<RegisterButton
																				slotId={slot.id}
																				isFull={isFull}
																				isLoggedIn={isLoggedIn}
																				isRegistered={isRegistered}
																				registrationId={userReg?.id ?? null}
																				conflictReason={conflictReason}
																				roleName={role.name}
																				date={slot.date}
																				startTime={slot.startTime}
																				endTime={slot.endTime}
																				isRegistering={registering && pendingSlotId === slot.id}
																				onRegisterClick={() => handleRegisterClick(slot.id)}
																			/>
																		</div>
																	</CardContent>
																</Card>
															);
														})}
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							))
						)}
					</div>
				</SidebarInset>
			</SidebarProvider>

			<ConfirmDialog
				slot={pendingSlot}
				phase={dialogPhase}
				loading={registering}
				onConfirm={handleConfirm}
				onContactConfirm={handleContactConfirm}
				onClose={handleDialogClose}
				initialAddress={initialAddress}
				initialPhone={initialPhone}
			/>
		</>
	);
}
