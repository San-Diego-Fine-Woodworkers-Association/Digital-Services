"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@sdfwa/ui/components/dialog";
import { DbMember, MemberDiff } from "@/lib/types/members";
import { ImportStepUpload } from "./import-step-upload";
import { ImportStepReview } from "./import-step-review";
import { ImportStepSuccess } from "./import-step-success";
import {
  uploadAndCalculateMemberChanges,
  uploadAndApplyMemberChanges,
  getMembersForAdmin,
} from "@/lib/actions/members";

type Step = "upload" | "review" | "success" | "error";

export function MembersImportDialog({
  isOpen,
  onOpenChange,
  onImportCompleted,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImportCompleted: (members: DbMember[]) => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [diff, setDiff] = useState<MemberDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (content: string) => {
    setIsLoading(true);
    try {
      setCsvContent(content);

      const result = await uploadAndCalculateMemberChanges(content);

      if ("error" in result) {
        setErrorMessage(result.error);
        setStep("error");
        return;
      }

      setDiff(result.diff);
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
    if (!csvContent) return;

    setIsLoading(true);
    try {
      // Re-send the CSV to the server for re-validation and application
      const result = await uploadAndApplyMemberChanges(csvContent);

      if (!result.success) {
        setErrorMessage(result.error || "Failed to apply changes");
        setStep("error");
        return;
      }

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
      setStep("upload");
      setCsvContent(null);
      setDiff(null);
      setErrorMessage(null);
      onOpenChange(false);
    } else if (!isLoading) {
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
          />
        )}

        {step === "success" && (
          <ImportStepSuccess diff={diff} onClose={() => handleClose()} />
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
