import { Geist, Geist_Mono } from "next/font/google";
import Image from 'next/image'

import "@sdfwa/ui/globals.css";
import { Providers } from "@/components/providers";
import { AppLayout } from "@sdfwa/ui/components/layouts/app-layout";
import { NavButton } from "@sdfwa/ui/components/nav-button";
import { Logo } from "@sdfwa/ui/components/logo";

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
                <NavButton>Home</NavButton>
                <NavButton>Features</NavButton>
                <NavButton>Docs</NavButton>
              </>
            }
            // actions={}
          >
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
