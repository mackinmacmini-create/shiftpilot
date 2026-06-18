import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "muted";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-teal-400/10 text-teal-400",
    success: "bg-emerald-400/10 text-emerald-400",
    warning: "bg-amber-400/10 text-amber-400",
    danger: "bg-red-400/10 text-red-400",
    muted: "bg-white/5 text-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
