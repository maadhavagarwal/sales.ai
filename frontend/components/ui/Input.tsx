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
          <label className="block text-[13px] font-semibold text-[--text-secondary] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-[--radius-md]
            bg-[--surface-1] border-[1.5px] border-[--border-default]
            text-[--text-primary] text-sm placeholder-[--text-dim]
            transition-all duration-300
            hover:border-[--border-strong]
            focus:outline-none focus:border-[--primary] focus:shadow-[var(--shadow-glow)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-[--accent-rose] focus:border-[--accent-rose] focus:shadow-[0_0_0_3px_rgba(244,63,94,0.12)]" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-[--accent-rose] text-[13px] font-medium mt-1.5">{error}</p>}
        {helperText && !error && (
          <p className="text-[--text-muted] text-[13px] mt-1.5">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
