import { requireAdmin } from "@/lib/auth/get-session";
import { getActiveFair } from "@/lib/actions/fair";
import { getAllRegistrations } from "@/lib/queries/admin";

function formatTime(d: Date | string) {
	return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function escapeCSV(value: string) {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export async function GET() {
	try {
		await requireAdmin();
	} catch {
		return new Response("Unauthorized", { status: 401 });
	}

	const fair = await getActiveFair();
	if (!fair) {
		return new Response("No active fair", { status: 404 });
	}

	const registrations = await getAllRegistrations(fair.id);

	const headers = ["Date", "Role Name", "Slot", "Volunteer Name", "Volunteer Email", "Member ID", "Contact Verified"];
	const rows = registrations.map((reg) => [
		reg.date,
		reg.roleName,
		`${formatTime(reg.startTime)} – ${formatTime(reg.endTime)}`,
		reg.volunteerName,
		reg.volunteerEmail,
		reg.memberId,
		reg.contactValidated ? "Yes" : "No",
	]);

	const csv = [
		headers.map(escapeCSV).join(","),
		...rows.map((row) => row.map(escapeCSV).join(",")),
	].join("\n");

	return new Response(csv, {
		headers: {
			"Content-Type": "text/csv",
			"Content-Disposition": `attachment; filename="fair-registrations.csv"`,
		},
	});
}
