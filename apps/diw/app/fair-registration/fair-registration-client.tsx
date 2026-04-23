"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import { Calendar } from "@sdfwa/ui/components/calendar";
import { cn } from "@sdfwa/ui/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@sdfwa/ui/components/popover";
import { toast } from "@sdfwa/ui/components/sonner";
import { ConfirmDialog } from "@/components/registration/confirm-dialog";
import { RegisterButton } from "@/components/register-button";
import { useSwipe } from "@/hooks/use-swipe";
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
	fairId: string;
	contactValidated: boolean;
	initialAddress: string;
	initialPhone: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

/** Returns the Monday of the week containing `date`. */
function getWeekStart(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay(); // 0 = Sun
	d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
	return d;
}

function formatTime(dateStr: Date | string) {
	return new Date(dateStr).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatLongDate(dateStr: string) {
	return new Date(dateStr + "T12:00:00").toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

function formatMonthDay(date: Date): string {
	return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDayAbbr(date: Date): string {
	return date.toLocaleDateString([], { weekday: "short" }); // "Mon"
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

// ── component ─────────────────────────────────────────────────────────────────

export function FairRegistrationClient({
	roles,
	isLoggedIn,
	userId,
	userRegistrations,
	fairStartDate,
	fairEndDate,
	fairClosedDates,
	fairId,
	contactValidated,
	initialAddress,
	initialPhone,
}: FairRegistrationClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	// ── dialog state ──────────────────────────────────────────────────────────
	const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
	const [dialogPhase, setDialogPhase] = useState<"confirm" | "contact" | "success" | null>(null);
	const [registering, setRegistering] = useState(false);
	const [contactValidatedLocal, setContactValidatedLocal] = useState(contactValidated);

	useEffect(() => {
		const slotId = searchParams.get("slot");
		if (slotId) {
			setPendingSlotId(slotId);
			setDialogPhase("confirm");
			router.replace("/fair-registration");
		}
	}, [searchParams, router]);

	const pendingSlot = useMemo(() => {
		if (!pendingSlotId) return null;
		for (const role of roles) {
			const slot = role.slots.find((s) => s.id === pendingSlotId);
			if (slot)
				return {
					slotId: slot.id,
					roleName: role.name,
					date: slot.date,
					startTime: slot.startTime,
					endTime: slot.endTime,
				};
		}
		return null;
	}, [pendingSlotId, roles]);

	async function handleConfirm() {
		if (!pendingSlotId) return;
		if (!contactValidatedLocal) { setDialogPhase("contact"); return; }
		setRegistering(true);
		const result = await registerForSlot(pendingSlotId);
		if (!result.success) {
			if (result.requiresContactValidation) setDialogPhase("contact");
			else { toast.error(result.error || "Registration failed."); setDialogPhase(null); }
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

	// ── calendar popover ─────────────────────────────────────────────────────
	const [calendarOpen, setCalendarOpen] = useState(false);

	// ── role filter ───────────────────────────────────────────────────────────
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

	const roleOpenCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const role of roles) {
			counts[role.id] = role.slots.filter(
				(s) => s.numberOfVolunteers - s.registrations.length > 0
			).length;
		}
		return counts;
	}, [roles]);

	const totalOpenSlots = useMemo(
		() => Object.values(roleOpenCounts).reduce((a, b) => a + b, 0),
		[roleOpenCounts]
	);

	// ── week navigation ───────────────────────────────────────────────────────
	const fairStart = useMemo(() => new Date(fairStartDate + "T00:00:00"), [fairStartDate]);
	const fairEnd = useMemo(() => new Date(fairEndDate + "T23:59:59"), [fairEndDate]);

	const [weekStart, setWeekStart] = useState(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const fs = new Date(fairStartDate + "T00:00:00");
		return getWeekStart(today > fs ? today : fs);
	});

	const weekDays = useMemo(
		() =>
			Array.from({ length: 7 }, (_, i) => {
				const d = new Date(weekStart);
				d.setDate(d.getDate() + i);
				return d;
			}),
		[weekStart]
	);

	const weekEnd = weekDays[6];

	const fairStartWeek = useMemo(() => getWeekStart(fairStart), [fairStart]);
	const fairEndWeek = useMemo(() => getWeekStart(fairEnd), [fairEnd]);

	const canGoPrev = weekStart.getTime() > fairStartWeek.getTime();
	const canGoNext = weekStart.getTime() < fairEndWeek.getTime();

	function prevWeek() {
		setWeekStart((d) => {
			const next = new Date(d);
			next.setDate(next.getDate() - 7);
			return next;
		});
	}

	function nextWeek() {
		setWeekStart((d) => {
			const next = new Date(d);
			next.setDate(next.getDate() + 7);
			return next;
		});
	}

	// ── per-day slot data ─────────────────────────────────────────────────────
	const closedSet = useMemo(() => new Set(fairClosedDates), [fairClosedDates]);

	// ── mobile carousel: flat date array ──────────────────────────────────────
	const allFairDates = useMemo(() => {
		const dates: { day: Date; dateStr: string }[] = [];
		const cur = new Date(fairStart);
		cur.setHours(0, 0, 0, 0);
		const end = new Date(fairEnd);
		end.setHours(0, 0, 0, 0);
		while (cur <= end) {
			dates.push({ day: new Date(cur), dateStr: toDateString(cur) });
			cur.setDate(cur.getDate() + 1);
		}
		return dates;
	}, [fairStart, fairEnd]);

	const getSlotsForDate = useCallback(
		(dateStr: string) => {
			if (closedSet.has(dateStr)) return [];
			const filteredRoles = selectedRoleId
				? roles.filter((r) => r.id === selectedRoleId)
				: roles;
			const slots: {
				role: RoleWithSlots;
				slot: SlotWithRegistrations;
				spotsLeft: number;
			}[] = [];
			for (const role of filteredRoles) {
				for (const slot of role.slots) {
					if (slot.date !== dateStr) continue;
					const spotsLeft = slot.numberOfVolunteers - slot.registrations.length;
					if (spotsLeft <= 0) continue;
					slots.push({ role, slot, spotsLeft });
				}
			}
			slots.sort(
				(a, b) =>
					new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime(),
			);
			return slots;
		},
		[roles, selectedRoleId, closedSet],
	);

	const [carouselIndex, setCarouselIndex] = useState(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = toDateString(today);
		const idx = allFairDates.findIndex((d) => d.dateStr >= todayStr);
		return idx >= 0 ? idx : 0;
	});

	const [animDirection, setAnimDirection] = useState<"left" | "right" | null>(null);

	const handleSwipeLeft = useCallback(() => {
		if (animDirection !== null) return;
		if (carouselIndex >= allFairDates.length - 1) return;
		setAnimDirection("left");
	}, [animDirection, carouselIndex, allFairDates.length]);

	const handleSwipeRight = useCallback(() => {
		if (animDirection !== null) return;
		if (carouselIndex <= 0) return;
		setAnimDirection("right");
	}, [animDirection, carouselIndex]);

	function handleTransitionEnd() {
		if (animDirection === "left") {
			setCarouselIndex((i) => i + 1);
		} else if (animDirection === "right") {
			setCarouselIndex((i) => i - 1);
		}
		setAnimDirection(null);
	}

	const swipeHandlers = useSwipe({
		onSwipeLeft: handleSwipeLeft,
		onSwipeRight: handleSwipeRight,
	});

	// Sync weekStart when carousel crosses week boundary
	useEffect(() => {
		const currentDate = allFairDates[carouselIndex]?.day;
		if (!currentDate) return;
		const newWeekStart = getWeekStart(currentDate);
		if (newWeekStart.getTime() !== weekStart.getTime()) {
			setWeekStart(newWeekStart);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [carouselIndex, allFairDates]);

	const datesWithNoSlots = useMemo(() => {
		const result: Date[] = [];
		const filteredRoles = selectedRoleId
			? roles.filter((r) => r.id === selectedRoleId)
			: roles;

		const datesWithSlots = new Set<string>();
		for (const role of filteredRoles) {
			for (const slot of role.slots) {
				if (slot.numberOfVolunteers - slot.registrations.length > 0) {
					datesWithSlots.add(slot.date);
				}
			}
		}

		const cur = new Date(fairStart);
		cur.setHours(0, 0, 0, 0);
		const end = new Date(fairEnd);
		end.setHours(0, 0, 0, 0);
		while (cur <= end) {
			const dateStr = toDateString(cur);
			if (!datesWithSlots.has(dateStr) || closedSet.has(dateStr)) {
				result.push(new Date(cur));
			}
			cur.setDate(cur.getDate() + 1);
		}
		return result;
	}, [fairStart, fairEnd, roles, selectedRoleId, closedSet]);

	const weekData = useMemo(() => {
		return weekDays.map((day) => {
			const dateStr = toDateString(day);
			const isOutsideFair = day < fairStart || day > fairEnd;
			const isClosed = !isOutsideFair && closedSet.has(dateStr);

			if (isOutsideFair || isClosed) {
				return { day, dateStr, slots: [], isOutsideFair, isClosed };
			}

			const filteredRoles = selectedRoleId
				? roles.filter((r) => r.id === selectedRoleId)
				: roles;

			const slots: {
				role: RoleWithSlots;
				slot: SlotWithRegistrations;
				spotsLeft: number;
			}[] = [];

			for (const role of filteredRoles) {
				for (const slot of role.slots) {
					if (slot.date !== dateStr) continue;
					const spotsLeft = slot.numberOfVolunteers - slot.registrations.length;
					if (spotsLeft <= 0) continue; // full slots are hidden
					slots.push({ role, slot, spotsLeft });
				}
			}

			slots.sort(
				(a, b) =>
					new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime()
			);

			return { day, dateStr, slots, isOutsideFair: false, isClosed: false };
		});
	}, [weekDays, roles, selectedRoleId, fairStart, fairEnd, closedSet]);

	// When role filter changes, jump carousel to first day with open slots
	useEffect(() => {
		const firstIdx = allFairDates.findIndex(
			(d) => !closedSet.has(d.dateStr) && getSlotsForDate(d.dateStr).length > 0,
		);
		if (firstIdx >= 0) setCarouselIndex(firstIdx);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedRoleId]);

	// ── early exit ────────────────────────────────────────────────────────────
	const hasSlots = roles.some((r) => r.slots.length > 0);
	if (!hasSlots) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
				<p className="text-muted-foreground">No slots available yet. Check back later.</p>
			</div>
		);
	}

	// ── slot card renderer ────────────────────────────────────────────────────
	function renderSlotCard(
		role: RoleWithSlots,
		slot: SlotWithRegistrations,
		spotsLeft: number
	) {
		const userReg = userId
			? slot.registrations.find((r) => r.userId === userId)
			: undefined;
		const isRegistered = !!userReg;
		const conflictReason = isRegistered
			? null
			: getConflictReason(slot, userRegistrations);

		return (
			<div
				key={slot.id}
				className={cn(
					"rounded-lg border p-3 flex flex-col gap-2",
					isRegistered
						? "border-primary bg-primary/5"
						: spotsLeft === 1
							? "border-yellow-300 bg-yellow-50/60"
							: "bg-accent/50",
				)}
			>
				<div>
					<div className="font-semibold text-sm leading-snug">{role.name}</div>
					<div className="text-xs text-muted-foreground mt-0.5">
						{formatTime(slot.startTime)} – {formatTime(slot.endTime)}
					</div>
					{!isRegistered && spotsLeft === 1 && (
						<div className="text-xs text-yellow-600 font-medium mt-1">⚠ 1 spot left</div>
					)}
					{isRegistered && (
						<div className="text-xs text-primary font-medium mt-1">Registered</div>
					)}
				</div>
				<RegisterButton
					slotId={slot.id}
					isFull={false}
					isLoggedIn={isLoggedIn}
					isRegistered={isRegistered}
					registrationId={userReg?.id ?? null}
					conflictReason={conflictReason}
					roleName={role.name}
					date={slot.date}
					startTime={slot.startTime}
					endTime={slot.endTime}
					isRegistering={registering && pendingSlotId === slot.id}
					onRegisterClick={() => {
						setPendingSlotId(slot.id);
						setDialogPhase("confirm");
					}}
				/>
			</div>
		);
	}

	function handleCalendarSelect(date: Date | undefined) {
		if (!date) return;
		setWeekStart(getWeekStart(date));
		const dateStr = toDateString(date);
		const idx = allFairDates.findIndex((d) => d.dateStr === dateStr);
		if (idx >= 0) {
			setAnimDirection(null);
			setCarouselIndex(idx);
		}
		setCalendarOpen(false);
	}

	function renderCarouselDay(idx: number) {
		const fairDate = allFairDates[idx];
		if (!fairDate) return null;
		const { dateStr } = fairDate;
		const isClosed = closedSet.has(dateStr);

		if (isClosed) {
			return (
				<p className="text-muted-foreground text-sm text-center py-10">
					Fair is closed this day.
				</p>
			);
		}

		const slots = getSlotsForDate(dateStr);
		if (slots.length === 0) {
			return (
				<div className="flex flex-col items-center gap-4 py-10 text-center">
					<p className="text-muted-foreground text-sm">
						No open slots for this day.
					</p>
					{idx < allFairDates.length - 1 && (
						<Button variant="outline" size="sm" onClick={() => {
							setAnimDirection(null);
							setCarouselIndex(idx + 1);
						}}>
							Try next day →
						</Button>
					)}
				</div>
			);
		}

		return (
			<div className="flex flex-col gap-3">
				<div className="text-sm font-medium text-muted-foreground">
					{formatLongDate(dateStr)}
				</div>
				{slots.map(({ role, slot, spotsLeft }) =>
					renderSlotCard(role, slot, spotsLeft),
				)}
			</div>
		);
	}

	const weekRangeLabel = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd!)}`;

	// ── render ────────────────────────────────────────────────────────────────
	return (
		<div className="flex flex-col w-full max-w-300 mx-auto">
			<h1 className="px-4 py-2.5 text-3xl font-semibold">Volunteer at the Fair!</h1>
			<div className="px-4 text-lg py-1.5 text-muted-foreground">
				Filter shifts using the buttons below
			</div>
			{/* Role filter */}
			<div className="px-4 py-2.5 flex gap-2 flex-wrap items-center border-b">
				<Button
					variant={selectedRoleId === null ? "default" : "outline"}
					size="xl"
					onClick={() => setSelectedRoleId(null)}
				>
					All Shifts
					<span className="ml-1.5 text-xs opacity-60">({totalOpenSlots})</span>
				</Button>
				{roles.map((role) => (
					<Button
						key={role.id}
						variant={selectedRoleId === role.id ? "default" : "outline"}
						size="xl"
						onClick={() =>
							setSelectedRoleId((prev) => (prev === role.id ? null : role.id))
						}
					>
						{role.name}
						<span className="ml-1.5 text-xs opacity-60">
							({roleOpenCounts[role.id] ?? 0})
						</span>
					</Button>
				))}
			</div>

			{/* Sticky week selector + day strip */}
			<div className="sticky top-0 b z-20 bg-background border-b">
				{/* Week navigation */}
				<div className="px-3 py-2 flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="size-8 shrink-0"
						onClick={prevWeek}
						disabled={!canGoPrev}
						aria-label="Previous week"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<span className="text-sm font-medium flex-1 text-center">
						{weekRangeLabel}
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 shrink-0"
						onClick={nextWeek}
						disabled={!canGoNext}
						aria-label="Next week"
					>
						<ChevronRight className="size-4" />
					</Button>
					<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-8 shrink-0"
								aria-label="Open date picker"
							>
								<CalendarIcon className="size-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="end">
							<Calendar
								mode="single"
								startMonth={fairStart}
								endMonth={fairEnd}
								hidden={{ before: fairStart, after: fairEnd }}
								showOutsideDays={true}
								disabled={datesWithNoSlots}
								defaultMonth={weekStart}
								onSelect={handleCalendarSelect}
							/>
						</PopoverContent>
					</Popover>
				</div>

				{/* Mobile: day-of-week strip */}
				<div className="flex md:hidden border-t divide-x">
					{weekData.map(({ day, dateStr, slots, isOutsideFair, isClosed }) => {
						const isActive = allFairDates[carouselIndex]?.dateStr === dateStr;
						return (
							<button
								key={dateStr}
								onClick={() => {
									if (isOutsideFair) return;
									const idx = allFairDates.findIndex((d) => d.dateStr === dateStr);
									if (idx >= 0) {
										setAnimDirection(null);
										setCarouselIndex(idx);
									}
								}}
								disabled={isOutsideFair}
								className={cn(
									"flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors",
									isActive
										? "bg-primary/10"
										: "hover:bg-muted/50",
									isOutsideFair && "opacity-30 cursor-default",
								)}
							>
								<span className="text-[10px] text-muted-foreground leading-none">
									{formatDayAbbr(day).charAt(0)}
								</span>
								<span className="text-sm font-semibold leading-none">{day.getDate()}</span>
								<span
									className={cn(
										"text-[10px] leading-none mt-0.5",
										slots.length > 0 && !isClosed
											? "text-green-600"
											: "text-muted-foreground",
									)}
								>
									{isOutsideFair ? "" : isClosed ? "—" : slots.length > 0 ? slots.length : "·"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Desktop: 7-column week grid */}
			<div className="hidden md:grid grid-cols-7 flex-1 divide-x">
				{weekData.map(({ day, dateStr, slots, isOutsideFair, isClosed }) => (
					<div
						key={dateStr}
						className={cn(
							"flex flex-col min-h-48",
							(isOutsideFair || isClosed) && "bg-muted/20"
						)}
					>
						{/* Column header */}
						<div className="px-2 pt-3 pb-2 border-b">
							<div className="text-xs text-muted-foreground">{formatDayAbbr(day)}</div>
							<div className="text-xl font-semibold leading-tight">{day.getDate()}</div>
						</div>

						{/* Slot list */}
						{isClosed ? (
							<div className="text-sm text-muted-foreground mt-2.5 mx-auto">Closed</div>
						) : <div className="p-2 flex flex-col gap-2">
							{isOutsideFair ? (
								<div className="text-xs text-muted-foreground text-center py-6 select-none">
									—
								</div>
							) : isClosed ? null : slots.length === 0 ? (
								<div className="text-xs text-muted-foreground text-center py-6">
									No open slots
								</div>
							) : (
								slots.map(({ role, slot, spotsLeft }) =>
									renderSlotCard(role, slot, spotsLeft)
								)
							)}
						</div>}
					</div>
				))}
			</div>

			{/* Mobile: swipable carousel */}
			<div
				className="md:hidden flex-1 overflow-hidden"
				{...swipeHandlers}
			>
				<div
					className="flex w-[300%]"
					style={{
						transform:
							animDirection === "left"
								? "translateX(-66.666%)"
								: animDirection === "right"
									? "translateX(0%)"
									: "translateX(-33.333%)",
						transition: animDirection ? "transform 250ms ease-out" : "none",
					}}
					onTransitionEnd={handleTransitionEnd}
				>
					{[carouselIndex - 1, carouselIndex, carouselIndex + 1].map(
						(idx) => (
							<div key={idx} className="w-1/3 p-4">
								{renderCarouselDay(idx)}
							</div>
						),
					)}
				</div>
			</div>

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
		</div>
	);
}
