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
          <label className="block text-sm font-medium text-slate-200 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-2.5 rounded-lg
            bg-slate-800/50 border border-slate-700
            text-slate-100
            transition-all duration-200
            hover:border-slate-600
            focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none bg-right
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}
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
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      </div>
    )
  }
)

Select.displayName = "Select"

export default Select
