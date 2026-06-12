import { cookies } from "next/headers";

import { requireGroup } from "@sdfwa/auth-client/server";

const REQUIRED_GROUP = "tech-admin";

export default async function AdminOnlyPage() {
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const session = await requireGroup(cookieHeader, REQUIRED_GROUP);
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6 font-mono text-sm">
        <h1 className="text-2xl font-bold">diw · admin-only</h1>
        <p className="text-xs">
          You are in <code>{REQUIRED_GROUP}</code>.
        </p>
        <pre className="bg-muted overflow-x-auto rounded p-3 text-xs">
          {JSON.stringify(session.user.groups, null, 2)}
        </pre>
      </main>
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown";
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6 font-mono text-sm">
        <h1 className="text-2xl font-bold">diw · admin-only</h1>
        <p className="text-destructive text-xs">
          {reason === "Unauthorized"
            ? "Not signed in."
            : `Forbidden — requires ${REQUIRED_GROUP}.`}
        </p>
      </main>
    );
  }
}
