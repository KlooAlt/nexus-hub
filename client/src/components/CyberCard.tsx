import React from "react";
import { cn } from "@/lib/utils";

interface CyberCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function CyberCard({ children, className, title, ...props }: CyberCardProps) {
  return (
    <div
      className={cn(
        "discord-card p-5 overflow-hidden",
        className
      )}
      {...props}
    >
      {title && (
        <div className="mb-4 pb-3 border-b border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}
