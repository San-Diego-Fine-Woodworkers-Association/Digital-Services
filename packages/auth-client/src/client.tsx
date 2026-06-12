"use client";

import { useEffect, useState } from "react";

import type { CurrentUser, Session } from "./types";

function authBaseUrl(): string {
  if (typeof process === "undefined") return "https://auth.sdfwa.org";
  return (
    process.env.NEXT_PUBLIC_AUTH_BASE_URL ??
    "https://auth.sdfwa.org"
  );
}

type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "authenticated"; data: T; error: null }
  | { status: "unauthenticated"; data: null; error: null }
  | { status: "error"; data: null; error: Error };

export function useSession(): AsyncState<Session> {
  const [state, setState] = useState<AsyncState<Session>>({
    status: "loading",
    data: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    fetch(`${authBaseUrl()}/api/session`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "unauthenticated", data: null, error: null });
          return;
        }
        const data = (await res.json()) as {
          user: Session["user"] | null;
          expiresAt?: string;
        };
        if (!data.user) {
          setState({ status: "unauthenticated", data: null, error: null });
          return;
        }
        setState({
          status: "authenticated",
          data: { user: data.user, expiresAt: data.expiresAt ?? "" },
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useUser(): AsyncState<CurrentUser> {
  const [state, setState] = useState<AsyncState<CurrentUser>>({
    status: "loading",
    data: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    fetch(`${authBaseUrl()}/api/user`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState({ status: "unauthenticated", data: null, error: null });
          return;
        }
        if (!res.ok) {
          setState({
            status: "error",
            data: null,
            error: new Error(`Unexpected ${res.status}`),
          });
          return;
        }
        const data = (await res.json()) as CurrentUser;
        setState({ status: "authenticated", data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
