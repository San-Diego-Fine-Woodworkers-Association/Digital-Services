import { eq } from "drizzle-orm";

import { readDeviceId } from "@/lib/auth/device-id";
import { getServerSession } from "@/lib/auth/get-session";
import { db, trustedDevicesTable, user as userTable, volunteersTable } from "@/lib/db";

export default async function WhoAmI() {
  const session = await getServerSession();
  const deviceId = await readDeviceId();

  let trustedDevices: Array<{
    deviceId: string;
    issuedAt: Date;
    lastSeenAt: Date;
    userAgent: string | null;
  }> = [];
  let volunteer: typeof volunteersTable.$inferSelect | null = null;
  let dbUser: typeof userTable.$inferSelect | null = null;

  if (session?.user?.id) {
    const rows = await db
      .select()
      .from(trustedDevicesTable)
      .where(eq(trustedDevicesTable.userId, session.user.id));
    trustedDevices = rows.map((d) => ({
      deviceId: maskId(d.deviceId),
      issuedAt: d.issuedAt,
      lastSeenAt: d.lastSeenAt,
      userAgent: d.userAgent,
    }));
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

  const safeSession = session
    ? {
        user: session.user,
        session: redactSession(session.session),
      }
    : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 font-mono text-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Who am I?</h1>
        <p className="text-muted-foreground text-xs">
          Identity attached to the cookies on this request. Credentials are
          redacted; device identifiers are masked.
        </p>
      </header>

      <Section title="Session">
        {safeSession ? <Pre value={safeSession} /> : <p>(not signed in)</p>}
      </Section>

      <Section title="Device cookie">
        <Pre value={{ deviceId: deviceId ? maskId(deviceId) : "(none / tampered)" }} />
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

// Session tokens and session IDs are bearer-equivalent in better-auth — never render them.
function redactSession(s: unknown): unknown {
  if (!s || typeof s !== "object") return s;
  const { token: _t, id: _i, ...rest } = s as Record<string, unknown>;
  return rest;
}

function maskId(id: string): string {
  if (id.length <= 8) return "…";
  return `${id.slice(0, 8)}…`;
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
