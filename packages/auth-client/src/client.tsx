"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { CurrentUser, Session } from "./types";

const AuthBaseUrlContext = createContext<string | null>(null);

/**
 * Provide the auth app's base URL to descendant hooks. Render this in your
 * root layout, sourcing the URL from a server-side env var so the same image
 * can run in dev / staging / prod without rebuilding.
 *
 *   <AuthBaseUrlProvider value={process.env.AUTH_BASE_URL}>
 *     {children}
 *   </AuthBaseUrlProvider>
 *
 * Falls back to `NEXT_PUBLIC_AUTH_BASE_URL` (build-time inline) or the prod
 * URL if no Provider wraps the tree — so it degrades safely.
 */
export function AuthBaseUrlProvider({
  value,
  children,
}: {
  value: string | undefined;
  children: ReactNode;
}) {
  return (
    <AuthBaseUrlContext.Provider value={value ?? null}>
      {children}
    </AuthBaseUrlContext.Provider>
  );
}

function useAuthBaseUrl(): string {
  const fromContext = useContext(AuthBaseUrlContext);
  if (fromContext) return fromContext;
  if (typeof process !== "undefined") {
    const fromEnv = process.env.NEXT_PUBLIC_AUTH_BASE_URL;
    if (fromEnv) return fromEnv;
  }
  return "https://auth.sdfwa.org";
}

type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "authenticated"; data: T; error: null }
  | { status: "unauthenticated"; data: null; error: null }
  | { status: "error"; data: null; error: Error };

export function useSession(): AsyncState<Session> {
  const baseUrl = useAuthBaseUrl();
  const [state, setState] = useState<AsyncState<Session>>({
    status: "loading",
    data: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    fetch(`${baseUrl}/api/session`, {
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
  }, [baseUrl]);
  return state;
}

export function useUser(): AsyncState<CurrentUser> {
  const baseUrl = useAuthBaseUrl();
  const [state, setState] = useState<AsyncState<CurrentUser>>({
    status: "loading",
    data: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    fetch(`${baseUrl}/api/user`, {
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
  }, [baseUrl]);
  return state;
}
