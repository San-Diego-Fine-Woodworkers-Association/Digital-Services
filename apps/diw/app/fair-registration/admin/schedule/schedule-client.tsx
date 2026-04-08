"use client";

import { useMemo } from "react";
import { Button } from "@sdfwa/ui/components/button";

interface RegistrationRow {
	registrationId: string;
	date: string;
	roleName: string;
	startTime: Date | string;
	endTime: Date | string;
	volunteerName: string;
	volunteerEmail: string;
	memberId: string;
}

function formatTime(d: Date | string) {
	return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(d: string) {
	return new Date(d).toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

interface GroupedDay {
	date: string;
	roles: {
		roleName: string;
		slots: {
			timeLabel: string;
			volunteers: { name: string; email: string; memberId: string }[];
		}[];
	}[];
}

export function ScheduleClient({
	fairName,
	registrations,
}: {
	fairName: string;
	registrations: RegistrationRow[];
}) {
	const grouped = useMemo(() => {
		const dayMap = new Map<string, Map<string, Map<string, RegistrationRow[]>>>();

		for (const reg of registrations) {
			if (!dayMap.has(reg.date)) dayMap.set(reg.date, new Map());
			const roleMap = dayMap.get(reg.date)!;

			if (!roleMap.has(reg.roleName)) roleMap.set(reg.roleName, new Map());
			const slotMap = roleMap.get(reg.roleName)!;

			const timeKey = `${formatTime(reg.startTime)} – ${formatTime(reg.endTime)}`;
			if (!slotMap.has(timeKey)) slotMap.set(timeKey, []);
			slotMap.get(timeKey)!.push(reg);
		}

		const result: GroupedDay[] = [];
		for (const [date, roleMap] of Array.from(dayMap.entries()).sort(
			([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
		)) {
			const roles = Array.from(roleMap.entries()).map(([roleName, slotMap]) => ({
				roleName,
				slots: Array.from(slotMap.entries()).map(([timeLabel, regs]) => ({
					timeLabel,
					volunteers: regs.map((r) => ({
						name: r.volunteerName,
						email: r.volunteerEmail,
						memberId: r.memberId,
					})),
				})),
			}));
			result.push({ date, roles });
		}

		return result;
	}, [registrations]);

	return (
		<div>
			<div className="flex items-center justify-between mb-6 print:hidden">
				<h1 className="text-2xl font-bold">Schedule</h1>
				<Button onClick={() => window.print()}>Print</Button>
			</div>

			<div className="print:block">
				<h2 className="text-xl font-bold mb-4 hidden print:block">{fairName} — Volunteer Schedule</h2>

				{grouped.length === 0 ? (
					<p className="text-muted-foreground">No registrations to display.</p>
				) : (
					grouped.map((day) => (
						<div key={day.date} className="mb-8 break-inside-avoid">
							<h3 className="text-lg font-semibold border-b pb-2 mb-3">
								{formatDate(day.date)}
							</h3>
							{day.roles.map((role) => (
								<div key={role.roleName} className="mb-4 ml-2">
									<h4 className="font-medium text-muted-foreground mb-2">
										{role.roleName}
									</h4>
									<table className="w-full text-sm mb-2">
										<thead>
											<tr className="border-b text-left">
												<th className="p-1.5 font-medium w-40">Time</th>
												<th className="p-1.5 font-medium">Volunteers</th>
											</tr>
										</thead>
										<tbody>
											{role.slots.map((slot) => (
												<tr key={slot.timeLabel} className="border-b">
													<td className="p-1.5 align-top">{slot.timeLabel}</td>
													<td className="p-1.5">
														{slot.volunteers.map((v, i) => (
															<div key={i}>
																{v.name}{" "}
																<span className="text-muted-foreground">
																	({v.memberId})
																</span>
															</div>
														))}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							))}
						</div>
					))
				)}
			</div>
		</div>
	);
}
