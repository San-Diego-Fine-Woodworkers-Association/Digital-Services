export const dynamic = "force-dynamic";

import Link from "next/link";
import { Settings, Users, ClipboardList, CalendarDays, UserCog } from "lucide-react";
import { getActiveFair, getRolesWithSlots } from "@/lib/actions/fair";
import { AdminLayoutClient } from "./admin-layout-client";

const adminNavItems = [
	{
		label: "Members",
		description: "Manage members and memberships",
		href: "/fair-registration/admin/members",
		icon: UserCog,
	},
	{
		label: "Fair Settings",
		description: "Configure fair name and dates",
		href: "/fair-registration/admin/settings",
		icon: Settings,
	},
	{
		label: "Roles",
		description: "Manage roles and generate time slots",
		href: "/fair-registration/admin/roles",
		icon: Users,
	},
	{
		label: "Registrations",
		description: "View and manage volunteer sign-ups",
		href: "/fair-registration/admin/registrations",
		icon: ClipboardList,
	},
	{
		label: "Schedule",
		description: "Day-by-day schedule print view",
		href: "/fair-registration/admin/schedule",
		icon: CalendarDays,
	},
];

export default async function AdminDashboard() {
	const fair = await getActiveFair();
	const roles = fair ? await getRolesWithSlots(fair.id) : [];

	const totalSlots = roles.reduce((acc, r) => acc + r.slots.length, 0);
	const totalRegistrations = roles.reduce(
		(acc, r) => acc + r.slots.reduce((a, s) => a + s.registrations.length, 0),
		0
	);

	return (
		<AdminLayoutClient>
		<div>
			<h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

			{/* Stats */}
			{fair ? (
				<div className="grid gap-4 md:grid-cols-3 mb-8">
					<div className="rounded-lg border p-4">
						<p className="text-sm text-muted-foreground">Fair</p>
						<p className="text-xl font-semibold">{fair.name}</p>
						<p className="text-sm text-muted-foreground mt-1">
							{new Date(fair.startDate + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })} – {new Date(fair.endDate + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
							{fair.closedDates.length > 0 && ` (${fair.closedDates.length} closed)`}
						</p>
					</div>
					<div className="rounded-lg border p-4">
						<p className="text-sm text-muted-foreground">Roles / Slots</p>
						<p className="text-xl font-semibold">
							{roles.length} roles · {totalSlots} slots
						</p>
					</div>
					<div className="rounded-lg border p-4">
						<p className="text-sm text-muted-foreground">Total Registrations</p>
						<p className="text-xl font-semibold">{totalRegistrations}</p>
					</div>
				</div>
			) : (
				<p className="text-muted-foreground mb-8">
					No fair configured yet. Go to Fair Settings to create one.
				</p>
			)}

			{/* Navigation */}
			<h2 className="text-lg font-semibold mb-3">Manage</h2>
			<div className="grid gap-3 sm:grid-cols-2">
				{adminNavItems.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
					>
						<item.icon className="size-5 text-muted-foreground mt-0.5 shrink-0" />
						<div>
							<p className="font-medium text-sm">{item.label}</p>
							<p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
						</div>
					</Link>
				))}
			</div>
		</div>
		</AdminLayoutClient>
	);
}
