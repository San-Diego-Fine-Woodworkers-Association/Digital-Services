"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@sdfwa/ui/components/tooltip";
import { Toaster } from "@sdfwa/ui/components/sonner";
import { AuthBaseUrlProvider } from "@sdfwa/auth-client/client";
import { AppConfigProvider, type AppConfig } from "@/lib/app-config";

export function Providers({
  config,
  children,
}: {
  config: AppConfig;
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <AuthBaseUrlProvider value={config.authBaseUrl}>
        <AppConfigProvider value={config}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </AppConfigProvider>
      </AuthBaseUrlProvider>
    </NextThemesProvider>
  );
}
