import React from "react";
import { cn } from "@/lib/utils";

interface CyberCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function CyberCard({ children, className, title, ...props }: CyberCardProps) {
  return (
    <div
      className={cn(
        "relative bg-black/60 border border-border backdrop-blur-sm p-6 overflow-hidden group",
        className
      )}
      {...props}
    >
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/50" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/50" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/50" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/50" />

      {/* Optional Title Header */}
      {title && (
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-2">
          <div className="w-2 h-2 bg-primary animate-pulse" />
          <h3 className="text-lg font-display text-primary tracking-widest">{title}</h3>
        </div>
      )}

      {children}
    </div>
  );
}
