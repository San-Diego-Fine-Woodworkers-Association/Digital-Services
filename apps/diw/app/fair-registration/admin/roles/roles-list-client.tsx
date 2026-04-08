"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@sdfwa/ui/components/button";
import { Card, CardContent } from "@sdfwa/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@sdfwa/ui/components/dialog";
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
import { Field, FieldGroup, FieldLabel } from "@sdfwa/ui/components/field";
import { Input } from "@sdfwa/ui/components/input";
import { toast } from "@sdfwa/ui/components/sonner";
import { createRoleForFair, deleteRole } from "@/lib/actions/admin";

interface RoleWithSlots {
	id: string;
	name: string;
	numberOfVolunteers: number;
	slots: { id: string; registrations: { id: string }[] }[];
}

interface RolesListClientProps {
	fairId: string;
	roles: RoleWithSlots[];
}

export function RolesListClient({ fairId, roles }: RolesListClientProps) {
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [name, setName] = useState("");
	const [numberOfVolunteers, setNumberOfVolunteers] = useState(4);
	const [loading, setLoading] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<RoleWithSlots | null>(null);

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		const result = await createRoleForFair(fairId, { name, numberOfVolunteers });
		setName("");
		setNumberOfVolunteers(4);
		setDialogOpen(false);
		setLoading(false);
		toast.success("Role created.");
		if (result?.id) {
			router.push(`/fair-registration/admin/roles/${result.id}`);
		}
		router.refresh();
	}

	async function handleDelete(roleId: string) {
		setDeleteTarget(null);
		setDeletingId(roleId);
		await deleteRole(roleId);
		setDeletingId(null);
		toast.success("Role deleted.");
		router.refresh();
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Roles</h1>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<Button onClick={() => setDialogOpen(true)}>
						<Plus className="size-4" />
						Create Role
					</Button>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Role</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreate}>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="roleName">Role Name</FieldLabel>
									<Input
										id="roleName"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Floor Walkers"
										required
										autoFocus
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="volunteers">
										Default Volunteers Per Slot
									</FieldLabel>
									<Input
										id="volunteers"
										type="number"
										min={1}
										value={numberOfVolunteers}
										onChange={(e) =>
											setNumberOfVolunteers(Number(e.target.value))
										}
										required
									/>
								</Field>
							</FieldGroup>
							<DialogFooter className="mt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => setDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={loading}>
									{loading ? "Creating..." : "Create Role"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{roles.length === 0 ? (
				<p className="text-muted-foreground">No roles created yet.</p>
			) : (
				<div className="flex flex-col gap-3">
					{roles.map((role) => {
						const totalRegs = role.slots.reduce(
							(a, s) => a + s.registrations.length,
							0
						);
						return (
							<Card key={role.id}>
								<CardContent className="p-4 flex items-center justify-between gap-4">
									<Link
										href={`/fair-registration/admin/roles/${role.id}`}
										className="flex-1"
									>
										<span className="font-medium">{role.name}</span>
										<span className="text-muted-foreground ml-3 text-sm">
											{role.slots.length} slot
											{role.slots.length !== 1 ? "s" : ""} · {totalRegs}{" "}
											registration{totalRegs !== 1 ? "s" : ""}
										</span>
									</Link>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setDeleteTarget(role)}
										disabled={deletingId === role.id}
									>
										<Trash2 className="size-3.5" />
										{deletingId === role.id ? "Deleting..." : "Delete"}
									</Button>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
			<AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Role</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete the &ldquo;{deleteTarget?.name}&rdquo; role along with all of its slots and any volunteer registrations. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: "destructive" })}
							onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
						>
							Delete Role
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
