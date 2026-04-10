"use client";

import { useMemo, useState } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarSeparator,
} from "@sdfwa/ui/components/sidebar";
import { Calendar } from "@sdfwa/ui/components/calendar";
import { Button } from "@sdfwa/ui/components/button";

interface RegistrationSidebarProps {
	dates: string[];
	fairStartDate: string;
	fairEndDate: string;
	fairClosedDates: string[];
	onSelectDate: (date: string) => void;
	roleNames: string[];
	selectedRoleNames: string[];
	onToggleRoleName: (name: string) => void;
	onClearRoleFilter: () => void;
}

function toDateString(date: Date) {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function SidebarCalendar({
	dates,
	fairStartDate,
	fairEndDate,
	fairClosedDates,
	onSelectDate,
}: {
	dates: string[];
	fairStartDate: string;
	fairEndDate: string;
	fairClosedDates: string[];
	onSelectDate: (date: string) => void;
}) {
	const availableDateSet = useMemo(() => new Set(dates), [dates]);
	const closedDateSet = useMemo(() => new Set(fairClosedDates), [fairClosedDates]);

	const firstAvailable = dates[0]
		? new Date(dates[0] + "T12:00:00")
		: undefined;

	const [selected, setSelected] = useState<Date | undefined>(firstAvailable);

	const rangeStart = new Date(fairStartDate + "T00:00:00");
	const rangeEnd = new Date(fairEndDate + "T23:59:59");

	return (
		<Calendar
			mode="single"
			selected={selected}
			defaultMonth={firstAvailable}
			onSelect={(date) => {
				if (!date) return;
				setSelected(date);
				onSelectDate(toDateString(date));
			}}
			disabled={(date) => {
				if (date < rangeStart || date > rangeEnd) return true;
				const ds = toDateString(date);
				if (closedDateSet.has(ds)) return true;
				return !availableDateSet.has(ds);
			}}
			className="w-full"
		/>
	);
}

export function RegistrationSidebar({
	dates,
	fairStartDate,
	fairEndDate,
	fairClosedDates,
	onSelectDate,
	roleNames,
	selectedRoleNames,
	onToggleRoleName,
	onClearRoleFilter,
}: RegistrationSidebarProps) {
	return (
		<Sidebar>
			<SidebarHeader className="border-sidebar-border border-b p-4">
				<h2 className="text-sm font-semibold">Navigate</h2>
			</SidebarHeader>
			<SidebarContent className="px-2 py-4">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarCalendar
							dates={dates}
							fairStartDate={fairStartDate}
							fairEndDate={fairEndDate}
							fairClosedDates={fairClosedDates}
							onSelectDate={onSelectDate}
						/>
					</SidebarGroupContent>
				</SidebarGroup>

				{roleNames.length > 0 && (
					<>
						<SidebarSeparator />
						<SidebarGroup>
							<SidebarGroupLabel>Filter by Role</SidebarGroupLabel>
							<SidebarGroupContent>
								<div className="flex flex-col gap-1 px-2">
									{roleNames.map((name) => {
										const isSelected = selectedRoleNames.includes(name);
										return (
											<Button
												key={name}
												variant="outline"
												onClick={() => onToggleRoleName(name)}
												className={`text-sm text-left rounded-md px-2 py-1.5 transition-colors ${
													isSelected
														? "bg-foreground text-background"
														: ""
												}`}
											>
												{name}
											</Button>
										);
									})}
									{selectedRoleNames.length > 0 && (
										<Button
											variant="ghost"
											onClick={onClearRoleFilter}
											className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left cursor-pointer"
										>
											Clear filter
										</Button>
									)}
								</div>
							</SidebarGroupContent>
						</SidebarGroup>
					</>
				)}
			</SidebarContent>
		</Sidebar>
	);
}
