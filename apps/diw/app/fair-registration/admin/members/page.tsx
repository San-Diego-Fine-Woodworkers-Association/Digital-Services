import { getMembersForAdmin } from "@/lib/actions/members";
import { getActiveFair } from "@/lib/actions/fair";
import { getServerSession } from "@/lib/auth/get-session";
import { AdminLayoutClient } from "../admin-layout-client";
import { MembersPageClient } from "./members-page-client";

export default async function MembersPage() {
  const [fair, session] = await Promise.all([
    getActiveFair(),
    getServerSession(),
  ]);

  const members = await getMembersForAdmin(fair?.id);
  const currentUserMemberId = session?.user?.memberId;

  return (
    <AdminLayoutClient breadcrumbOverrides={{ members: "Members" }}>
      <MembersPageClient
        initialMembers={members}
        currentUserMemberId={currentUserMemberId}
        fairId={fair?.id}
      />
    </AdminLayoutClient>
  );
}
