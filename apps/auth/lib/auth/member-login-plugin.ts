import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth/types";
import { and, eq, gt, isNull } from "drizzle-orm";

import {
  db,
  magicLinkTokensTable,
  proclassUsersTable,
  trustedDevicesTable,
  user as userTable,
} from "@/lib/db";
import { sendMagicLink } from "@/lib/email/resend";

import { getOrCreateDeviceId } from "./device-id";
import {
  MAGIC_LINK_TTL_MS,
  TRUSTED_DEVICE_TTL_MS,
  buildConfirmUrl,
  generateToken,
  hashToken,
  isExpired,
} from "./magic-link";
import { checkLimit } from "./rate-limit";

const RATE_PER_EMAIL = { max: 5, windowMs: 15 * 60 * 1000 };
const RATE_PER_IP = { max: 20, windowMs: 15 * 60 * 1000 };

function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

async function upsertTrustedDevice(
  userId: string,
  deviceId: string,
  now: Date,
  userAgent: string | null,
) {
  await db
    .insert(trustedDevicesTable)
    .values({
      userId,
      deviceId,
      issuedAt: now,
      lastSeenAt: now,
      userAgent,
    })
    .onConflictDoUpdate({
      target: [trustedDevicesTable.userId, trustedDevicesTable.deviceId],
      set: { issuedAt: now, lastSeenAt: now, userAgent },
    });
}

