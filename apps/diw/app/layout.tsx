import { Geist, Geist_Mono } from "next/font/google";
import Image from 'next/image'

import "@sdfwa/ui/globals.css";
import { Providers } from "@/components/providers";
import { AppLayout } from "@sdfwa/ui/components/layouts/app-layout";

import { Logo } from "@sdfwa/ui/components/logo";

import { HeaderActions } from "@/components/header-actions";
import { getServerSession } from "@/lib/auth/get-session";
import { HeaderNav } from "@/components/header-nav";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const user = session?.user;
  const roles = (session as Record<string, unknown>)?.roles as string[] | undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>
          <AppLayout
            logo={<Logo><Image src="/images/full-logo.png" alt="SDFWA Logo" width={1090} height={746} /></Logo>}
            navigation={<HeaderNav roles={roles} />}
            actions={<HeaderActions user={user} />}
          >
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
