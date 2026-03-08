"use client"

import React from "react"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full"
  centered?: boolean
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      size = "lg",
      centered = true,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const sizes: Record<string, string> = {
      sm: "max-w-2xl",
      md: "max-w-4xl",
      lg: "max-w-6xl",
      xl: "max-w-7xl",
      full: "w-full",
    }

    const centerClass = centered ? "mx-auto" : ""

    return (
      <div
        ref={ref}
        className={`${sizes[size]} ${centerClass} w-full px-4 sm:px-6 md:px-8 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Container.displayName = "Container"

export default Container
