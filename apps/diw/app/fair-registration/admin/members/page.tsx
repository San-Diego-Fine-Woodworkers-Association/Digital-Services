import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@sdfwa/ui/components/skeleton";
import { getMembersForAdmin } from "@/lib/actions/members";
import { getActiveFair } from "@/lib/actions/fair";
import { getServerSession } from "@/lib/auth/get-session";
import { AdminLayoutClient } from "../admin-layout-client";
import { MembersPageClient } from "./members-page-client";

async function MembersContent() {
  await connection();

  const [fair, session] = await Promise.all([
    getActiveFair(),
    getServerSession(),
  ]);

  const members = await getMembersForAdmin(fair?.id);
  const currentUserMemberId = session?.user?.memberId;

  return (
    <MembersPageClient
      initialMembers={members}
      currentUserMemberId={currentUserMemberId}
      fairId={fair?.id}
    />
  );
}

function MembersFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function MembersPage() {
  return (
    <AdminLayoutClient breadcrumbOverrides={{ members: "Members" }}>
      <Suspense fallback={<MembersFallback />}>
        <MembersContent />
      </Suspense>
    </AdminLayoutClient>
  );
}
