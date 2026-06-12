import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";

import {
  _resetAdminClientForTests,
  fetchUserGroups,
  filterSdfwaGroups,
} from "@/lib/google/admin-client";

function makeServiceAccountJsonB64(): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
    publicKeyEncoding: { format: "pem", type: "spki" },
  });
  const sa = {
    client_email: "sa-test@example.iam.gserviceaccount.com",
    private_key: privateKey,
    token_uri: "https://oauth2.googleapis.com/token",
  };
  return Buffer.from(JSON.stringify(sa)).toString("base64");
}

const originalFetch = globalThis.fetch;
const originalEnv = {
  json: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64,
  subject: process.env.GOOGLE_ADMIN_IMPERSONATION_SUBJECT,
};

beforeEach(() => {
  _resetAdminClientForTests();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 = originalEnv.json;
  process.env.GOOGLE_ADMIN_IMPERSONATION_SUBJECT = originalEnv.subject;
  _resetAdminClientForTests();
});

describe("filterSdfwaGroups", () => {
  test("keeps @sdfwa.org-suffixed emails and strips the suffix", () => {
    const input = [
      "digital-services@sdfwa.org",
      "external@example.com",
      "shop-managers@sdfwa.org",
      "all@google.com",
    ];
    expect(filterSdfwaGroups(input)).toEqual(["digital-services", "shop-managers"]);
  });

  test("case-insensitive on the suffix; normalizes to lowercase", () => {
    expect(filterSdfwaGroups(["Foo@SDFWA.ORG"])).toEqual(["foo"]);
  });
});

describe("fetchUserGroups", () => {
  test("returns skipped when env vars are missing", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
    delete process.env.GOOGLE_ADMIN_IMPERSONATION_SUBJECT;
    const result = await fetchUserGroups("anyone@sdfwa.org");
    expect(result.status).toBe("skipped");
  });

  test("token is cached across calls", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 = makeServiceAccountJsonB64();
    process.env.GOOGLE_ADMIN_IMPERSONATION_SUBJECT = "admin@sdfwa.org";

    let tokenCalls = 0;
    let groupsCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = typeof input === "string" ? input : input.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        tokenCalls += 1;
        return new Response(
          JSON.stringify({ access_token: "tok-xyz", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (urlStr.includes("admin.googleapis.com")) {
        groupsCalls += 1;
        return new Response(
          JSON.stringify({
            groups: [{ email: "digital-services@sdfwa.org" }, { email: "ignore@x.com" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unexpected fetch to ${urlStr}`);
    }) as typeof fetch;

    const a = await fetchUserGroups("u@sdfwa.org");
    const b = await fetchUserGroups("u@sdfwa.org");
    expect(a).toEqual({ status: "ok", groups: ["digital-services"] });
    expect(b).toEqual({ status: "ok", groups: ["digital-services"] });
    expect(tokenCalls).toBe(1);
    expect(groupsCalls).toBe(2);
  });

  test("404 from Directory API returns not_found", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 = makeServiceAccountJsonB64();
    process.env.GOOGLE_ADMIN_IMPERSONATION_SUBJECT = "admin@sdfwa.org";

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = typeof input === "string" ? input : input.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({ access_token: "tok", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const result = await fetchUserGroups("ghost@sdfwa.org");
    expect(result.status).toBe("not_found");
  });

  test("paginated groups response is flattened", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 = makeServiceAccountJsonB64();
    process.env.GOOGLE_ADMIN_IMPERSONATION_SUBJECT = "admin@sdfwa.org";

    let page = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = typeof input === "string" ? input : input.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({ access_token: "tok", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      page += 1;
      if (page === 1) {
        return new Response(
          JSON.stringify({
            groups: [{ email: "one@sdfwa.org" }],
            nextPageToken: "p2",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ groups: [{ email: "two@sdfwa.org" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await fetchUserGroups("u@sdfwa.org");
    expect(result).toEqual({
      status: "ok",
      groups: ["one", "two"],
    });
  });
});
