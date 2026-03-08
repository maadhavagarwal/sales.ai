"use client"

import React from "react"

interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "col"
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
  gap?: "xs" | "sm" | "md" | "lg" | "xl"
  wrap?: boolean
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      direction = "row",
      align = "start",
      justify = "start",
      gap = "md",
      wrap = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const directionClass = direction === "row" ? "flex-row" : "flex-col"

    const alignClasses: Record<string, string> = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    }

    const justifyClasses: Record<string, string> = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
      evenly: "justify-evenly",
    }

    const gapClasses: Record<string, string> = {
      xs: "gap-1 sm:gap-2",
      sm: "gap-2 sm:gap-3",
      md: "gap-3 sm:gap-4",
      lg: "gap-4 sm:gap-6",
      xl: "gap-6 sm:gap-8",
    }

    const wrapClass = wrap ? "flex-wrap" : ""

    return (
      <div
        ref={ref}
        className={`flex ${directionClass} ${alignClasses[align]} ${justifyClasses[justify]} ${gapClasses[gap]} ${wrapClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Flex.displayName = "Flex"

export default Flex
