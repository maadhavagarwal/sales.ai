"use client"

import React from "react"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "glass" | "bento"
  padding?: "none" | "sm" | "md" | "lg" | "xl"
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "none",
      interactive = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = "rounded-[--radius-lg] transition-all duration-200 relative overflow-hidden"

    const variants: Record<string, string> = {
      default: "bg-[--surface-1] border border-[--border-default]",
      elevated: "bg-[--surface-2] border border-[--border-strong] shadow-[--shadow-md]",
      outlined: "bg-transparent border border-[--border-strong]",
      glass: "glass-pro",
      glass_pro: "glass-pro", // alias for consistency
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
      ? "hover:border-[--border-accent] hover:shadow-[--shadow-glow] cursor-pointer"
      : ""

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant] || variants.default} ${paddings[padding]} ${interactiveClass} ${className}`}
        {...props}
      >
        {variant === "elevated" && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-[--primary] to-transparent opacity-50" />
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
  return <h3 className={`text-xl font-semibold tracking-tight text-[--text-primary] ${className}`}>{children}</h3>
}

export function CardDescription({ children, className }: any) {
  return <p className={`text-sm text-[--text-secondary] ${className}`}>{children}</p>
}

export function CardContent({ children, className }: any) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>
}

Card.displayName = "Card"
export default Card
