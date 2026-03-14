"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useStore } from "@/store/useStore"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const navItems = [
    {
        section: "Intelligence Hub",
        roles: ["ADMIN", "SALES", "FINANCE"],
        items: [
            { href: "/dashboard", label: "Executive Nexus", icon: "📊" },
            { href: "/analytics", label: "Synthetic Analytics", icon: "📈" },
        ],
    },
    {
        section: "Cognitive Engine",
        roles: ["ADMIN", "SALES", "FINANCE", "WAREHOUSE"],
        items: [
            { href: "/copilot", label: "Neural Intelligence", icon: "🧠" },
            { href: "/portal", label: "Customer Portal", icon: "🌐" },
        ],
    },
    {
        section: "Decision Layer",
        roles: ["ADMIN", "FINANCE"],
        items: [
            { href: "/simulations", label: "Probabilistic Sims", icon: "🔬" },
            { href: "/workspace/sync", label: "Tally Sync Hub", icon: "🔄" },
        ],
    },
    {
        section: "Enterprise Stack",
        roles: ["ADMIN", "SALES", "FINANCE", "WAREHOUSE"],
        items: [
            { href: "/workspace", label: "Global Workspace", icon: "🏢" },
            { href: "/crm", label: "Predictive CRM", icon: "🤝", roles: ["ADMIN", "SALES"] },
            { href: "/workspace?section=billing", label: "Financial Engine", icon: "🧾", roles: ["ADMIN", "FINANCE"] },
            { href: "/workspace/procurement", label: "Procurement & PO", icon: "🛒", roles: ["ADMIN", "FINANCE"] },
            { href: "/workspace?section=inventory", label: "Asset Lab", icon: "📦", roles: ["ADMIN", "WAREHOUSE"] },
            { href: "/workspace?section=accounts", label: "Accounting Core", icon: "🏛️", roles: ["ADMIN", "FINANCE"] },
        ],
    },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { theme, toggleTheme, userRole, userEmail } = useStore()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [engineId, setEngineId] = useState("CORE-X0-SYST")

    useEffect(() => {
        setEngineId(`ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`)
    }, [])

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-6 left-6 z-[100] md:hidden p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl"
                aria-label="Toggle menu"
            >
                <div className="w-6 h-6 flex flex-col justify-center items-center relative gap-1.5">
                    <motion.span
                        animate={mobileOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                        className="w-full h-0.5 bg-white rounded-full origin-center"
                    />
                    <motion.span
                        animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
                        className="w-full h-0.5 bg-white rounded-full"
                    />
                    <motion.span
                        animate={mobileOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                        className="w-full h-0.5 bg-white rounded-full origin-center"
                    />
                </div>
            </button>

            {/* Side Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] md:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed md:sticky
                    top-0 left-0
                    w-[300px] md:w-72
                    h-screen
                    bg-black/20 backdrop-blur-xl md:bg-black/10
                    border-r border-white/5
                    z-[90]
                    transition-transform duration-700
                    flex flex-col
                    ${mobileOpen ? 'translate-x-0 shadow-[20px_0_80px_rgba(0,0,0,0.5)]' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Logo Section */}
                <div className="p-10 pb-6">
                    <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[--primary] to-[--accent-violet] flex items-center justify-center font-black text-white text-xl">
                            N
                        </div>
                        <div>
                            <span className="text-xl font-black tracking-tighter text-white block leading-none">NeuralBI</span>
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[--primary] mt-1 block">Pro Edition</span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-6 py-8 space-y-10 scrollbar-pro font-jakarta">
                    {navItems.filter(s => !s.roles || ((userRole || "ADMIN") && s.roles.includes(userRole || "ADMIN"))).map((section) => (
                        <div key={section.section}>
                            <div className="px-4 mb-5 text-[10px] uppercase tracking-[0.3em] font-black text-[--text-muted] opacity-50">
                                {section.section}
                            </div>
                            <div className="space-y-2">
                                {section.items.filter(i => !(i as any).roles || ((userRole || "ADMIN") && (i as any).roles.includes(userRole || "ADMIN"))).map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={`
                                                relative flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all group overflow-hidden
                                                ${isActive
                                                    ? 'bg-white/5 text-white border border-white/10'
                                                    : 'text-[--text-muted] hover:text-white hover:bg-white/[0.02]'
                                                }
                                            `}
                                        >
                                            <span className={`text-xl transition-all duration-500 group-hover:scale-125 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'opacity-60'}`}>
                                                {item.icon}
                                            </span>
                                            <span className="font-geist tracking-tight">{item.label}</span>
                                            
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeNavHighlight"
                                                    className="absolute left-0 w-1 h-6 bg-[--primary] rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                                                />
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom Actions */}
                <div className="mt-auto p-8 border-t border-white/5 bg-black/40">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-white text-xs font-black hover:bg-white/[0.06] transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center text-lg">
                                {theme === 'dark' ? "🌙" : "☀️"}
                            </div>
                            <span className="font-geist uppercase tracking-widest">{theme === 'dark' ? "Midnight" : "Light Aura"}</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative transition-all duration-500 ${theme === 'dark' ? 'bg-[--primary]' : 'bg-slate-700'}`}>
                            <motion.div
                                animate={{ x: theme === 'dark' ? 26 : 4 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-lg"
                            />
                        </div>
                    </button>

                    <div className="flex items-center gap-4 mt-8 px-4">
                        <div className="flex items-center justify-center w-2.5 h-2.5 rounded-full relative">
                            <div className="absolute inset-0 bg-[--accent-emerald] rounded-full animate-ping opacity-40" />
                            <div className="relative w-2.5 h-2.5 bg-[--accent-emerald] rounded-full" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white block">Core Engine Active</span>
                            <span className="text-[8px] font-bold text-[--text-muted] block mt-0.5 font-mono opacity-50 truncate">{engineId}</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
