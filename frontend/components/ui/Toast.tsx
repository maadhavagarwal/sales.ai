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
                            <div style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                flexShrink: 0,
                                background: toast.type === "success" ? "rgba(16,185,129,0.2)"
                                    : toast.type === "error" ? "rgba(244,63,94,0.2)"
                                        : toast.type === "warning" ? "rgba(245,158,11,0.2)"
                                            : "rgba(99,102,241,0.2)",
                            }}>
                                {ICONS[toast.type]}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, marginBottom: toast.message ? "2px" : 0, fontSize: "0.875rem" }}>
                                    {toast.title}
                                </p>
                                {toast.message && (
                                    <p style={{ fontSize: "0.8rem", opacity: 0.8 }}>{toast.message}</p>
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
