"use client";

import { Geist, Geist_Mono } from "next/font/google";
import Image from 'next/image'
import Link from "next/link";

import "@sdfwa/ui/globals.css";
import { Providers } from "@/components/providers";
import { AppLayout } from "@sdfwa/ui/components/layouts/app-layout";
import { NavButton } from "@sdfwa/ui/components/nav-button";
import { Logo } from "@sdfwa/ui/components/logo";

import { AccountButton } from "@/components/account-button";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>
          <AppLayout
            logo={<Logo><Image src="/images/full-logo.png" alt="SDFWA Logo" width={1090} height={746} /></Logo>}
            navigation={
              <>
                <NavButton asChild><Link href="/fair-registration">Register</Link></NavButton>
                <NavButton asChild><Link href="/fair-registration/my-registrations">My Registrations</Link></NavButton>
                <NavButton asChild><Link href="/fair-registration/profile">Profile</Link></NavButton>
                <NavButton asChild><Link href="/fair-registration/admin">Admin</Link></NavButton>
              </>
            }
            actions={
              <>
                <AccountButton
                  firstName="John"
                  lastName="Doe"
                  dropdownGroups={[
                    {
                      items: [
                        { label: "Profile", onClick: () => alert("Go to profile") },
                      ],
                    },
                    {
                      items: [
                        { label: "Sign Out", onClick: () => alert("Signing out...") },
                      ],
                    },
                  ]}
                />
              </>
            }
          >
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
