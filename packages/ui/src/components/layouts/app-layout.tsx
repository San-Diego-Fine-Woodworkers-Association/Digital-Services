"use client";

import React, { ReactNode, useState } from "react";
import { cn } from "@sdfwa/ui/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@sdfwa/ui/components/sheet";
import { MenuIcon } from "lucide-react";

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

  /**
   * Fixed bottom navigation for mobile (replaces hamburger menu).
   * When provided, renders as a fixed bottom bar on small screens
   * and hides the hamburger/sheet menu.
   */
  mobileNav?: ReactNode;
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
  mobileNav,
}: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={cn("fixed inset-0 flex flex-col bg-background", className)}>
      {/* Header */}
      <header
        className={cn(
          "border-b border-border bg-background",
          "shrink-0 z-40",
          "flex items-center justify-between",
          "px-4 py-3 sm:px-6 md:px-8",
          "h-16 gap-4",
          headerClassName,
        )}
      >
        {/* Hamburger (only when no mobileNav) + Logo */}
        <div className="flex shrink-0 items-center gap-2">
          {navigation && !mobileNav && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="size-5" />
            </button>
          )}
          {logo ? (
            <div className="flex items-center justify-center">{logo}</div>
          ) : (
            <div className="h-8 w-32 rounded-lg bg-muted" />
          )}
        </div>

        {/* Navigation Section - Center (desktop) */}
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

      {/* Mobile navigation sheet (only when no mobileNav bottom bar) */}
      {navigation && !mobileNav && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="text-sm font-semibold">Menu</SheetTitle>
            </SheetHeader>
            <nav
              className="flex flex-col gap-1 p-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {navigation}
            </nav>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className={cn("flex-1 overflow-auto flex flex-col", mobileNav && "mb-16 sm:mb-0", contentClassName)}>
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      {mobileNav}
    </div>
  );
}

export default AppLayout;
