/**
 * Generates Google Calendar and iCal (.ics) links for a volunteer shift.
 */

interface CalendarEventInput {
	title: string;
	date: string; // YYYY-MM-DD
	startTime: Date | string;
	endTime: Date | string;
	description?: string;
}

function toUTCString(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return (
		d.getUTCFullYear().toString() +
		pad(d.getUTCMonth() + 1) +
		pad(d.getUTCDate()) +
		"T" +
		pad(d.getUTCHours()) +
		pad(d.getUTCMinutes()) +
		pad(d.getUTCSeconds()) +
		"Z"
	);
}

export function getGoogleCalendarUrl(event: CalendarEventInput): string {
	const start = toUTCString(new Date(event.startTime));
	const end = toUTCString(new Date(event.endTime));
	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: event.title,
		dates: `${start}/${end}`,
	});
	if (event.description) {
		params.set("details", event.description);
	}
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile(event: CalendarEventInput): void {
	const start = toUTCString(new Date(event.startTime));
	const end = toUTCString(new Date(event.endTime));
	const now = toUTCString(new Date());
	const uid = `${event.date}-${start}-${Math.random().toString(36).slice(2)}@sdfwa`;

	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//SDFWA//DIW//EN",
		"BEGIN:VEVENT",
		`DTSTART:${start}`,
		`DTEND:${end}`,
		`DTSTAMP:${now}`,
		`UID:${uid}`,
		`SUMMARY:${event.title}`,
		...(event.description ? [`DESCRIPTION:${event.description}`] : []),
		"END:VEVENT",
		"END:VCALENDAR",
	];

	const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
