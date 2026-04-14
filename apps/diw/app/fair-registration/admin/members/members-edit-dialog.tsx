"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@sdfwa/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@sdfwa/ui/components/dialog";
import { Input } from "@sdfwa/ui/components/input";
import { Label } from "@sdfwa/ui/components/label";
import { Checkbox } from "@sdfwa/ui/components/checkbox";
import { toast } from "sonner";
import { DbMember, MemberData } from "@/lib/types/members";
import {
  deleteSingleMember,
  updateSingleMember,
} from "@/lib/actions/members";

export function MembersEditDialog({
  member,
  isOpen,
  onOpenChange,
  onMemberUpdated,
  onMemberDeleted,
}: {
  member: DbMember;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberUpdated: (member: DbMember) => void;
  onMemberDeleted: (memberId: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<Partial<MemberData>>({
    name: member.name,
    email: member.email,
    membership: member.membership,
    address: member.address,
    phone: member.phone,
    isAdmin: member.isAdmin,
  });

  const handleInputChange = (
    field: keyof Omit<MemberData, "memberId">,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateSingleMember(member.memberId, formData);

      if (!result.success) {
        toast.error(result.error || "Failed to update member");
        return;
      }

      const updatedMember: DbMember = {
        ...member,
        name: formData.name ?? member.name,
        email: formData.email ?? member.email,
        membership: formData.membership ?? member.membership,
        address: formData.address ?? member.address,
        phone: formData.phone ?? member.phone,
        isAdmin: formData.isAdmin ?? member.isAdmin,
      };
      onMemberUpdated(updatedMember);
      toast.success("Member updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update member"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${member.name}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteSingleMember(member.memberId);

      if (!result.success) {
        toast.error(result.error || "Failed to delete member");
        return;
      }

      onMemberDeleted(member.memberId);
      toast.success("Member deleted successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete member"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="memberId">Member ID</Label>
            <Input
              id="memberId"
              value={member.memberId}
              disabled
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cannot be changed
            </p>
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Full name"
              className="mt-1"
              disabled={isLoading || isDeleting}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="email@example.com"
              className="mt-1"
              disabled={isLoading || isDeleting}
            />
          </div>

          <div>
            <Label htmlFor="membership">Membership</Label>
            <Input
              id="membership"
              value={formData.membership || ""}
              onChange={(e) => handleInputChange("membership", e.target.value)}
              placeholder="e.g., Standard, Premium"
              className="mt-1"
              disabled={isLoading || isDeleting}
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Street address"
              className="mt-1"
              disabled={isLoading || isDeleting}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="(555) 555-5555"
              className="mt-1"
              disabled={isLoading || isDeleting}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="admin"
              checked={formData.isAdmin || false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("isAdmin", e.target.checked)
              }
              disabled={isLoading || isDeleting}
            />
            <Label htmlFor="admin" className="cursor-pointer">
              Admin
            </Label>
          </div>
        </div>

        <div className="flex gap-2 justify-between pt-6">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || isDeleting}
            >
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
