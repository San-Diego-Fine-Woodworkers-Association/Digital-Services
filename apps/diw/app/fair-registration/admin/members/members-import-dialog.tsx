"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@sdfwa/ui/components/dialog";
import { DbMember, MemberData, MemberDiff } from "@/lib/types/members";
import { ImportStepUpload } from "./import-step-upload";
import { ImportStepReview } from "./import-step-review";
import { ImportStepSuccess } from "./import-step-success";
import {
  calculateMemberChanges,
  applyMemberChanges,
  getMembersForAdmin,
} from "@/lib/actions/members";
import { parseMembersFromCsv } from "@/lib/utils/members";
import { toast } from "sonner";

type Step = "upload" | "review" | "success" | "error";

export function MembersImportDialog({
  isOpen,
  onOpenChange,
  onImportCompleted,
  currentMembers,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImportCompleted: (members: DbMember[]) => void;
  currentMembers: DbMember[];
}) {
  const [step, setStep] = useState<Step>("upload");
  const [csvData, setCsvData] = useState<MemberData[] | null>(null);
  const [diff, setDiff] = useState<MemberDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (csvContent: string) => {
    setIsLoading(true);
    try {
      const result = parseMembersFromCsv(csvContent);

      if (!result.success || !result.data) {
        setErrorMessage(
          `Failed to parse CSV: ${result.errors
            ?.map((e) => `Row ${e.row} (${e.field}): ${e.message}`)
            .join("; ")}`
        );
        setStep("error");
        return;
      }

      setCsvData(result.data);

      // Calculate diff
      const diffResult = await calculateMemberChanges(result.data);
      setDiff(diffResult);
      setStep("review");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to parse CSV"
      );
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmChanges = async () => {
    if (!diff) return;

    setIsLoading(true);
    try {
      const result = await applyMemberChanges(diff);

      if (!result.success) {
        setErrorMessage(result.error || "Failed to apply changes");
        setStep("error");
        return;
      }

      // Fetch updated members
      const updatedMembers = await getMembersForAdmin();
      onImportCompleted(updatedMembers);
      setStep("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to apply changes"
      );
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (step === "success") {
      // Reset state and close
      setStep("upload");
      setCsvData(null);
      setDiff(null);
      setErrorMessage(null);
      onOpenChange(false);
    } else if (!isLoading) {
      // Allow closing if not loading
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Members</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <ImportStepUpload
            isLoading={isLoading}
            onFileSelected={handleFileSelected}
          />
        )}

        {step === "review" && diff && (
          <ImportStepReview
            diff={diff}
            isLoading={isLoading}
            onBack={() => setStep("upload")}
            onConfirm={handleConfirmChanges}
            currentMembers={currentMembers}
          />
        )}

        {step === "success" && (
          <ImportStepSuccess
            diff={diff}
            onClose={() => handleClose()}
          />
        )}

        {step === "error" && (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setStep("upload")}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                disabled={isLoading}
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                disabled={isLoading}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
