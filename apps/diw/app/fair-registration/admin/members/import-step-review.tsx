"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import { DbMember, MemberDiff } from "@/lib/types/members";

export function ImportStepReview({
  diff,
  isLoading,
  onBack,
  onConfirm,
  currentMembers,
}: {
  diff: MemberDiff | null;
  isLoading: boolean;
  onBack: () => void;
  onConfirm: () => void;
  currentMembers: DbMember[];
}) {
  const [expandedSections, setExpandedSections] = useState({
    add: true,
    update: true,
    delete: false,
  });

  if (!diff) return null;

  const toggleSection = (
    section: "add" | "update" | "delete"
  ) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get current user's ID (this would normally come from session)
  // For now, we'll check via the props passed
  const currentUserMemberId = null; // This should be passed in or determined from session

  // Check if any deletions would affect current user
  const willDeleteCurrentUser = diff.toDelete.some(
    (m) => m.memberId === currentUserMemberId
  );

  return (
    <div className="space-y-4">
      {willDeleteCurrentUser && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex gap-3">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Warning</p>
            <p className="text-sm mt-1">
              You are about to delete your own account. This action cannot be undone.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* Add Section */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection("add")}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              {expandedSections.add ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              <span className="font-medium">
                Will be added ({diff.toAdd.length})
              </span>
            </div>
          </button>
          {expandedSections.add && (
            <div className="border-t px-4 py-2 bg-muted/20">
              {diff.toAdd.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No new members</p>
              ) : (
                <div className="space-y-2 max-h-50 overflow-y-auto">
                  {diff.toAdd.map((member) => (
                    <div key={member.memberId} className="text-sm py-2">
                      <p>{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.memberId} · {member.email} · {member.membership}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Update Section */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection("update")}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              {expandedSections.update ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              <span className="font-medium">
                Will be updated ({diff.toUpdate.length})
              </span>
            </div>
          </button>
          {expandedSections.update && (
            <div className="border-t px-4 py-2 bg-muted/20">
              {diff.toUpdate.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No updates</p>
              ) : (
                <div className="space-y-3 max-h-50 overflow-y-auto">
                  {diff.toUpdate.map(({ old, new: newData }) => (
                    <div key={old.memberId} className="text-sm border-t pt-2 first:border-t-0 first:pt-0">
                      <p className="font-mono">{old.memberId}</p>
                      {old.name !== newData.name && (
                        <p className="text-xs">
                          Name: <span className="line-through text-muted-foreground">{old.name}</span> →{" "}
                          <span className="text-green-600">{newData.name}</span>
                        </p>
                      )}
                      {old.email !== newData.email && (
                        <p className="text-xs">
                          Email: <span className="line-through text-muted-foreground">{old.email}</span> →{" "}
                          <span className="text-green-600">{newData.email}</span>
                        </p>
                      )}
                      {old.membership !== newData.membership && (
                        <p className="text-xs">
                          Membership: <span className="line-through text-muted-foreground">{old.membership}</span> →{" "}
                          <span className="text-green-600">{newData.membership}</span>
                        </p>
                      )}
                      {old.address !== newData.address && (
                        <p className="text-xs">
                          Address: <span className="line-through text-muted-foreground">{old.address}</span> →{" "}
                          <span className="text-green-600">{newData.address}</span>
                        </p>
                      )}
                      {old.isAdmin !== newData.isAdmin && (
                        <p className="text-xs">
                          Admin: <span className="line-through text-muted-foreground">{old.isAdmin ? "Yes" : "No"}</span> →{" "}
                          <span className="text-green-600">{newData.isAdmin ? "Yes" : "No"}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Section */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection("delete")}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              {expandedSections.delete ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              <span className="font-medium">
                Will be deleted ({diff.toDelete.length})
              </span>
            </div>
          </button>
          {expandedSections.delete && (
            <div className="border-t px-4 py-2 bg-destructive/10">
              {diff.toDelete.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No deletions</p>
              ) : (
                <div className="space-y-2 max-h-50 overflow-y-auto">
                  {diff.toDelete.map((member) => (
                    <div key={member.memberId} className="text-sm py-2 text-destructive">
                      <p>{member.name}</p>
                      <p className="text-xs">
                        {member.memberId} · {member.email} · {member.membership}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onConfirm} disabled={isLoading || willDeleteCurrentUser}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
