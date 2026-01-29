import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive";
  isLoading?: boolean;
}

export function CyberButton({ 
  children, 
  className, 
  variant = "primary", 
  isLoading,
  disabled,
  ...props 
}: CyberButtonProps) {
  const variants = {
    primary: "border-primary text-primary hover:bg-primary/10 shadow-[0_0_10px_rgba(0,255,0,0.3)]",
    secondary: "border-muted-foreground text-muted-foreground hover:bg-muted/20",
    destructive: "border-destructive text-destructive hover:bg-destructive/10 shadow-[0_0_10px_rgba(255,0,0,0.3)]",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "relative px-6 py-2 border font-mono uppercase tracking-widest text-sm transition-all duration-200",
        "before:content-[''] before:absolute before:top-0 before:left-0 before:w-2 before:h-2 before:border-t before:border-l before:border-current",
        "after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 after:border-b after:border-r after:border-current",
        "active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          PROCESSING
        </span>
      ) : (
        children
      )}
    </button>
  );
}
