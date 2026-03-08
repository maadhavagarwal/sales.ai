"use client"

import { useStore, CURRENCIES } from "@/store/useStore"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useRef, useEffect } from "react"

export default function CurrencySelector() {
    const { currencySymbol, currencyCode, setCurrency } = useStore()
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.875rem",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "99px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--primary-500)";
                    e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                }}
            >
                <span style={{ color: "var(--primary-400)" }}>{currencySymbol}</span>
                {currencyCode}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: "absolute",
                            top: "calc(100% + 0.5rem)",
                            right: 0,
                            background: "rgba(10, 15, 30, 0.95)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-md)",
                            padding: "0.5rem",
                            width: "200px",
                            boxShadow: "var(--shadow-lg)",
                            zIndex: 100,
                        }}
                    >
                        <div style={{ padding: "0.25rem 0.5rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                            Select Currency
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {CURRENCIES.map((curr) => (
                                <button
                                    key={curr.code}
                                    onClick={() => {
                                        setCurrency(curr.code, curr.symbol)
                                        setIsOpen(false)
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "0.5rem 0.75rem",
                                        background: currencyCode === curr.code ? "rgba(99,102,241,0.15)" : "transparent",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: "0.8rem",
                                        color: currencyCode === curr.code ? "var(--primary-300)" : "var(--text-primary)",
                                        fontWeight: currencyCode === curr.code ? 600 : 500,
                                        transition: "background 0.15s"
                                    }}
                                    onMouseEnter={e => {
                                        if (currencyCode !== curr.code) e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                                    }}
                                    onMouseLeave={e => {
                                        if (currencyCode !== curr.code) e.currentTarget.style.background = "transparent"
                                    }}
                                >
                                    <span>{curr.label}</span>
                                    {currencyCode === curr.code && <span>✓</span>}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
