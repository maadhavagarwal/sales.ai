"use client"

import CurrencySelector from "@/components/ui/CurrencySelector"
import { Search, Bell } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface PageHeaderProps {
    title: string
    subtitle?: React.ReactNode
    actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    const [searchOpen, setSearchOpen] = useState(false)

    return (
        <header className="sticky top-0 z-40 bg-[--surface-1]/80 backdrop-blur-2xl border-b border-[--border-subtle] px-5 sm:px-8 lg:px-12 py-4 lg:py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                    <motion.h1 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="text-2xl md:text-[1.75rem] font-bold text-[--text-primary] tracking-tight truncate"
                    >
                        {title}
                    </motion.h1>
                    {subtitle && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.3 }}
                            className="text-[13px] font-medium text-[--text-muted] mt-1 flex items-center gap-2"
                        >
                            <span className="w-1 h-3 bg-[--primary]/50 rounded-full" />
                            {subtitle}
                        </motion.div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {actions && (
                        <div className="flex items-center gap-2 bg-[--surface-2]/60 p-1 rounded-xl border border-[--border-subtle]">
                            {actions}
                        </div>
                    )}

                    {/* Search */}
                    <button 
                        onClick={() => setSearchOpen(!searchOpen)}
                        className="w-9 h-9 rounded-xl bg-[--surface-2]/60 border border-[--border-subtle] flex items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--surface-2] transition-all hidden sm:flex"
                    >
                        <Search size={15} strokeWidth={2} />
                    </button>

                    {/* Notifications */}
                    <button className="w-9 h-9 rounded-xl bg-[--surface-2]/60 border border-[--border-subtle] flex items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--surface-2] transition-all relative hidden sm:flex">
                        <Bell size={15} strokeWidth={2} />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[--accent-rose] rounded-full border-2 border-[--surface-1]" />
                    </button>

                    <div className="h-6 w-px bg-[--border-subtle] hidden sm:block" />

                    <div className="relative group">
                        <CurrencySelector />
                    </div>
                </div>
            </div>

            {/* Search bar overlay */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search across modules, data, and insights..."
                                className="w-full bg-[--surface-2] border border-[--border-default] rounded-xl pl-11 pr-4 py-3 text-sm text-[--text-primary] placeholder:text-[--text-dim] focus:outline-none focus:border-[--primary] focus:shadow-[var(--shadow-glow)] transition-all"
                                onBlur={() => setSearchOpen(false)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}
