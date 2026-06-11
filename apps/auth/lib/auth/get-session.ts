import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function requireMember() {
  const session = await requireAuth();
  if (session.user.kind !== "member") throw new Error("Forbidden");
  return session;
}

export async function requireVolunteer() {
  const session = await requireAuth();
  if (session.user.kind !== "volunteer") throw new Error("Forbidden");
  return session;
}
