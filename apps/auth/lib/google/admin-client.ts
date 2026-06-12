import { SignJWT, importPKCS8 } from "jose";

import { log } from "../observability";

const SCOPE = "https://www.googleapis.com/auth/admin.directory.group.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DIRECTORY_URL = "https://admin.googleapis.com/admin/directory/v1/groups";
const GROUP_DOMAIN_SUFFIX = "@sdfwa.org";

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let tokenCache: CachedToken | null = null;
let cachedConfig: { sa: ServiceAccountJson; subject: string } | null = null;
let configLoadFailed = false;

function loadConfig(): { sa: ServiceAccountJson; subject: string } | null {
  if (cachedConfig) return cachedConfig;
  if (configLoadFailed) return null;

  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  const subject = process.env.GOOGLE_ADMIN_IMPERSONATION_SUBJECT;
  if (!b64 || !subject) {
    log("warn", "google_admin_config_missing", {
      hasJson: Boolean(b64),
      hasSubject: Boolean(subject),
    });
    configLoadFailed = true;
    return null;
  }

  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    const sa = JSON.parse(json) as ServiceAccountJson;
    if (!sa.client_email || !sa.private_key) {
      throw new Error("service account JSON missing client_email or private_key");
    }
    cachedConfig = { sa, subject };
    return cachedConfig;
  } catch (err) {
    log("error", "google_admin_config_invalid", {
      error: err instanceof Error ? err.message : String(err),
    });
    configLoadFailed = true;
    return null;
  }
}

async function mintAccessToken(): Promise<string | null> {
  const config = loadConfig();
  if (!config) return null;

  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(config.sa.private_key, "RS256");

  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.sa.client_email)
    .setSubject(config.subject)
    .setAudience(config.sa.token_uri ?? TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(config.sa.token_uri ?? TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    log("error", "google_admin_token_exchange_failed", {
      status: res.status,
      body: body.slice(0, 500),
    });
    return null;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAtMs: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

async function getAccessToken(): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAtMs > Date.now()) {
    return tokenCache.accessToken;
  }
  return mintAccessToken();
}

export type FetchGroupsResult =
  | { status: "ok"; groups: string[] }
  | { status: "not_found" }
  | { status: "skipped" }
  | { status: "error"; reason: string };

/**
 * Keep only `@sdfwa.org` group emails and strip the suffix, returning bare
 * group names. The domain is implied by the auth system — storing it would
 * just bloat every session, JWT, and `requireGroup` call site.
 */
export function filterSdfwaGroups(emails: string[]): string[] {
  const out: string[] = [];
  for (const raw of emails) {
    const lower = raw.toLowerCase();
    if (!lower.endsWith(GROUP_DOMAIN_SUFFIX)) continue;
    out.push(lower.slice(0, -GROUP_DOMAIN_SUFFIX.length));
  }
  return out;
}

/**
 * Fetch every Google Workspace group containing `userEmail`, filtered to the
 * sdfwa.org domain. Never throws — callers should check `status` to decide
 * between revocation, soft-failure, and skipping (no creds configured).
 */
export async function fetchUserGroups(userEmail: string): Promise<FetchGroupsResult> {
  const token = await getAccessToken();
  if (!token) {
    // loadConfig already logged the specific reason
    return { status: "skipped" };
  }

  const collected: string[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;

  try {
    do {
      const url = new URL(DIRECTORY_URL);
      url.searchParams.set("userKey", userEmail);
      url.searchParams.set("maxResults", "200");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        return { status: "not_found" };
      }
      if (!res.ok) {
        const body = await res.text();
        log("error", "google_admin_groups_fetch_failed", {
          status: res.status,
          body: body.slice(0, 500),
          userEmail,
        });
        return { status: "error", reason: `http_${res.status}` };
      }

      const data = (await res.json()) as {
        groups?: { email?: string }[];
        nextPageToken?: string;
      };
      for (const g of data.groups ?? []) {
        if (g.email) collected.push(g.email);
      }
      pageToken = data.nextPageToken;
      pageCount += 1;
      if (pageCount > 20) break;
    } while (pageToken);

    return { status: "ok", groups: filterSdfwaGroups(collected) };
  } catch (err) {
    log("error", "google_admin_groups_fetch_threw", {
      error: err instanceof Error ? err.message : String(err),
      userEmail,
    });
    return { status: "error", reason: "exception" };
  }
}

/**
 * Test-only: drop cached token + config so the next call re-reads env. Used by
 * unit tests; not exported from any index.
 */
export function _resetAdminClientForTests(): void {
  tokenCache = null;
  cachedConfig = null;
  configLoadFailed = false;
}
