"use client"

import React from "react"

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number | { sm: number; md: number; lg: number; xl: number }
  gap?: "sm" | "md" | "lg"
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      cols = { sm: 1, md: 2, lg: 3, xl: 4 },
      gap = "md",
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    let gridColsClass = ""

    if (typeof cols === "number") {
      gridColsClass = `grid-cols-${cols}`
    } else {
      gridColsClass = `grid-cols-${cols.sm} md:grid-cols-${cols.md} lg:grid-cols-${cols.lg} xl:grid-cols-${cols.xl}`
    }

    const gapClasses: Record<string, string> = {
      sm: "gap-3 sm:gap-4",
      md: "gap-4 sm:gap-6",
      lg: "gap-6 sm:gap-8",
    }

    return (
      <div
        ref={ref}
        className={`grid ${gridColsClass} ${gapClasses[gap]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Grid.displayName = "Grid"

export default Grid
