import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle2, TriangleAlert, XCircle, X } from "lucide-react";

import { cn } from "@sdfwa/ui/lib/utils";

const notificationVariants = cva(
  "relative flex flex-col gap-2 rounded-lg border p-3 text-sm",
  {
    variants: {
      level: {
        success: "border-green-600/30 bg-green-600/10 text-foreground",
        warning: "border-amber-500/30 bg-amber-500/10 text-foreground",
        error: "border-destructive/30 bg-destructive/10 text-foreground",
      },
    },
    defaultVariants: {
      level: "error",
    },
  },
);

const levelIcon = {
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
} as const;

const iconColor = {
  success: "text-green-600",
  warning: "text-amber-500",
  error: "text-destructive",
} as const;

export interface NotificationProps
  extends Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof notificationVariants> {
  /** Heading shown on the same row as the dismiss button. */
  title?: React.ReactNode;
  /** Show the dismiss button. Defaults to false (not dismissible). */
  dismissible?: boolean;
  /** Emitted when the user clicks the dismiss button. */
  onDismiss?: () => void;
  /** Optional action buttons rendered below the message. */
  actions?: React.ReactNode;
}

function Notification({
  className,
  level = "error",
  title,
  dismissible = false,
  onDismiss,
  actions,
  children,
  ...props
}: NotificationProps) {
  const resolvedLevel = level ?? "error";
  const Icon = levelIcon[resolvedLevel];

  return (
    <div
      data-slot="notification"
      data-level={resolvedLevel}
      role={resolvedLevel === "error" ? "alert" : "status"}
      className={cn(notificationVariants({ level }), className)}
      {...props}
    >
      {(title || dismissible) && (
        <div className="flex items-center justify-between gap-2">
          {title ? (
            <div className="flex items-center gap-2 font-medium">
              <Icon className={cn("size-4 shrink-0", iconColor[resolvedLevel])} />
              {title}
            </div>
          ) : (
            <span />
          )}
          {dismissible && (
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={onDismiss}
              className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
      {children && <div className="text-muted-foreground">{children}</div>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export { Notification, notificationVariants };
