"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Wand2, Plus, Trash2 } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@sdfwa/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@sdfwa/ui/components/field";
import { Input } from "@sdfwa/ui/components/input";
import { toast } from "@sdfwa/ui/components/sonner";
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
import { updateRole, deleteSlot, addSlot } from "@/lib/actions/admin";
import { SlotGenerator } from "@/components/slot-generator";

interface Slot {
	id: string;
	date: string;
	startTime: Date | string;
	endTime: Date | string;
	numberOfVolunteers: number;
}

interface Role {
	id: string;
	name: string;
	numberOfVolunteers: number;
	slots: Slot[];
}

function formatTime(d: Date | string) {
	return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(d: string) {
	return new Date(d + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function RoleDetailClient({ role, fairStartDate, fairEndDate, fairClosedDates }: { role: Role; fairStartDate: string; fairEndDate: string; fairClosedDates: string[] }) {
	const router = useRouter();

	// Edit dialog state
	const [editOpen, setEditOpen] = useState(false);
	const [editName, setEditName] = useState(role.name);
	const [editVolunteers, setEditVolunteers] = useState(role.numberOfVolunteers);
	const [saving, setSaving] = useState(false);

	// Generate dialog state
	const [generateOpen, setGenerateOpen] = useState(false);

	// Add Slot dialog state
	const [addOpen, setAddOpen] = useState(false);
	const [addDate, setAddDate] = useState("");
	const [addStartTime, setAddStartTime] = useState("");
	const [addEndTime, setAddEndTime] = useState("");
	const [addVolunteers, setAddVolunteers] = useState(role.numberOfVolunteers);
	const [addLoading, setAddLoading] = useState(false);

	// Slot delete state
	const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
	const [deleteSlotTarget, setDeleteSlotTarget] = useState<string | null>(null);

	const editDirty = editName !== role.name || editVolunteers !== role.numberOfVolunteers;

	async function handleUpdateRole(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		await updateRole(role.id, { name: editName, numberOfVolunteers: editVolunteers });
		setSaving(false);
		setEditOpen(false);
		toast.success("Role updated.");
		router.refresh();
	}

	async function handleAddSlot(e: React.FormEvent) {
		e.preventDefault();
		setAddLoading(true);
		await addSlot(role.id, {
			date: addDate,
			startTime: addStartTime,
			endTime: addEndTime,
			numberOfVolunteers: addVolunteers,
		});
		setAddDate("");
		setAddStartTime("");
		setAddEndTime("");
		setAddLoading(false);
		setAddOpen(false);
		toast.success("Slot added.");
		router.refresh();
	}

	async function handleDeleteSlot(slotId: string) {
		setDeleteSlotTarget(null);
		setDeletingSlotId(slotId);
		await deleteSlot(slotId);
		setDeletingSlotId(null);
		toast.success("Slot deleted.");
		router.refresh();
	}

	const sortedSlots = [...role.slots].sort((a, b) => {
		const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
		if (dateCompare !== 0) return dateCompare;
		return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
	});

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
				<h1 className="text-2xl font-bold flex-1">{role.name}</h1>
				<div className="flex gap-2 flex-wrap">
					<Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
						<Pencil className="size-3.5" />
						Edit
					</Button>
					<Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
						<Wand2 className="size-3.5" />
						Generate Slots
					</Button>
					<Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
						<Plus className="size-3.5" />
						Add Slot
					</Button>
				</div>
			</div>

			{/* Role info */}
			<p className="text-sm text-muted-foreground mb-6">
				Default {role.numberOfVolunteers} volunteer{role.numberOfVolunteers !== 1 ? "s" : ""} per slot
				 · {role.slots.length} slot{role.slots.length !== 1 ? "s" : ""} total
			</p>

			{/* Edit Role Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Role</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleUpdateRole}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="editName">Role Name</FieldLabel>
								<Input
									id="editName"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									required
									autoFocus
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="editVolunteers">
									Default Volunteers Per Slot
								</FieldLabel>
								<Input
									id="editVolunteers"
									type="number"
									min={1}
									value={editVolunteers}
									onChange={(e) => setEditVolunteers(Number(e.target.value))}
									required
								/>
							</Field>
						</FieldGroup>
						<DialogFooter className="mt-4">
							<Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={saving || !editDirty}>
								{saving ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Generate Slots Dialog */}
			<Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Generate Slots</DialogTitle>
					</DialogHeader>
					<SlotGenerator
						roleId={role.id}
						defaultVolunteers={role.numberOfVolunteers}
						fairStartDate={fairStartDate}
						fairEndDate={fairEndDate}
						closedDates={fairClosedDates}
						onComplete={() => setGenerateOpen(false)}
					/>
				</DialogContent>
			</Dialog>

			{/* Add Slot Dialog */}
			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Slot</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleAddSlot}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="addDate">Date</FieldLabel>
								<Input
									id="addDate"
									type="date"
									value={addDate}
									onChange={(e) => setAddDate(e.target.value)}
									required
								/>
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="addStart">Start Time</FieldLabel>
									<Input
										id="addStart"
										type="time"
										value={addStartTime}
										onChange={(e) => setAddStartTime(e.target.value)}
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="addEnd">End Time</FieldLabel>
									<Input
										id="addEnd"
										type="time"
										value={addEndTime}
										onChange={(e) => setAddEndTime(e.target.value)}
										required
									/>
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="addVolunteers">Volunteers</FieldLabel>
								<Input
									id="addVolunteers"
									type="number"
									min={1}
									value={addVolunteers}
									onChange={(e) => setAddVolunteers(Number(e.target.value))}
									required
								/>
							</Field>
						</FieldGroup>
						<DialogFooter className="mt-4">
							<Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={addLoading}>
								{addLoading ? "Adding..." : "Add Slot"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Slots List */}
			<h2 className="text-lg font-semibold mb-3">
				Slots ({role.slots.length})
			</h2>
			{sortedSlots.length === 0 ? (
				<p className="text-muted-foreground">No slots yet. Use the buttons above to generate or add slots.</p>
			) : (
				<div className="border rounded-lg overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="text-left font-medium px-3 py-2">Date</th>
								<th className="text-left font-medium px-3 py-2">Time</th>
								<th className="text-left font-medium px-3 py-2">Volunteers</th>
								<th className="w-10 px-3 py-2" />
							</tr>
						</thead>
						<tbody>
							{sortedSlots.map((slot) => (
								<tr key={slot.id} className="border-b last:border-b-0">
									<td className="px-3 py-2 font-medium">{formatDate(slot.date)}</td>
									<td className="px-3 py-2">{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</td>
									<td className="px-3 py-2">{slot.numberOfVolunteers}</td>
									<td className="px-3 py-2 text-right">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setDeleteSlotTarget(slot.id)}
											disabled={deletingSlotId === slot.id}
										>
											<Trash2 className="size-3.5" />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<AlertDialog open={!!deleteSlotTarget} onOpenChange={(open) => { if (!open) setDeleteSlotTarget(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Slot</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this time slot and remove any volunteer registrations associated with it. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => deleteSlotTarget && handleDeleteSlot(deleteSlotTarget)}
						>
							Delete Slot
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
