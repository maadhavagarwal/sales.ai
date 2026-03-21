"use client"

import React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label className="block text-sm font-medium text-[--text-secondary] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 rounded-[--radius-sm]
            bg-[--surface-1] border border-[--border-default]
            text-[--text-primary] placeholder-[--text-muted]
            transition-all duration-200
            hover:border-[--border-strong]
            focus:outline-none focus:border-[--border-accent] focus:ring-2 focus:ring-[--primary]/25
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-[--accent-rose] focus:border-[--accent-rose] focus:ring-[--accent-rose]/25" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-[--accent-rose] text-sm mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-[--text-muted] text-sm mt-1">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
