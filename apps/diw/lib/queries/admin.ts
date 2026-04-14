import { cacheTag, cacheLife } from "next/cache";
import { eq } from "drizzle-orm";
import { db, rolesTable, userSettingsTable } from "../db";

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

  const [roles, settings] = await Promise.all([
    db.query.rolesTable.findMany({
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
    }),
    db.query.userSettingsTable.findMany({
      where: (us, { eq, and }) => and(
        eq(us.fairId, fairId),
        eq(us.contactValidated, true)
      ),
    }),
  ]);

  const validatedMemberIds = new Set(settings.map((s) => s.memberId));

  const flat: {
    registrationId: string;
    date: string;
    roleName: string;
    startTime: Date;
    endTime: Date;
    volunteerName: string;
    volunteerEmail: string;
    memberId: string;
    contactValidated: boolean;
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
          contactValidated: reg.user.memberId ? validatedMemberIds.has(reg.user.memberId) : false,
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
