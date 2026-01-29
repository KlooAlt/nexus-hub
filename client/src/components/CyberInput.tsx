import React from "react";
import { cn } from "@/lib/utils";

interface CyberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const CyberInput = React.forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="space-y-1 w-full">
        {label && (
          <label className="text-xs uppercase tracking-widest text-muted-foreground ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            className={cn(
              "w-full bg-black/50 border border-muted-foreground/30 px-4 py-3",
              "text-foreground font-mono placeholder:text-muted-foreground/50",
              "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 focus:shadow-[0_0_15px_rgba(0,255,0,0.2)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200",
              className
            )}
            {...props}
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }
);
CyberInput.displayName = "CyberInput";
