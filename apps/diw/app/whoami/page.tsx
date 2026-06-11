import { cookies } from "next/headers";

import { getServerSession, getCurrentUser } from "@sdfwa/auth-client/server";

export default async function WhoAmIPage() {
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const session = await getServerSession(cookieHeader);
  const user = session ? await getCurrentUser(cookieHeader) : null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 font-mono text-sm">
      <h1 className="text-2xl font-bold">diw · whoami</h1>
      <p className="text-muted-foreground text-xs">
        Reads the SDFWA session from auth.sdfwa.org via @sdfwa/auth-client.
      </p>
      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wide">Session</h2>
        <pre className="bg-muted overflow-x-auto rounded p-3 text-xs">
          {JSON.stringify(session, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wide">User</h2>
        <pre className="bg-muted overflow-x-auto rounded p-3 text-xs">
          {JSON.stringify(user, null, 2)}
        </pre>
      </section>
    </main>
  );
}
