"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@sdfwa/ui/components/table";
import { toast } from "@sdfwa/ui/components/sonner";
import { adminDeleteRegistration } from "@/lib/actions/admin";
import { AdminRegisterDialog } from "./admin-register-dialog";

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

interface RoleWithSlots {
	id: string;
	name: string;
	numberOfVolunteers: number;
	fairId: string;
	slots: {
		id: string;
		date: string;
		startTime: Date | string;
		endTime: Date | string;
		numberOfVolunteers: number;
		registrations: { id: string }[];
	}[];
}

function formatTime(d: Date | string) {
	return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(d: string) {
	return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function RegistrationsClient({
	registrations,
	roles,
}: {
	registrations: RegistrationRow[];
	roles: RoleWithSlots[];
}) {
	const router = useRouter();
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<RegistrationRow | null>(null);
	const [showRegisterDialog, setShowRegisterDialog] = useState(false);

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
				<div className="flex gap-2">
					<Button onClick={() => setShowRegisterDialog(true)} className="gap-2">
						<Plus className="size-4" />
						Register Member
					</Button>
					<Button variant="outline" asChild>
						<Link href="/api/admin/export">Export CSV</Link>
					</Button>
				</div>
			</div>

			{registrations.length === 0 ? (
				<p className="text-muted-foreground">No registrations yet.</p>
			) : (
				<div className="rounded-lg border bg-card overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Slot</TableHead>
								<TableHead>Volunteer</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Member ID</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{registrations.map((reg) => (
								<TableRow key={reg.registrationId}>
									<TableCell>{formatDate(reg.date)}</TableCell>
									<TableCell>{reg.roleName}</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatTime(reg.startTime)} – {formatTime(reg.endTime)}
									</TableCell>
									<TableCell>{reg.volunteerName}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{reg.volunteerEmail}</TableCell>
									<TableCell className="font-mono text-sm">{reg.memberId}</TableCell>
									<TableCell>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setDeleteTarget(reg)}
											disabled={deletingId === reg.registrationId}
										>
											{deletingId === reg.registrationId ? "..." : "Delete"}
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
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
			<AdminRegisterDialog
				open={showRegisterDialog}
				onOpenChange={setShowRegisterDialog}
				roles={roles}
			/>
		</div>
	);
}
