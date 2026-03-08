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
          <label className="block text-sm font-medium text-slate-200 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 rounded-lg
            bg-slate-800/50 border border-slate-700
            text-slate-100 placeholder-slate-500
            transition-all duration-200
            hover:border-slate-600
            focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-slate-400 text-sm mt-1">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
