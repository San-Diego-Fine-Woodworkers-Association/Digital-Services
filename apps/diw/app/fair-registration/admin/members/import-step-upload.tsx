"use client";

import { useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";

export function ImportStepUpload({
  isLoading,
  onFileSelected,
}: {
  isLoading: boolean;
  onFileSelected: (csvContent: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        const cleanContent = content.startsWith("\uFEFF")
          ? content.slice(1)
          : content;
        setSelectedFileName(file.name);
        onFileSelected(cleanContent);
      } else {
        alert("Failed to read file. Please ensure it's a text CSV file.");
      }
    };
    reader.onerror = () => {
      alert("Error reading file. Please try again.");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleClick = () => {
    if (!isLoading) fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Select a CSV file with the following columns:
        </p>
        <div className="bg-muted p-3 rounded-md font-mono text-sm">
          Member ID, Name, Email, Membership, Address, Phone Number, Admin
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isLoading
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-muted/50"
        } ${isDragging ? "border-primary bg-primary/5" : ""}`}
      >
        {selectedFileName ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="size-8 text-blue-500" />
            <p className="font-medium text-sm">{selectedFileName}</p>
            <p className="text-xs text-muted-foreground">
              Click or drop to select a different file
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={`size-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            <p className="font-medium">Drop your CSV file here</p>
            <p className="text-sm text-muted-foreground">or click to select a file</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => {
            setSelectedFileName(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
