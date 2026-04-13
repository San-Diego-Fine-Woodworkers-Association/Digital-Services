import { cacheTag, cacheLife } from "next/cache";
import { eq } from "drizzle-orm";
import { db, rolesTable } from "../db";

export async function getRoleById(roleId: string) {
  "use cache";
  cacheTag("roles");
  cacheLife("minutes");
  return await db.query.rolesTable.findFirst({
    where: (role, { eq }) => eq(role.id, roleId),
    with: {
      slots: true,
    },
  });
}

export async function getAllRegistrations(fairId: string) {
  "use cache";
  cacheTag("registrations");
  cacheLife("minutes");

  const roles = await db.query.rolesTable.findMany({
    where: eq(rolesTable.fairId, fairId),
    with: {
      slots: {
        with: {
          registrations: {
            with: {
              user: true,
            },
          },
        },
      },
    },
  });

  const flat: {
    registrationId: string;
    date: string;
    roleName: string;
    startTime: Date;
    endTime: Date;
    volunteerName: string;
    volunteerEmail: string;
    memberId: string;
  }[] = [];

  for (const role of roles) {
    for (const slot of role.slots) {
      for (const reg of slot.registrations) {
        flat.push({
          registrationId: reg.id,
          date: slot.date,
          roleName: role.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          volunteerName: reg.user.name,
          volunteerEmail: reg.user.email,
          memberId: reg.user.id,
        });
      }
    }
  }

  return flat.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.getTime() - b.startTime.getTime();
  });
}
