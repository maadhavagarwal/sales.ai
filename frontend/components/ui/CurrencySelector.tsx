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
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[--border-default] bg-white/3 text-[12px] font-semibold text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-accent] transition-colors"
            >
                <span className="text-[--primary-400]">{currencySymbol}</span>
                {currencyCode}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+0.5rem)] right-0 w-52.5 p-2 rounded-[--radius-md] border border-[--border-default] bg-[--surface-1]/95 backdrop-blur-xl z-100"
                    >
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[--text-muted] mb-1">
                            Select Currency
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {CURRENCIES.map((curr) => (
                                <button
                                    key={curr.code}
                                    onClick={() => {
                                        setCurrency(curr.code, curr.symbol)
                                        setIsOpen(false)
                                    }}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                                        currencyCode === curr.code
                                            ? "bg-[--primary]/18 text-[--primary-300] font-semibold"
                                            : "text-[--text-primary] font-medium hover:bg-white/6"
                                    }`}
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
