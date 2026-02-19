import React, { ReactNode } from "react";
import { Button, type ButtonProps } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

export interface NavButtonProps extends Omit<ButtonProps, "variant" | "size"> {
  /**
   * The label or content of the navigation button
   */
  children: ReactNode;

  /**
   * Whether the button represents the currently active route
   */
  isActive?: boolean;

  /**
   * Optional icon to display before the text
   */
  icon?: ReactNode;

  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * NavButton - A navigation button for use in app headers
 *
 * Features:
 * - Active state styling
 * - Icon support
 * - Keyboard accessible
 * - Responsive sizing
 * - Integrates with the app layout
 *
 * @example
 * ```tsx
 * <nav>
 *   <NavButton isActive href="/">Home</NavButton>
 *   <NavButton href="/about">About</NavButton>
 *   <NavButton icon={<ChevronDown />}>More</NavButton>
 * </nav>
 * ```
 */
export function NavButton({
  children,
  isActive = false,
  icon,
  className,
  ...props
}: NavButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      className={cn(
        "relative",
        "whitespace-nowrap",
        "transition-all duration-200",
        isActive &&
          "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary",
        className,
      )}
      {...props}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </Button>
  );
}

export default NavButton;
