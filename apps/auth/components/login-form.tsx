"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button, FieldGroup } from "@sdwa/components";
import { Card, CardContent } from "@sdfwa/ui/components/card";
import { Notification } from "@sdfwa/ui/components/notification";

import { authClient } from "@/lib/auth-client";

type Mode = "credentials" | "magic_link_pending";

const VOLUNTEER_DOMAIN = "@sdfwa.org";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("credentials");
  const [pollToken, setPollToken] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [forceMember, setForceMember] = useState(false);

  const isVolunteer =
    !forceMember && email.trim().toLowerCase().endsWith(VOLUNTEER_DOMAIN);

  async function handleMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/sign-in/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), memberId: memberId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Couldn't sign you in. Check your details.");
        return;
      }
      if (data.status === "trusted") {
        window.location.href = redirectTo;
        return;
      }
      if (data.status === "magic_link_pending") {
        setPollToken(data.pollToken);
        setDevUrl(data.devMagicLinkUrl ?? null);
        setMode("magic_link_pending");
        return;
      }
      setError("Unexpected response from the server.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleClick() {
    setError(null);
    setSubmitting(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });
    } catch {
      setError("Couldn't start the Google sign-in flow.");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        {mode === "magic_link_pending" && pollToken ? (
          <PendingState
            email={email}
            pollToken={pollToken}
            devUrl={devUrl}
            onReady={() => (window.location.href = redirectTo)}
            onTimeout={() => {
              setMode("credentials");
              setPollToken(null);
              setDevUrl(null);
              setError("That link expired. Try signing in again.");
            }}
          />
        ) : (
          <form onSubmit={isVolunteer ? (e) => { e.preventDefault(); handleGoogleClick(); } : handleMemberSubmit}>
            <div className="flex w-full flex-col gap-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-lg font-thin mb-2" style={{ fontFamily: "Cardo, Franklin Gothic" }}>
                  San Diego Fine Woodworkers
                </h1>
                <h1 className="text-4xl font-bold mb-2">Sign In</h1>
                <p className="text-muted-foreground text-balance text">
                  Use your ProClass email and Member ID, or @sdfwa.org volunteer email.
                </p>
              </div>

              {error && (
                <Notification
                  level="error"
                  title={error}
                  dismissible
                  onDismiss={() => setError(null)}
                >
                  <p>
                    Still stuck? Email{" "}
                    <a
                      href="mailto:digital-services@sdfwa.org"
                      className="font-medium underline underline-offset-4"
                    >
                      digital-services@sdfwa.org
                    </a>{" "}
                    for help with technical issues, or{" "}
                    <a
                      href="mailto:helpdesk@sdfwa.org"
                      className="font-medium underline underline-offset-4"
                    >
                      helpdesk@sdfwa.org
                    </a>{" "}
                    for help with your login details.
                  </p>
                </Notification>
              )}

              <FieldGroup
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  setForceMember(false);
                }}
                isRequired
                inputProps={{
                  placeholder: "you@example.com",
                  autoComplete: "email",
                }}
              />

              {isVolunteer ? (
                <>
                  <div className="flex w-full flex-col gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      onPress={handleGoogleClick}
                      isDisabled={submitting}
                    >
                      {submitting ? "Redirecting…" : "Continue with Google"}
                    </Button>
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                    onClick={() => setForceMember(true)}
                  >
                    Use a Member ID instead
                  </button>
                </>
              ) : (
                <>
                  <FieldGroup
                    label="Member ID"
                    name="memberId"
                    type="password"
                    value={memberId}
                    onChange={(value) => setMemberId(value)}
                    isRequired
                    inputProps={{
                      placeholder: "Your SDFWA Member ID",
                      autoComplete: "off",
                    }}
                  />
                  <div className="flex w-full flex-col gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      isDisabled={submitting}
                    >
                      {submitting ? "Signing in…" : "Sign In"}
                    </Button>
                  </div>
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Link
                      href="/faq#member-id"
                      className="underline-offset-4 hover:underline"
                    >
                      Forgot Member ID
                    </Link>
                    <Link
                      href="/faq#email"
                      className="underline-offset-4 hover:underline"
                    >
                      Forgot email
                    </Link>
                  </div>
                </>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function PendingState({
  email,
  pollToken,
  devUrl,
  onReady,
  onTimeout,
}: {
  email: string;
  pollToken: string;
  devUrl: string | null;
  onReady: () => void;
  onTimeout: () => void;
}) {
  const startedAt = useRef(Date.now());
  const [status, setStatus] = useState<"pending" | "ready" | "expired">("pending");

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (cancelled) return;
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        onTimeout();
        return;
      }
      try {
        const res = await fetch("/api/auth/magic-link/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pollToken }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.status === "ready") {
          setStatus("ready");
          onReady();
          return;
        }
        if (data.status === "expired") {
          setStatus("expired");
          onTimeout();
          return;
        }
      } catch {
        // ignore one-off network blips and keep polling
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    }
    tick();
    return () => {
      cancelled = true;
    };
  }, [pollToken, onReady, onTimeout]);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground text-sm">
          We sent a confirmation link to <strong>{email}</strong>. Click the
          link to finish signing in — this tab will continue automatically.
        </p>
        <p className="text-muted-foreground text-xs">
          {status === "ready"
            ? "Signed in. Redirecting…"
            : "Waiting for confirmation…"}
        </p>
      </div>
      {devUrl && (
        <div className="rounded border border-yellow-400 bg-yellow-50 p-3 text-xs">
          <p className="font-semibold text-yellow-900">
            DEV ONLY — would normally be emailed
          </p>
          <a
            className="break-all text-yellow-900 underline"
            href={devUrl}
            target="_blank"
            rel="noreferrer"
          >
            {devUrl}
          </a>
        </div>
      )}
    </div>
  );
}
