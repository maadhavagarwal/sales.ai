"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface ModalProps {
  isOpen: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
}

export default function Modal({
  isOpen,
  title,
  onClose,
  children,
  size = "md",
}: ModalProps) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[40]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`
              fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              ${sizeClasses[size]} w-[90vw] sm:w-full
              bg-[--surface-1] rounded-[--radius-xl] border border-[--border-default] z-[50]
              flex flex-col max-h-[85vh]
              overflow-hidden
              shadow-[var(--shadow-xl)]
            `}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[--primary]/40 to-transparent" />

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[--border-subtle]">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[--text-primary]">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-[--surface-2] border border-[--border-subtle] flex items-center justify-center hover:bg-[--surface-3] transition-all text-[--text-muted] hover:text-[--text-primary]"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 sm:py-6 scrollbar-pro">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
