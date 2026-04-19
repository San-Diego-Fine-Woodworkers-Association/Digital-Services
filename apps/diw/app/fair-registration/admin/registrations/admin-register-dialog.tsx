"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@sdfwa/ui/components/dialog";
import { Input } from "@sdfwa/ui/components/input";
import { toast } from "@sdfwa/ui/components/sonner";
import { searchMembers, adminCreateRegistration } from "@/lib/actions/admin";

interface SlotData {
	id: string;
	date: string;
	startTime: Date | string;
	endTime: Date | string;
	numberOfVolunteers: number;
	registrations: { id: string }[];
}

interface RoleWithSlots {
	id: string;
	name: string;
	slots: SlotData[];
}

interface MemberResult {
	id: string;
	name: string;
	memberId: string | null;
	email: string;
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

function formatDateShort(d: string) {
	return new Date(d + "T12:00:00").toLocaleDateString([], {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

function FilterDropdown({
	placeholder,
	value,
	onChange,
	options,
}: {
	placeholder: string;
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string; disabled?: boolean }[];
}) {
	const hasValue = value !== "";
	return (
		<div className="relative flex-1 min-w-0">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full appearance-none rounded-md border bg-background px-3 py-1.5 pr-8 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
			>
				<option value="">{placeholder}</option>
				{options.map((o) => (
					<option key={o.value} value={o.value} disabled={o.disabled}>
						{o.label}
					</option>
				))}
			</select>
			{hasValue ? (
				<button
					type="button"
					onClick={() => onChange("")}
					className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					aria-label="Clear"
				>
					<X className="size-3.5" />
				</button>
			) : (
				<ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
			)}
		</div>
	);
}

export function AdminRegisterDialog({
	open,
	onOpenChange,
	roles,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	roles: RoleWithSlots[];
}) {
	const router = useRouter();

	// Member search
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<MemberResult[]>([]);
	const [searching, setSearching] = useState(false);
	const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Filters
	const [activeDate, setActiveDate] = useState<string | null>(null);
	const [activeRoleId, setActiveRoleId] = useState<string | null>(null);

	// Selection & submission
	const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	function resetAll() {
		setQuery("");
		setResults([]);
		setSelectedMember(null);
		setActiveDate(null);
		setActiveRoleId(null);
		setSelectedSlotId(null);
	}

	useEffect(() => {
		if (!open) resetAll();
	}, [open]);

	// Debounced member search
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (query.trim().length < 2) { setResults([]); return; }

		setSearching(true);
		debounceRef.current = setTimeout(async () => {
			const res = await searchMembers(query);
			setResults(res);
			setSearching(false);
		}, 300);

		return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
	}, [query]);

	// Derived filter options (only show dates/roles that have open slots)
	const availableRoles = useMemo(
		() =>
			roles
				.map((r) => ({
					...r,
					slots: r.slots.filter((s) => s.registrations.length < s.numberOfVolunteers),
				}))
				.filter((r) => r.slots.length > 0),
		[roles]
	);

	const allDates = useMemo(() => {
		const dateSet = new Set<string>();
		for (const role of availableRoles) {
			for (const slot of role.slots) {
				dateSet.add(slot.date);
			}
		}
		return Array.from(dateSet).sort();
	}, [availableRoles]);

	// Cross-filtering: which dates have slots given active role filter, and vice versa
	const datesWithSlotsForRole = useMemo(() => {
		const base = activeRoleId
			? availableRoles.filter((r) => r.id === activeRoleId)
			: availableRoles;
		const set = new Set<string>();
		for (const role of base) {
			for (const slot of role.slots) set.add(slot.date);
		}
		return set;
	}, [availableRoles, activeRoleId]);

	const rolesWithSlotsForDate = useMemo(() => {
		const set = new Set<string>();
		for (const role of availableRoles) {
			const hasSlotOnDate = activeDate
				? role.slots.some((s) => s.date === activeDate)
				: role.slots.length > 0;
			if (hasSlotOnDate) set.add(role.id);
		}
		return set;
	}, [availableRoles, activeDate]);

	const dateOptions = useMemo(
		() =>
			allDates.map((d) => ({
				value: d,
				label: formatDateShort(d),
				disabled: !datesWithSlotsForRole.has(d),
			})),
		[allDates, datesWithSlotsForRole]
	);

	const roleOptions = useMemo(
		() =>
			availableRoles.map((r) => ({
				value: r.id,
				label: r.name,
				disabled: !rolesWithSlotsForDate.has(r.id),
			})),
		[availableRoles, rolesWithSlotsForDate]
	);

	// Feed: filtered date groups → role subgroups → slots
	const feed = useMemo(() => {
		const filteredRoles = activeRoleId
			? availableRoles.filter((r) => r.id === activeRoleId)
			: availableRoles;

		const dates = activeDate ? [activeDate] : allDates;

		return dates
			.map((date) => {
				const roleEntries = filteredRoles
					.map((role) => ({
						role,
						slots: role.slots
							.filter((s) => s.date === date)
							.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
					}))
					.filter((e) => e.slots.length > 0);
				return { date, roleEntries };
			})
			.filter((d) => d.roleEntries.length > 0);
	}, [availableRoles, allDates, activeDate, activeRoleId]);

	async function handleSubmit() {
		if (!selectedMember || !selectedSlotId) return;
		setSubmitting(true);
		const result = await adminCreateRegistration(selectedSlotId, selectedMember.id);
		setSubmitting(false);
		if (result.success) {
			toast.success(`Registered ${selectedMember.name} successfully.`);
			onOpenChange(false);
			router.refresh();
		} else {
			toast.error(result.error || "Failed to create registration.");
		}
	}

	const selectedSlotInfo = useMemo(() => {
		if (!selectedSlotId) return null;
		for (const role of availableRoles) {
			const slot = role.slots.find((s) => s.id === selectedSlotId);
			if (slot) return { slot, roleName: role.name };
		}
		return null;
	}, [selectedSlotId, availableRoles]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[min(32rem,90vw)] flex flex-col overflow-visible gap-0 p-0">
				{/* Header */}
				<div className="p-6 pb-4">
					<DialogHeader>
						<DialogTitle>Register a Member</DialogTitle>
						<DialogDescription>
							Search for a member, then pick a slot.
						</DialogDescription>
					</DialogHeader>

					{/* Member search */}
					<div className="mt-4">
						{selectedMember ? (
							<div className="flex items-center justify-between rounded-md border px-3 py-2">
								<div>
									<p className="font-medium text-sm">{selectedMember.name}</p>
									<p className="text-xs text-muted-foreground">
										{selectedMember.memberId && `#${selectedMember.memberId} · `}{selectedMember.email}
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => { setSelectedMember(null); setSelectedSlotId(null); }}
								>
									Change
								</Button>
							</div>
						) : (
							<div className="relative">
								<Input
									placeholder="Search by name or member ID..."
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									autoFocus
								/>
								{query.trim().length >= 2 && (
									<div className="absolute z-[60] mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
										{searching && results.length === 0 ? (
											<p className="p-3 text-sm text-muted-foreground">Searching...</p>
										) : results.length === 0 ? (
											<p className="p-3 text-sm text-muted-foreground">No members found.</p>
										) : (
											results.map((m) => (
												<button
													key={m.id}
													type="button"
													className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm cursor-pointer border-b last:border-0"
													onClick={() => {
														setSelectedMember(m);
														setQuery("");
														setResults([]);
													}}
												>
													<p className="font-medium">{m.name}</p>
													<p className="text-xs text-muted-foreground">
														{m.memberId && `#${m.memberId} · `}{m.email}
													</p>
												</button>
											))
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Filters + slot feed — only shown once a member is selected */}
				{selectedMember && (
					<>
						{/* Filters */}
						<div className="border-t border-b bg-muted/40 px-4 py-2.5 flex gap-2">
							<FilterDropdown
								placeholder="All dates"
								value={activeDate ?? ""}
								onChange={(v) => { setActiveDate(v || null); setSelectedSlotId(null); }}
								options={dateOptions}
							/>
							{availableRoles.length > 1 && (
								<FilterDropdown
									placeholder="All roles"
									value={activeRoleId ?? ""}
									onChange={(v) => { setActiveRoleId(v || null); setSelectedSlotId(null); }}
									options={roleOptions}
								/>
							)}
						</div>

						{/* Slot feed */}
						<div className="overflow-y-auto max-h-[40vh] px-4">
							{feed.length === 0 ? (
								<p className="py-8 text-center text-sm text-muted-foreground">
									No available slots match your filters.
								</p>
							) : (
								feed.map(({ date, roleEntries }) => (
									<div key={date}>
										<p className="sticky top-0 bg-background py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide z-10 border-b">
											{formatDate(date)}
										</p>
										<div className="flex flex-col">
											{roleEntries.map(({ role, slots }) => (
												<div key={role.id} className="py-2 border-b last:border-0">
													<p className="text-xs text-muted-foreground mb-1.5">{role.name}</p>
													<div className="flex flex-col gap-1">
														{slots.map((slot) => {
															const remaining = slot.numberOfVolunteers - slot.registrations.length;
															const isSelected = selectedSlotId === slot.id;
															return (
																<button
																	key={slot.id}
																	type="button"
																	onClick={() => setSelectedSlotId(isSelected ? null : slot.id)}
																	className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors border ${
																		isSelected
																			? "border-primary bg-primary/5"
																			: "border-transparent hover:bg-muted"
																	}`}
																>
																	<span className="font-medium">
																		{formatTime(slot.startTime)} – {formatTime(slot.endTime)}
																	</span>
																	<span className={`text-xs ${
																		remaining <= 1 ? "text-yellow-600" : "text-muted-foreground"
																	}`}>
																		{remaining} spot{remaining !== 1 ? "s" : ""} left
																	</span>
																</button>
															);
														})}
													</div>
												</div>
											))}
										</div>
									</div>
								))
							)}
						</div>
					</>
				)}

				{/* Footer */}
				<div className="flex flex-col gap-2 px-6 py-4 border-t sm:flex-row sm:items-center sm:justify-between sm:gap-3">
					{selectedSlotInfo && (
						<p className="text-sm text-muted-foreground truncate">
							{formatDateShort(selectedSlotInfo.slot.date)} · {formatTime(selectedSlotInfo.slot.startTime)}–{formatTime(selectedSlotInfo.slot.endTime)} · {selectedSlotInfo.roleName}
						</p>
					)}
					<div className="flex gap-2 sm:shrink-0 sm:ml-auto">
						<Button variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							className="flex-1 sm:flex-none"
							onClick={handleSubmit}
							disabled={!selectedMember || !selectedSlotId || submitting}
						>
							{submitting ? "Registering..." : "Register"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
