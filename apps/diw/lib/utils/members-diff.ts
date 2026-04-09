/**
 * Diff calculator for member imports
 */

import { MemberData, MemberDiff, DbMember } from "@/lib/types/members";

export function calculateMemberDiff(
  currentUserMemberId: string | undefined,
  csvData: MemberData[],
  currentMembers: DbMember[]
): MemberDiff {
  const currentMembersMap = new Map(
    currentMembers.map((m) => [m.memberId, m])
  );
  const csvMembersMap = new Map(csvData.map((m) => [m.memberId, m]));

  const toAdd: MemberData[] = [];
  const toUpdate: Array<{ old: DbMember; new: MemberData }> = [];
  const toDelete: DbMember[] = [];

  // Check for additions and updates
  for (const csvMember of csvData) {
    const currentMember = currentMembersMap.get(csvMember.memberId);

    if (!currentMember) {
      toAdd.push(csvMember);
    } else if (hasChanges(currentMember, csvMember)) {
      toUpdate.push({ old: currentMember, new: csvMember });
    }
  }

  // Check for deletions
  for (const currentMember of currentMembers) {
    if (!csvMembersMap.has(currentMember.memberId) && currentMember.memberId !== currentUserMemberId) {
      toDelete.push(currentMember);
    }
  }

  return { toAdd, toUpdate, toDelete };
}

function hasChanges(current: DbMember, csv: MemberData): boolean {
  return (
    current.name !== csv.name ||
    current.email !== csv.email ||
    current.membership !== csv.membership ||
    current.address !== csv.address ||
    current.isAdmin !== csv.isAdmin
  );
}
