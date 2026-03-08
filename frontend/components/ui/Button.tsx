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
      "relative font-semibold rounded-[--radius-sm] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"

    const variants: Record<string, string> = {
      primary:
        "bg-[--primary] text-white hover:brightness-110 shadow-[0_4px_15px_-1px_var(--primary-glow)] hover:shadow-[0_8px_25px_-1px_var(--primary-glow)]",
      secondary:
        "bg-[--surface-3] text-[--text-primary] hover:bg-[--surface-4] border border-[--border-strong]",
      outline:
        "bg-transparent border border-[--border-strong] text-[--text-primary] hover:border-[--text-primary] hover:bg-[--surface-1]",
      ghost:
        "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-1]",
      danger:
        "bg-[--accent-rose] text-white hover:brightness-110 shadow-[0_4px_15px_-1px_rgba(244,63,94,0.3)]",
      pro: "btn-pro-primary",
    }

    const sizes: Record<string, string> = {
      xs: "px-2.5 py-1.5 text-xs",
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-2.5 text-base",
      lg: "px-8 py-3.5 text-lg",
      xl: "px-10 py-5 text-xl",
    }

    const className = `${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""
      } ${propClassName || ""}`

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { y: -2 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98, y: 0 } : undefined}
        disabled={disabled || loading}
        className={className}
        {...(props as any)}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

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
        {icon && iconPosition === "left" && !loading && <span className="flex-shrink-0">{icon}</span>}
        <span className="relative z-10">{children}</span>
        {icon && iconPosition === "right" && !loading && <span className="flex-shrink-0">{icon}</span>}
      </motion.button>
    )
  }
)

Button.displayName = "Button"

export default Button
