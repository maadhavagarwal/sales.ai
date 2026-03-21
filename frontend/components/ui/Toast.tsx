"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
}

interface ToastContextType {
    showToast: (type: ToastType, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } })

const ICONS: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
}

const ICON_BG: Record<ToastType, string> = {
    success: "bg-[--accent-emerald]/20",
    error: "bg-[--accent-rose]/20",
    warning: "bg-[--accent-amber]/20",
    info: "bg-[--primary]/20",
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = Math.random().toString(36).slice(2)
        setToasts((prev) => [...prev, { id, type, title, message }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 80, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className={`toast toast-${toast.type}`}
                            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                            style={{ cursor: "pointer" }}
                        >
                            <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ICON_BG[toast.type]}`}>
                                {ICONS[toast.type]}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm mb-0.5">
                                    {toast.title}
                                </p>
                                {toast.message && (
                                    <p className="text-[13px] opacity-80 leading-relaxed">{toast.message}</p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    return useContext(ToastContext)
}
