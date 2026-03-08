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
      padding = "md",
      interactive = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = "rounded-[--radius-lg] transition-all duration-300 relative overflow-hidden"

    const variants: Record<string, string> = {
      default: "bg-[--surface-1] border border-[--border-default]",
      elevated: "bg-[--surface-2] border border-[--border-strong] shadow-[--shadow-lg]",
      outlined: "bg-transparent border border-[--border-strong]",
      glass: "glass-pro",
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
      ? "hover:border-[--primary] hover:shadow-[--shadow-glow] cursor-pointer"
      : ""

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${interactiveClass} ${className}`}
        {...props}
      >
        {variant === "elevated" && (
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[--primary] to-transparent opacity-50" />
        )}
        {children}
      </div>
    )
  }
)

Card.displayName = "Card"

export default Card
