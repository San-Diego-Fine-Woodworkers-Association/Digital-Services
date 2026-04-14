"use client";

import { Checkbox } from "@sdfwa/ui/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sdfwa/ui/components/table";
import { DbMember } from "@/lib/types/members";

export function MembersTable({
  members,
  selectedMemberIds,
  currentUserMemberId,
  onRowClick,
  onToggleSelection,
  onToggleSelectAll,
}: {
  members: DbMember[];
  selectedMemberIds: Set<string>;
  currentUserMemberId?: string;
  onRowClick: (memberId: string) => void;
  onToggleSelection: (memberId: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
}) {
  const selectableMembers = members.filter(
    (m) => m.memberId !== currentUserMemberId
  );
  const allSelected =
    selectableMembers.length > 0 &&
    selectedMemberIds.size === selectableMembers.length;
  const someSelected =
    selectedMemberIds.size > 0 &&
    selectedMemberIds.size < selectableMembers.length;

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected || someSelected}
                indeterminate={someSelected && !allSelected}
                onCheckedChange={(checked) => onToggleSelectAll(Boolean(checked))}
              />
            </TableHead>
            <TableHead>Member ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Membership</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-12 text-right">Admin</TableHead>
            <TableHead className="w-16 text-right">Verified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                <p className="text-muted-foreground">No members found</p>
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => {
              const isCurrentUser = member.memberId === currentUserMemberId;
              return (
              <TableRow
                key={member.memberId}
                className={`${isCurrentUser ? "opacity-60" : "cursor-pointer hover:bg-muted/50"}`}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {isCurrentUser ? (
                    <div
                      className="h-4 w-4 rounded border border-input bg-muted"
                      title="Cannot select current user"
                    />
                  ) : (
                    <Checkbox
                      checked={selectedMemberIds.has(member.memberId)}
                      onCheckedChange={() => onToggleSelection(member.memberId)}
                    />
                  )}
                </TableCell>
                <TableCell
                  onClick={() => onRowClick(member.memberId)}
                  className="font-mono text-sm"
                >
                  {member.memberId}
                </TableCell>
                <TableCell onClick={() => onRowClick(member.memberId)}>
                  {member.name}
                </TableCell>
                <TableCell
                  onClick={() => onRowClick(member.memberId)}
                  className="text-sm"
                >
                  {member.email}
                </TableCell>
                <TableCell onClick={() => onRowClick(member.memberId)}>
                  {member.membership}
                </TableCell>
                <TableCell
                  onClick={() => onRowClick(member.memberId)}
                  className="text-sm text-muted-foreground truncate max-w-xs"
                >
                  {member.address}
                </TableCell>
                <TableCell
                  onClick={() => onRowClick(member.memberId)}
                  className="text-sm text-muted-foreground"
                >
                  {member.phone || "—"}
                </TableCell>
                <TableCell className="text-center text-right">
                  {member.isAdmin ? (
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
                  ) : (
                    <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" />
                  )}
                </TableCell>
                <TableCell className="text-center text-right">
                  {member.contactValidated ? (
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                  ) : (
                    <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" />
                  )}
                </TableCell>
              </TableRow>
            );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
