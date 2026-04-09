export const dynamic = "force-dynamic";

import { getMembersForAdmin } from "@/lib/actions/members";
import { getServerSession } from "@/lib/auth/get-session";
import { AdminLayoutClient } from "../admin-layout-client";
import { MembersPageClient } from "./members-page-client";

export default async function MembersPage() {
  const [members, session] = await Promise.all([
    getMembersForAdmin(),
    getServerSession(),
  ]);

  const currentUserMemberId = session?.user?.memberId;

  return (
    <AdminLayoutClient breadcrumbOverrides={{ members: "Members" }}>
      <MembersPageClient
        initialMembers={members}
        currentUserMemberId={currentUserMemberId}
      />
    </AdminLayoutClient>
  );
}
