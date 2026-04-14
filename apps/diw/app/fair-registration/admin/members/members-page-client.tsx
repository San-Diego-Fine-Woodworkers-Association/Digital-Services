"use client";

import { useState } from "react";
import { Button } from "@sdfwa/ui/components/button";
import { Upload, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { DbMember } from "@/lib/types/members";
import {
  deleteSingleMember,
  getMembersForAdmin,
  bulkDeleteMembers,
  bulkMakeAdmin,
} from "@/lib/actions/members";
import { MembersTable } from "./members-table";
import { MembersEditDialog } from "./members-edit-dialog";
import { MembersImportDialog } from "./members-import-dialog";

export function MembersPageClient({
  initialMembers,
  currentUserMemberId,
  fairId,
}: {
  initialMembers: DbMember[];
  currentUserMemberId?: string;
  fairId?: string;
}) {
  const [members, setMembers] = useState<DbMember[]>(initialMembers);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set()
  );
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const editingMember = editingMemberId
    ? members.find((m) => m.memberId === editingMemberId)
    : null;

  const handleMemberUpdated = (updatedMember: DbMember) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.memberId === updatedMember.memberId ? updatedMember : m
      )
    );
    setEditingMemberId(null);
  };

  const handleMemberDeleted = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
    setEditingMemberId(null);
  };

  const handleImportCompleted = (updatedMembers: DbMember[]) => {
    setMembers(updatedMembers);
    setShowImportDialog(false);
  };

  const handleRowClick = (memberId: string) => {
    setEditingMemberId(memberId);
  };

  const handleToggleSelection = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableMembers = members
        .filter((m) => m.memberId !== currentUserMemberId)
        .map((m) => m.memberId);
      setSelectedMemberIds(new Set(selectableMembers));
    } else {
      setSelectedMemberIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const selectedCount = selectedMemberIds.size;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedCount} member${selectedCount > 1 ? "s" : ""}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkLoading(true);
    try {
      const result = await bulkDeleteMembers(Array.from(selectedMemberIds));

      const updatedMembers = await getMembersForAdmin(fairId);
      setMembers(updatedMembers);
      setSelectedMemberIds(new Set());

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to delete members");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete members"
      );
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkMakeAdmin = async () => {
    setIsBulkLoading(true);
    try {
      const nonAdminIds = Array.from(selectedMemberIds).filter((id) => {
        const member = members.find((m) => m.memberId === id);
        return member && !member.isAdmin;
      });

      const result = await bulkMakeAdmin(nonAdminIds);

      const updatedMembers = await getMembersForAdmin(fairId);
      setMembers(updatedMembers);
      setSelectedMemberIds(new Set());

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update members");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update members"
      );
    } finally {
      setIsBulkLoading(false);
    }
  };

  const selectedCount = selectedMemberIds.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-2">
            Manage members and their memberships
          </p>
        </div>
        <Button
          onClick={() => setShowImportDialog(true)}
          className="gap-2 shrink-0"
        >
          <Upload className="size-4" />
          Import CSV
        </Button>
      </div>

      {hasSelection && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted p-4 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedCount} member{selectedCount > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMakeAdmin}
              disabled={isBulkLoading}
              className="gap-2"
            >
              <Shield className="size-4" />
              Make Admin
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isBulkLoading}
              className="gap-2"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <MembersTable
        members={members}
        selectedMemberIds={selectedMemberIds}
        currentUserMemberId={currentUserMemberId}
        onRowClick={handleRowClick}
        onToggleSelection={handleToggleSelection}
        onToggleSelectAll={handleToggleSelectAll}
      />

      {editingMember && (
        <MembersEditDialog
          member={editingMember}
          isOpen={!!editingMemberId}
          onOpenChange={(open) => !open && setEditingMemberId(null)}
          onMemberUpdated={handleMemberUpdated}
          onMemberDeleted={handleMemberDeleted}
        />
      )}

      {showImportDialog && (
        <MembersImportDialog
          isOpen={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportCompleted={handleImportCompleted}
        />
      )}
    </div>
  );
}
