import React from "react";
import { cn } from "@/lib/utils";

interface CyberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const CyberInput = React.forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-input border border-border rounded px-3 py-2",
            "text-foreground font-mono text-sm placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/60",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-150",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CyberInput.displayName = "CyberInput";
