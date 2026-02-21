"use client";

import React, { ReactNode } from "react";
import { cn } from "@sdfwa/ui/lib/utils";

interface AppLayoutProps {
  /**
   * Logo component or element to display in the top-left
   * @example <Logo /> or <img src="..." alt="Logo" />
   */
  logo?: ReactNode;

  /**
   * Navigation buttons/elements to display in the center of the header
   * @example <NavButton>Home</NavButton><NavButton>About</NavButton>
   */
  navigation?: ReactNode;

  /**
   * Right-aligned actions (Sign In, My Account, etc.)
   * @example <button>Sign In</button>
   */
  actions?: ReactNode;

  /**
   * Main content area of the layout
   */
  children: ReactNode;

  /**
   * Optional className for the root container
   */
  className?: string;

  /**
   * Optional className for the header
   */
  headerClassName?: string;

  /**
   * Optional className for the main content area
   */
  contentClassName?: string;
}

/**
 * AppLayout - A flexible Next.js layout component with header slots
 *
 * Features:
 * - Logo slot (top-left)
 * - Navigation slot (center)
 * - Actions slot (top-right)
 * - Responsive design
 * - Uses Tailwind CSS for styling
 * - Compatible with shadcn/ui components
 *
 * @example
 * ```tsx
 * <AppLayout
 *   logo={<Logo />}
 *   navigation={<Navigation />}
 *   actions={<SignInButton />}
 * >
 *   <YourContent />
 * </AppLayout>
 * ```
 */
export function AppLayout({
  logo,
  navigation,
  actions,
  children,
  className,
  headerClassName,
  contentClassName,
}: AppLayoutProps) {
  return (
    <div className={cn("flex h-screen flex-col bg-background", className)}>
      {/* Header */}
      <header
        className={cn(
          "border-b border-border bg-background",
          "sticky top-0 z-40",
          "flex items-center justify-between",
          "px-4 py-3 sm:px-6 md:px-8",
          "h-16 gap-4",
          headerClassName,
        )}
      >
        {/* Logo Section - Top Left */}
        <div className="shrink-0">
          {logo ? (
            <div className="flex items-center justify-center">{logo}</div>
          ) : (
            <div className="h-8 w-32 rounded-lg bg-muted" />
          )}
        </div>

        {/* Navigation Section - Center */}
        <nav className="hidden flex-1 items-center justify-center gap-1 sm:flex">
          {navigation ? (
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {navigation}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Navigation</div>
          )}
        </nav>

        {/* Actions Section - Top Right */}
        <div className="flex shrink-0 items-center gap-2">
          {actions ? actions : <div className="h-8 w-24 rounded-lg bg-muted" />}
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("flex-1 overflow-auto", contentClassName)}>
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
