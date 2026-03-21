"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useStore } from "@/store/useStore"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    BarChart3,
    Bot,
    Briefcase,
    Database,
    FileText,
    FolderSync,
    LayoutDashboard,
    LineChart,
    Package,
    ShoppingCart,
    Users,
    type LucideIcon,
} from "lucide-react"

type NavItem = {
    href: string
    label: string
    icon: LucideIcon
    roles?: string[]
    match?: string[]
}

type NavSection = {
    section: string
    roles?: string[]
    items: NavItem[]
}

const navItems: NavSection[] = [
    {
        section: "Core",
        roles: ["ADMIN", "SALES", "FINANCE"],
        items: [
            { href: "/overview", label: "Overview", icon: LayoutDashboard },
            { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
            { href: "/analytics", label: "Analytics", icon: LineChart },
            { href: "/copilot", label: "AI Copilot", icon: Bot },
        ],
    },
    {
        section: "Operations",
        roles: ["ADMIN", "SALES", "FINANCE", "WAREHOUSE"],
        items: [
            { href: "/workspace", label: "Workspace", icon: Briefcase, match: ["/workspace"] },
            { href: "/workspace/procurement", label: "Procurement", icon: ShoppingCart },
            { href: "/workspace/sync", label: "Sync Center", icon: FolderSync },
            { href: "/documents", label: "Documents", icon: FileText },
            { href: "/datasets", label: "Datasets", icon: Database },
        ],
    },
    {
        section: "Business",
        roles: ["ADMIN", "SALES", "FINANCE", "WAREHOUSE"],
        items: [
            { href: "/crm", label: "CRM", icon: Users },
            { href: "/simulations", label: "Simulations", icon: Package },
            { href: "/segments", label: "Segments", icon: LineChart },
            { href: "/portal", label: "Executive Portal", icon: Briefcase },
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
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-5 left-5 z-100 md:hidden p-3 rounded-xl bg-[--surface-1]/90 backdrop-blur-xl border border-[--border-default] shadow-lg"
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
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-80 md:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            <aside
                className={`
                    fixed md:sticky
                    top-0 left-0
                    w-72
                    h-screen
                    bg-[--surface-1]/95 backdrop-blur-xl
                    border-r border-[--border-subtle]
                    z-90
                    transition-transform duration-500
                    flex flex-col
                    ${mobileOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-7 pb-4 border-b border-[--border-subtle]">
                    <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[--primary] to-[--secondary] flex items-center justify-center font-black text-white text-lg shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                            N
                        </div>
                        <div>
                            <span className="text-lg font-extrabold tracking-tight text-white block leading-none">NeuralBI</span>
                            <span className="text-[10px] font-bold tracking-wide text-[--text-secondary] mt-1 block">Enterprise Platform</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-pro font-jakarta">
                    {navItems.filter(s => !s.roles || ((userRole || "ADMIN") && s.roles.includes(userRole || "ADMIN"))).map((section) => (
                        <div key={section.section}>
                            <div className="px-3 mb-3 text-[11px] uppercase tracking-[0.16em] font-semibold text-[--text-muted]">
                                {section.section}
                            </div>
                            <div className="space-y-1.5">
                                {section.items.filter(i => !(i as any).roles || ((userRole || "ADMIN") && (i as any).roles.includes(userRole || "ADMIN"))).map((item) => {
                                    const itemPath = item.href.split("?")[0]
                                    const isActive = item.match
                                        ? item.match.some(matchPath => pathname.startsWith(matchPath))
                                        : pathname === itemPath
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={`
                                                relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group overflow-hidden border
                                                ${isActive
                                                    ? 'bg-[--primary]/12 text-white border-[--border-accent]'
                                                    : 'text-[--text-secondary] border-transparent hover:text-white hover:bg-white/3 hover:border-white/10'
                                                }
                                            `}
                                        >
                                            <span className={`rounded-lg p-1.5 ${isActive ? 'bg-[--primary]/25 text-[--primary]' : 'bg-white/2 text-[--text-muted] group-hover:text-[--text-primary]'}`}>
                                                <item.icon size={16} strokeWidth={2.2} />
                                            </span>
                                            <span className="tracking-tight">{item.label}</span>
                                            
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeNavHighlight"
                                                    className="absolute left-0 w-0.5 h-5 bg-[--primary] rounded-full"
                                                />
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="mt-auto p-5 border-t border-[--border-subtle] bg-[--surface-0]/70">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/2 border border-[--border-default] text-white text-xs font-semibold hover:bg-white/4 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center text-base">
                                {theme === 'dark' ? "🌙" : "☀️"}
                            </div>
                            <span className="uppercase tracking-[0.12em]">{theme === 'dark' ? "Dark" : "Light"}</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative transition-all duration-500 ${theme === 'dark' ? 'bg-[--primary]' : 'bg-slate-700'}`}>
                            <motion.div
                                animate={{ x: theme === 'dark' ? 26 : 4 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-lg"
                            />
                        </div>
                    </button>

                    <div className="flex items-center gap-3 mt-5 px-2">
                        <div className="flex items-center justify-center w-2.5 h-2.5 rounded-full relative">
                            <div className="absolute inset-0 bg-[--accent-emerald] rounded-full animate-ping opacity-40" />
                            <div className="relative w-2.5 h-2.5 bg-[--accent-emerald] rounded-full" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white block">System Status: Online</span>
                            <span className="text-[9px] font-medium text-[--text-muted] block mt-0.5 font-mono opacity-70 truncate">{engineId}</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
