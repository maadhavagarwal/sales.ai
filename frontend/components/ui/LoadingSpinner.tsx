"use client"

import React from "react"
import { motion } from "framer-motion"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  fullScreen?: boolean
}

export default function LoadingSpinner({
  size = "md",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  }

  const spinner = (
    <motion.div
      className={`${sizeClasses[size]} border-3 border-slate-700 border-t-indigo-500 rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-50">
        {spinner}
      </div>
    )
  }

  return <div className="flex items-center justify-center">{spinner}</div>
}
