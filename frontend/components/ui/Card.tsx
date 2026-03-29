"use client"

import React from "react"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "glass" | "bento"
  padding?: "none" | "sm" | "md" | "lg" | "xl"
  interactive?: boolean
  glow?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "none",
      interactive = false,
      glow = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = "rounded-[--radius-xl] transition-all duration-300 relative overflow-hidden"

    const variants: Record<string, string> = {
      default: "bg-[--surface-1] border border-[--border-subtle] shadow-[var(--shadow-xs)]",
      elevated: "bg-[--surface-1] border border-[--border-default] shadow-[var(--shadow-md)]",
      outlined: "bg-transparent border border-[--border-strong]",
      glass: "glass-pro",
      glass_pro: "glass-pro",
      bento: "bento-card",
    }

    const paddings: Record<string, string> = {
      none: "p-0",
      sm: "p-3 sm:p-4",
      md: "p-5 sm:p-7",
      lg: "p-8 sm:p-10",
      xl: "p-10 sm:p-14",
    }

    const interactiveClass = interactive
      ? "hover:border-[--border-accent] hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 cursor-pointer active:translate-y-0 active:shadow-[var(--shadow-sm)]"
      : ""

    const glowClass = glow ? "aurora-ring" : ""

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant] || variants.default} ${paddings[padding]} ${interactiveClass} ${glowClass} ${className}`}
        {...props}
      >
        {variant === "elevated" && (
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[--primary]/30 to-transparent" />
        )}
        {children}
      </div>
    )
  }
)

export function CardHeader({ children, className }: any) {
  return <div className={`p-6 pb-2 ${className}`}>{children}</div>
}

export function CardTitle({ children, className }: any) {
  return <h3 className={`text-xl font-bold tracking-tight text-[--text-primary] ${className}`}>{children}</h3>
}

export function CardDescription({ children, className }: any) {
  return <p className={`text-sm text-[--text-secondary] leading-relaxed ${className}`}>{children}</p>
}

export function CardContent({ children, className }: any) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>
}

Card.displayName = "Card"
export default Card
