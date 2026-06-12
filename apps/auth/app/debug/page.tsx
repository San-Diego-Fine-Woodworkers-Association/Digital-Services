import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { readDeviceId } from "@/lib/auth/device-id";
import { getServerSession } from "@/lib/auth/get-session";
import { db, trustedDevicesTable, user as userTable, volunteersTable } from "@/lib/db";

import { SignOutButton } from "./sign-out-button";

export default async function AuthDebug() {
  const { NODE_ENV } = process.env;
  if (NODE_ENV === "production") notFound();

  const session = await getServerSession();
  const deviceId = await readDeviceId();

  let trustedDevices: typeof trustedDevicesTable.$inferSelect[] = [];
  let volunteer: typeof volunteersTable.$inferSelect | null = null;
  let dbUser: typeof userTable.$inferSelect | null = null;

  if (session?.user?.id) {
    trustedDevices = await db
      .select()
      .from(trustedDevicesTable)
      .where(eq(trustedDevicesTable.userId, session.user.id));
    dbUser =
      (
        await db
          .select()
          .from(userTable)
          .where(eq(userTable.id, session.user.id))
      )[0] ?? null;
    volunteer =
      (
        await db
          .select()
          .from(volunteersTable)
          .where(eq(volunteersTable.userId, session.user.id))
      )[0] ?? null;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 font-mono text-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Auth debug</h1>
        <p className="text-muted-foreground text-xs">
          Dev-only page. Not mounted in production.
        </p>
        <nav className="flex gap-3 text-xs">
          <a className="underline" href="/login">
            /login
          </a>
          <SignOutButton />
        </nav>
      </header>

      <Section title="Session">
        {session ? <Pre value={session} /> : <p>(not signed in)</p>}
      </Section>

      <Section title="Device cookie">
        <Pre value={{ deviceId: deviceId ?? "(none / tampered)" }} />
      </Section>

      {session?.user?.id && (
        <>
          <Section title="user row (DB)">
            <Pre value={dbUser} />
          </Section>
          <Section title="trusted_devices">
            <Pre value={trustedDevices} />
          </Section>
          <Section title="volunteers row">
            <Pre value={volunteer ?? "(none)"} />
          </Section>
        </>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Pre({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
