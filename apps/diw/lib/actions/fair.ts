import { cacheTag, cacheLife } from "next/cache";
import { db } from "../db";

export async function getActiveFair() {
  "use cache";
  cacheTag("fair");
  cacheLife("days");
  return await db.query.fairDetailsTable.findFirst({
    orderBy: (fair, { desc }) => desc(fair.startDate),
  });
}

export async function getRolesWithSlots(fairId: string) {
  "use cache";
  cacheTag("roles");
  cacheLife("minutes");
  return await db.query.rolesTable.findMany({
    where: (role, { eq }) => eq(role.fairId, fairId),
    with: {
      slots: {
        with: {
          registrations: true,
        },
      },
    },
  });
}
