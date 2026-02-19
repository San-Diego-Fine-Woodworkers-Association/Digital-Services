import React, { ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";

interface LogoProps {
  /**
   * SVG or image element to display as the logo
   * @example <LogoSVG />
   */
  children?: ReactNode;

  /**
   * Optional className for the logo container
   */
  className?: string;

  /**
   * Optional alt text for accessibility (if using an img)
   */
  alt?: string;

  /**
   * Optional click handler
   */
  onClick?: () => void;

  /**
   * Optional href to make the logo a link
   */
  href?: string;
}

/**
 * Logo - A flexible logo component for your app header
 *
 * Features:
 * - Accepts any SVG or image element as children
 * - Can be used as a link or standalone
 * - Responsive sizing
 * - Accessibility support
 *
 * @example
 * ```tsx
 * // With SVG
 * <Logo>
 *   <svg>...</svg>
 * </Logo>
 *
 * // With image
 * <Logo href="/">
 *   <img src="logo.svg" alt="My App" />
 * </Logo>
 * ```
 */
export function Logo({ children, className, alt, onClick, href }: LogoProps) {
  const content = (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        "h-8 w-8 shrink-0",
        "rounded-lg",
        "transition-opacity duration-200",
        "hover:opacity-80",
        className,
      )}
      role="img"
      aria-label={alt || "Logo"}
    >
      {children || (
        <div className="bg-gradient-to-br from-primary to-primary/80 h-full w-full rounded-lg flex items-center justify-center text-sm font-bold text-primary-foreground">
          SDFWA
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg",
        )}
        aria-label={alt || "Home"}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg",
      )}
      aria-label={alt || "Logo"}
    >
      {content}
    </button>
  );
}

export default Logo;
