import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppLayout } from "@sdwa/components";

import "./globals.css";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "SDFWA Sign In",
  description: "San Diego Fine Woodworkers Association single sign-on",
};

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
        <AppLayout theme="light">
          <Suspense>{children}</Suspense>
        </AppLayout>
      </body>
    </html>
  );
}
