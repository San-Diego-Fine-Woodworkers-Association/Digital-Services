"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import { MemberDiff } from "@/lib/types/members";

export function ImportStepSuccess({
  diff,
  onClose,
}: {
  diff: MemberDiff | null;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 text-center py-6">
      <div className="flex justify-center">
        <CheckCircle2 className="size-12 text-green-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Import Successful</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Members have been updated successfully
        </p>
      </div>

      {diff && (
        <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
          <p className="flex justify-between">
            <span>Added:</span>
            <span className="font-medium">{diff.toAdd.length}</span>
          </p>
          <p className="flex justify-between">
            <span>Updated:</span>
            <span className="font-medium">{diff.toUpdate.length}</span>
          </p>
          <p className="flex justify-between">
            <span>Deleted:</span>
            <span className="font-medium text-destructive">{diff.toDelete.length}</span>
          </p>
        </div>
      )}

      <Button onClick={onClose} className="w-full mt-6">
        Close
      </Button>
    </div>
  );
}
