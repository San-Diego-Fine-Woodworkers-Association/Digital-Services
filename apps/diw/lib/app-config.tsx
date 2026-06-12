"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Runtime config supplied by the root layout from server-side env vars.
 * Read it from any client component with `useAppConfig()`.
 *
 * Why a Provider instead of `NEXT_PUBLIC_*` env vars: `NEXT_PUBLIC_*` is
 * inlined into the client bundle at build time, which couples one Docker
 * image to one set of URLs. Reading the values on the server and dropping
 * them into a context lets the same image run in dev / staging / prod by
 * changing env alone.
 */
export type AppConfig = {
	authBaseUrl: string;
	appBaseUrl: string;
};

const AppConfigContext = createContext<AppConfig | null>(null);

export function AppConfigProvider({
	value,
	children,
}: {
	value: AppConfig;
	children: ReactNode;
}) {
	return (
		<AppConfigContext.Provider value={value}>
			{children}
		</AppConfigContext.Provider>
	);
}

export function useAppConfig(): AppConfig {
	const ctx = useContext(AppConfigContext);
	if (!ctx) {
		throw new Error(
			"useAppConfig must be used inside <AppConfigProvider>. Did you forget to wrap the tree in <Providers>?",
		);
	}
	return ctx;
}
