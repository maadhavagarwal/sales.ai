"use client"

import React from "react"
import { motion } from "framer-motion"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "pro"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = "left",
      children,
      disabled,
      className: propClassName,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative font-semibold rounded-[--radius-md] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group border cursor-pointer select-none"

    const variants: Record<string, string> = {
      primary:
        "bg-[--gradient-primary] text-white border-transparent shadow-[0_4px_20px_-6px_rgba(var(--primary-rgb),0.5)] hover:shadow-[0_8px_30px_-8px_rgba(var(--primary-rgb),0.6)] hover:-translate-y-0.5 active:translate-y-0",
      secondary:
        "bg-[--surface-2] text-[--text-primary] border-[--border-default] hover:bg-[--surface-3] hover:border-[--border-strong] hover:shadow-[var(--shadow-sm)]",
      outline:
        "bg-transparent border-[--border-strong] text-[--text-primary] hover:border-[--border-accent] hover:bg-[--primary]/5 hover:shadow-[var(--shadow-glow)]",
      ghost:
        "text-[--text-secondary] border-transparent hover:text-[--text-primary] hover:bg-[--surface-2]",
      danger:
        "bg-[--accent-rose] text-white border-[--accent-rose] hover:brightness-110 shadow-[0_4px_16px_-4px_rgba(244,63,94,0.4)]",
      pro: "btn-pro-primary border-transparent",
    }

    const sizes: Record<string, string> = {
      xs: "px-3 py-1.5 text-xs",
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-2.5 text-sm",
      lg: "px-8 py-3.5 text-base",
      xl: "px-10 py-5 text-lg",
    }

    const className = `${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""
      } ${propClassName || ""}`

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { y: -1 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.97, y: 0 } : undefined}
        disabled={disabled || loading}
        className={className}
        {...(props as any)}
      >
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -translate-x-full group-hover:translate-x-full duration-700" />

        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {icon && iconPosition === "left" && !loading && <span className="shrink-0">{icon}</span>}
        <span className="relative z-10 tracking-[0.01em]">{children}</span>
        {icon && iconPosition === "right" && !loading && <span className="shrink-0">{icon}</span>}
      </motion.button>
    )
  }
)

Button.displayName = "Button"

export default Button
