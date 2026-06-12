import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Image from 'next/image'

import "@sdfwa/ui/globals.css";
import { Providers } from "@/components/providers";
import { AppLayout } from "@sdfwa/ui/components/layouts/app-layout";

import { Logo } from "@sdfwa/ui/components/logo";

import { HeaderActions } from "@/components/header-actions";
import { getSession, getUser, isAdmin as sessionIsAdmin } from "@/lib/auth/session";
import { HeaderNav } from "@/components/header-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

function loadConfig() {
  return {
    authBaseUrl: process.env.AUTH_BASE_URL ?? "https://auth.sdfwa.org",
    appBaseUrl: process.env.APP_BASE_URL ?? "https://diw.sdfwa.org",
  };
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const currentUser = session ? await getUser() : null;
  const isAdmin = sessionIsAdmin(session);
  const groups = session?.user.groups ?? [];
  const headerUser = session
    ? {
        name: currentUser?.name ?? session.user.email,
        email: session.user.email,
      }
    : undefined;

  return (
    <AppLayout
      logo={<Logo><Image src="/images/full-logo.png" alt="SDFWA Logo" width={1090} height={746} /></Logo>}
      navigation={<HeaderNav groups={groups} />}
      actions={<HeaderActions user={headerUser} />}
      mobileNav={<MobileBottomNav isAdmin={isAdmin} />}
    >
      {children}
    </AppLayout>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <Providers config={loadConfig()}>
          <Suspense>
            <AppShell>{children}</AppShell>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
