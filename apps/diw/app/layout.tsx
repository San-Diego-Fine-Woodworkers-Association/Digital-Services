import { Geist, Geist_Mono } from "next/font/google";
import Image from 'next/image'
import Link from "next/link";

import "@sdfwa/ui/globals.css";
import { cn } from "@sdfwa/ui/lib/utils";
import { Providers } from "@/components/providers";
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
          <div className="flex h-screen flex-col bg-background">
            <header
              className={cn(
                "border-b border-border bg-background",
                "w-full",
                "flex items-center justify-between",
                "px-4 py-3 sm:px-6 md:px-8",
                "h-16 gap-4"
              )}
            >
              {/* Logo */}
              <div className="shrink-0">
                <div className="flex items-center justify-center">
                  <Logo>
                    <Image src="/images/full-logo.png" alt="SDFWA Logo" width={1090} height={746} />
                  </Logo>
                </div>
              </div>
      
              {/* Navigation */}
              <nav className="hidden flex-1 items-center justify-center gap-1 sm:flex">
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                  <NavButton asChild><Link href="/fair-registration">Register</Link></NavButton>
                  <NavButton asChild><Link href="/fair-registration/my-registrations">My Registrations</Link></NavButton>
                  <NavButton asChild><Link href="/fair-registration/admin">Admin</Link></NavButton>
                </div>
              </nav>
      
              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2">
                <AccountButton
                  firstName="John"
                  lastName="Doe"
                />
              </div>
            </header>
      
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