const SUCCESS_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Signed in</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa}main{max-width:480px;padding:32px;background:white;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center}h1{margin:0 0 12px;font-size:20px}p{color:#444;margin:0}</style>
</head><body><main><h1>You're signed in</h1><p>You can close this tab — your original device will continue automatically.</p></main></body></html>`;

function errorHtml(message: string): string {
  const safe = message.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
  return `<!doctype html><html><head><meta charset="utf-8"><title>Sign-in error</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa}main{max-width:480px;padding:32px;background:white;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center}h1{margin:0 0 12px;font-size:20px;color:#b00}p{color:#444;margin:0}</style>
</head><body><main><h1>Couldn't confirm sign-in</h1><p>${safe}</p></main></body></html>`;
}

export const memberLoginPlugin = () => {
  return {
    id: "member-login",
    endpoints: {
      signInMember: createAuthEndpoint(
        "/sign-in/member",
        { method: "POST" },
        async (ctx) => {
          const { email, memberId } = ctx.body as {
            email?: string;
            memberId?: string;
          };
          if (!email || !memberId) {
            throw new APIError("BAD_REQUEST", {
              message: "Email and Member ID are required",
            });
          }

          const ip = clientIp(ctx.request?.headers ?? new Headers());
          const ipLimit = checkLimit(`ip:${ip}`, RATE_PER_IP.max, RATE_PER_IP.windowMs);
          const emailLimit = checkLimit(
            `email:${email.toLowerCase()}`,
            RATE_PER_EMAIL.max,
            RATE_PER_EMAIL.windowMs,
          );
          if (!ipLimit.ok || !emailLimit.ok) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: "Too many sign-in attempts. Try again later.",
            });
          }

          const [member] = await db
            .select()
            .from(proclassUsersTable)
            .where(
              and(
                eq(proclassUsersTable.email, email),
                eq(proclassUsersTable.memberId, memberId),
                eq(proclassUsersTable.active, true),
              ),
            );
          if (!member) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or member ID",
            });
          }

          type MemberUser = {
            id: string;
            email: string;
            name: string;
            emailVerified: boolean;
            createdAt: Date;
            updatedAt: Date;
            image?: string | null;
            accountOrigin?: string | null;
            memberId?: string | null;
            membership?: string | null;
          };

          const existing = (await ctx.context.internalAdapter
            .findUserByEmail(email)
            .then((res) => res?.user)) as MemberUser | undefined;

          let user: MemberUser;
          if (!existing) {
            user = (await ctx.context.internalAdapter.createUser({
              email: member.email,
              name:
                [member.firstName, member.lastName].filter(Boolean).join(" ") ||
                member.email,
              accountOrigin: "proclass",
              memberId: member.memberId,
              membership: member.membership,
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as unknown as Parameters<typeof ctx.context.internalAdapter.createUser>[0])) as MemberUser;
          } else {
            user = existing;
            if (
              user.accountOrigin !== "proclass" ||
              user.memberId !== member.memberId ||
              user.membership !== member.membership
            ) {
              await ctx.context.internalAdapter.updateUser(user.id, {
                accountOrigin: "proclass",
                memberId: member.memberId,
                membership: member.membership,
              } as unknown as Parameters<typeof ctx.context.internalAdapter.updateUser>[1]);
              user = {
                ...user,
                accountOrigin: "proclass",
                memberId: member.memberId,
                membership: member.membership,
              };
            }
          }

          const deviceId = await getOrCreateDeviceId();
          const now = new Date();

          const [trusted] = await db
            .select()
            .from(trustedDevicesTable)
            .where(
              and(
                eq(trustedDevicesTable.userId, user.id),
                eq(trustedDevicesTable.deviceId, deviceId),
                gt(
                  trustedDevicesTable.issuedAt,
                  new Date(now.getTime() - TRUSTED_DEVICE_TTL_MS),
                ),
              ),
            );

          if (trusted) {
            await upsertTrustedDevice(user.id, deviceId, now, ctx.request?.headers.get("user-agent") ?? null);
            const session = await ctx.context.internalAdapter.createSession(user.id, false);
            await setSessionCookie(ctx, { session, user }, false);
            return ctx.json({ status: "trusted" as const, user, session });
          }

          const token = generateToken();
          const pollToken = generateToken();
          const expiresAt = new Date(now.getTime() + MAGIC_LINK_TTL_MS);
          await db.insert(magicLinkTokensTable).values({
            userId: user.id,
            deviceId,
            tokenHash: hashToken(token),
            pollTokenHash: hashToken(pollToken),
            expiresAt,
          });

          const url = buildConfirmUrl(token);
          const isDev = process.env.NODE_ENV !== "production";

          if (!isDev) {
            await sendMagicLink({
              to: member.email,
              url,
              firstName: member.firstName ?? null,
            });
          }

          return ctx.json({
            status: "magic_link_pending" as const,
            pollToken,
            expiresAt: expiresAt.toISOString(),
            devMagicLinkUrl: isDev ? url : undefined,
          });
        },
      ),

      confirmMagicLink: createAuthEndpoint(
        "/magic-link/confirm",
        { method: "GET" },
        async (ctx) => {
          const token = ctx.query?.token as string | undefined;
          if (!token) {
            return new Response(errorHtml("Missing token"), {
              status: 400,
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          }

          const tokenHash = hashToken(token);
          const [row] = await db
            .select()
            .from(magicLinkTokensTable)
            .where(
              and(
                eq(magicLinkTokensTable.tokenHash, tokenHash),
                isNull(magicLinkTokensTable.consumedAt),
              ),
            );
          if (!row) {
            return new Response(errorHtml("Link is invalid or already used"), {
              status: 400,
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          }
          if (isExpired(row.expiresAt)) {
            return new Response(
              errorHtml("Link has expired. Sign in again to get a fresh one."),
              { status: 400, headers: { "content-type": "text/html; charset=utf-8" } },
            );
          }

          const confirmingDeviceId = await getOrCreateDeviceId();
          const now = new Date();

          await db
            .update(magicLinkTokensTable)
            .set({ consumedAt: now })
            .where(eq(magicLinkTokensTable.id, row.id));

          await upsertTrustedDevice(
            row.userId,
            confirmingDeviceId,
            now,
            ctx.request?.headers.get("user-agent") ?? null,
          );

          const [u] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, row.userId));
          if (!u) {
            return new Response(errorHtml("User no longer exists"), {
              status: 400,
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          }

          const session = await ctx.context.internalAdapter.createSession(u.id, false);
          await setSessionCookie(ctx, { session, user: u }, false);

          return new Response(SUCCESS_HTML, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        },
      ),

      pollMagicLink: createAuthEndpoint(
        "/magic-link/poll",
        { method: "POST" },
        async (ctx) => {
          const { pollToken } = ctx.body as { pollToken?: string };
          if (!pollToken) {
            throw new APIError("BAD_REQUEST", { message: "Missing pollToken" });
          }
          const [row] = await db
            .select()
            .from(magicLinkTokensTable)
            .where(eq(magicLinkTokensTable.pollTokenHash, hashToken(pollToken)));

          if (!row) {
            throw new APIError("NOT_FOUND", { message: "Unknown poll token" });
          }
          if (isExpired(row.expiresAt) && !row.consumedAt) {
            return ctx.json({ status: "expired" as const });
          }
          if (!row.consumedAt) {
            return ctx.json({ status: "pending" as const });
          }

          // Confirmed elsewhere. Mark the polling device trusted and sign it in.
          const [u] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, row.userId));
          if (!u) {
            throw new APIError("NOT_FOUND", { message: "User no longer exists" });
          }

          const now = new Date();
          await upsertTrustedDevice(
            row.userId,
            row.deviceId,
            now,
            ctx.request?.headers.get("user-agent") ?? null,
          );
          const session = await ctx.context.internalAdapter.createSession(u.id, false);
          await setSessionCookie(ctx, { session, user: u }, false);
          return ctx.json({ status: "ready" as const });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
