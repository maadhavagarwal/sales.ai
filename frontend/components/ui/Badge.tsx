"use client"

import React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "warning" | "danger" | "info" | "outline" | "pro"
  size?: "xs" | "sm" | "md" | "lg"
  pulse?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = "primary", size = "md", className = "", children, pulse = false, ...props },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center font-semibold uppercase tracking-[0.10em] rounded-full transition-all duration-200 relative"

    const variants: Record<string, string> = {
      primary: "bg-[--primary]/8 text-[--primary] border border-[--primary]/15",
      success: "bg-[--accent-emerald]/8 text-[--accent-emerald] border border-[--accent-emerald]/15",
      warning: "bg-[--accent-amber]/8 text-[--accent-amber] border border-[--accent-amber]/15",
      danger: "bg-[--accent-rose]/8 text-[--accent-rose] border border-[--accent-rose]/15",
      info: "bg-[--accent-cyan]/8 text-[--accent-cyan] border border-[--accent-cyan]/15",
      outline: "bg-transparent text-[--text-muted] border border-[--border-strong] group-hover:border-[--primary]/50 transition-colors",
      pro: "bg-[--gradient-primary] text-white border-none shadow-[0_2px_8px_rgba(var(--primary-rgb),0.25)]",
    }

    const sizes: Record<string, string> = {
      xs: "px-2 py-0.5 text-[8px]",
      sm: "px-2.5 py-0.5 text-[9px]",
      md: "px-3 py-1 text-[10px]",
      lg: "px-4 py-1.5 text-xs",
    }

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${pulse ? 'pr-6' : ''} ${className}`}
        {...props}
      >
        {children}
        {pulse && (
          <span className="absolute right-2 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
          </span>
        )}
      </span>
    )
  }
)

Badge.displayName = "Badge"

export default Badge
