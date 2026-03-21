"use client"

import React from "react"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { label: string; value: string }[]
  error?: string
  fullWidth?: boolean
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, options, error, fullWidth = false, className = "", ...props },
    ref
  ) => {
    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label className="block text-sm font-medium text-[--text-secondary] mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-2.5 rounded-[--radius-sm]
            bg-[--surface-1] border border-[--border-default]
            text-[--text-primary]
            transition-all duration-200
            hover:border-[--border-strong]
            focus:outline-none focus:border-[--border-accent] focus:ring-2 focus:ring-[--primary]/25
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none bg-right
            ${error ? "border-[--accent-rose] focus:border-[--accent-rose] focus:ring-[--accent-rose]/25" : ""}
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.75rem center",
            backgroundSize: "16px 16px",
            paddingRight: "2.5rem",
          }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[--accent-rose] text-sm mt-1">{error}</p>}
      </div>
    )
  }
)

Select.displayName = "Select"

export default Select
