"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@sdfwa/ui/components/button";
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
import { adminDeleteRegistration } from "@/lib/actions/admin";

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
	return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function RegistrationsClient({
	registrations,
}: {
	registrations: RegistrationRow[];
}) {
	const router = useRouter();
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<RegistrationRow | null>(null);

	async function handleDelete(reg: RegistrationRow) {
		setDeleteTarget(null);
		setDeletingId(reg.registrationId);
		await adminDeleteRegistration(reg.registrationId);
		setDeletingId(null);
		toast.success("Registration deleted.");
		router.refresh();
	}

	return (
		<div>
			<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
				<h1 className="text-2xl font-bold">
					Registrations ({registrations.length})
				</h1>
				<Button variant="outline" asChild>
					<Link href="/api/admin/export">Export CSV</Link>
				</Button>
			</div>

			{registrations.length === 0 ? (
				<p className="text-muted-foreground">No registrations yet.</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b text-left">
								<th className="p-2 font-medium">Date</th>
								<th className="p-2 font-medium">Role</th>
								<th className="p-2 font-medium">Slot</th>
								<th className="p-2 font-medium">Volunteer</th>
								<th className="p-2 font-medium">Email</th>
								<th className="p-2 font-medium">Member ID</th>
								<th className="p-2 font-medium"></th>
							</tr>
						</thead>
						<tbody>
							{registrations.map((reg) => (
								<tr key={reg.registrationId} className="border-b">
									<td className="p-2">{formatDate(reg.date)}</td>
									<td className="p-2">{reg.roleName}</td>
									<td className="p-2">
										{formatTime(reg.startTime)} – {formatTime(reg.endTime)}
									</td>
									<td className="p-2">{reg.volunteerName}</td>
									<td className="p-2">{reg.volunteerEmail}</td>
									<td className="p-2">{reg.memberId}</td>
									<td className="p-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setDeleteTarget(reg)}
											disabled={deletingId === reg.registrationId}
										>
											{deletingId === reg.registrationId ? "..." : "Delete"}
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			<AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Registration</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove {deleteTarget?.volunteerName}&apos;s registration for the {deleteTarget ? formatTime(deleteTarget.startTime) + " – " + formatTime(deleteTarget.endTime) : ""} {deleteTarget?.roleName} slot on {deleteTarget ? formatDate(deleteTarget.date) : ""}. The volunteer will need to re-register if they want this slot back.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => deleteTarget && handleDelete(deleteTarget)}
						>
							Delete Registration
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
