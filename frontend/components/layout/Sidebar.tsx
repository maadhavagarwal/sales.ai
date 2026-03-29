"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useStore } from "@/store/useStore"
import { getEntitlements } from "@/services/api"
import { getAuthToken } from "@/lib/session"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    BarChart3,
    Bot,
    Briefcase,
    Database,
    DollarSign,
    FileText,
    FolderSync,
    LayoutDashboard,
    LineChart,
    LogOut,
    Package,
    Receipt,
    ShieldCheck,
    ShoppingCart,
    Sun,
    Moon,
    Users,
    ChevronLeft,
    Sparkles,
    type LucideIcon,
} from "lucide-react"

type NavItem = {
    href: string
    label: string
    icon: LucideIcon
    roles?: string[]
    requiredFeature?: string
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
            { href: "/workspace/expenses", label: "Expenses", icon: DollarSign },
            { href: "/workspace/sync", label: "Sync Center", icon: FolderSync },
            { href: "/documents", label: "Documents", icon: FileText },
            { href: "/datasets", label: "Datasets", icon: Database },
        ],
    },
    {
        section: "Finance & Compliance",
        roles: ["ADMIN", "FINANCE"],
        items: [
            { href: "/workspace/accounting/gst-compliance", label: "GST Compliance", icon: Receipt },
            { href: "/workspace/accounting/invoices", label: "Invoices", icon: FileText },
        ],
    },
    {
        section: "Human Resources",
        roles: ["ADMIN", "HR"],
        items: [
            { href: "/workspace/hr", label: "HR Management", icon: Users },
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
    {
        section: "Platform",
        roles: ["ADMIN"],
        items: [
            { href: "/enterprise-control", label: "Enterprise Control", icon: ShieldCheck, requiredFeature: "enterprise_control" },
        ],
    },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { theme, toggleTheme, userRole, userEmail, logout, entitlements, setEntitlements } = useStore()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [mounted, setMounted] = useState(false)
    const authToken = mounted ? getAuthToken() : null

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleLogout = async () => {
        try {
            const token = getAuthToken()
            if (token) {
                await fetch("/api/logout", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }).catch(() => {})
            }
        } catch (error) {
            console.error("Logout error:", error)
        } finally {
            logout()
            router.push("/login")
        }
    }

    useEffect(() => {
        const token = getAuthToken()
        if (!token) return

        ;(async () => {
            try {
                const data = await getEntitlements()
                setEntitlements({
                    plan: data.plan,
                    status: data.status,
                    features: data.features,
                })
            } catch {
                // Ignore transient capability fetch failures
            }
        })()
    }, [setEntitlements])

    const effectiveUserRole = mounted ? (userRole || "ADMIN") : "ADMIN"
    const enabledFeatureSet = new Set(mounted ? (entitlements.features || []) : [])

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-5 left-5 z-[100] md:hidden p-3 rounded-xl bg-[--surface-1]/90 backdrop-blur-xl border border-[--border-default] shadow-[var(--shadow-sm)]"
                aria-label="Toggle menu"
            >
                <div className="w-5 h-5 flex flex-col justify-center items-center relative gap-1.5">
                    <motion.span
                        animate={mobileOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                        className="w-full h-0.5 bg-[--text-primary] rounded-full origin-center"
                    />
                    <motion.span
                        animate={mobileOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                        className="w-full h-0.5 bg-[--text-primary] rounded-full"
                    />
                    <motion.span
                        animate={mobileOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                        className="w-full h-0.5 bg-[--text-primary] rounded-full origin-center"
                    />
                </div>
            </button>

            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[80] md:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            <aside
                className={`
                    fixed md:sticky
                    top-0 left-0
                    ${collapsed ? 'w-[72px]' : 'w-[272px]'}
                    h-screen
                    bg-[--surface-1]/95 backdrop-blur-2xl
                    border-r border-[--border-subtle]
                    z-[90]
                    transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    flex flex-col
                    ${mobileOpen ? 'translate-x-0 shadow-[var(--shadow-xl)]' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Logo area */}
                <div className={`p-5 ${collapsed ? 'px-3' : 'px-6'} pb-4 border-b border-[--border-subtle] flex items-center justify-between`}>
                    <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-[--gradient-primary] flex items-center justify-center font-black text-white text-lg shadow-[0_4px_16px_rgba(var(--primary-rgb),0.35)] group-hover:shadow-[0_8px_24px_rgba(var(--primary-rgb),0.45)] transition-all group-hover:scale-105">
                            N
                        </div>
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className="text-lg font-extrabold tracking-tight text-[--text-primary] block leading-none">NeuralBI</span>
                                <span className="text-[10px] font-semibold tracking-wide text-[--text-muted] mt-0.5 block flex items-center gap-1.5">
                                    <Sparkles size={9} className="text-[--primary]" />
                                    Enterprise AI Platform
                                </span>
                            </motion.div>
                        )}
                    </Link>

                    {/* Desktop collapse button */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex w-7 h-7 rounded-lg bg-[--surface-2] border border-[--border-default] items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--surface-3] transition-all"
                    >
                        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
                            <ChevronLeft size={14} />
                        </motion.div>
                    </button>
                </div>

                {/* Navigation */}
                <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'} py-5 space-y-6 scrollbar-pro font-jakarta`}>
                    {navItems.filter(s => !s.roles || s.roles.includes(effectiveUserRole)).map((section) => (
                        <div key={section.section}>
                            {!collapsed && (
                                <div className="px-3 mb-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[--text-muted]">
                                    {section.section}
                                </div>
                            )}
                            <div className="space-y-0.5">
                                {section.items.filter(i => {
                                    const roleAllowed = !(i as any).roles || (i as any).roles.includes(effectiveUserRole)
                                    const featureAllowed = !i.requiredFeature || enabledFeatureSet.has(i.requiredFeature)
                                    return roleAllowed && featureAllowed
                                }).map((item) => {
                                    const itemPath = item.href.split("?")[0]
                                    const isActive = item.match
                                        ? item.match.some(matchPath => pathname.startsWith(matchPath))
                                        : pathname === itemPath
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            title={collapsed ? item.label : undefined}
                                            className={`
                                                relative flex items-center gap-3 ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} rounded-xl text-[13px] font-medium transition-all group overflow-hidden
                                                ${isActive
                                                    ? 'bg-[--primary]/8 text-[--primary] shadow-[var(--shadow-xs)]'
                                                    : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-2]'
                                                }
                                            `}
                                        >
                                            {/* Active indicator bar */}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeNavHighlight"
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[--primary] rounded-full"
                                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                                />
                                            )}

                                            <span className={`shrink-0 ${isActive ? 'text-[--primary]' : 'text-[--text-muted] group-hover:text-[--text-primary]'} transition-colors`}>
                                                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                                            </span>
                                            {!collapsed && (
                                                <span className="tracking-tight truncate">{item.label}</span>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom section */}
                <div className={`mt-auto ${collapsed ? 'p-2' : 'p-4'} border-t border-[--border-subtle] bg-[--surface-0]/50 space-y-2`}>
                    {/* User Info */}
                    {!collapsed && (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[--surface-2]/60 border border-[--border-subtle]">
                            <div className="w-8 h-8 rounded-lg bg-[--gradient-primary] flex items-center justify-center text-sm font-bold text-white shadow-[0_2px_8px_rgba(var(--primary-rgb),0.25)]">
                                {mounted ? (userEmail?.charAt(0).toUpperCase() || "U") : "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[--text-primary] truncate">{mounted ? (userEmail || "User") : "User"}</div>
                                <div className="text-[9px] text-[--text-muted] font-mono break-all leading-tight mt-0.5">
                                    {mounted ? (authToken || "NO_TOKEN") : "..."}
                                </div>
                                <div className="text-[10px] text-[--text-muted] font-medium">{mounted ? (userRole || "ADMIN") : "ADMIN"}</div>
                            </div>
                        </div>
                    )}

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2.5 rounded-xl bg-[--surface-2]/40 border border-[--border-subtle] text-[--text-primary] text-xs font-medium hover:bg-[--surface-2] transition-all`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-[--surface-3] flex items-center justify-center">
                                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                            </div>
                            {!collapsed && (
                                <span className="text-[11px] font-medium">
                                    {mounted ? (theme === 'dark' ? "Dark Mode" : "Light Mode") : "Light Mode"}
                                </span>
                            )}
                        </div>
                        {!collapsed && mounted && (
                            <div className={`w-9 h-5 rounded-full relative transition-all duration-500 ${theme === 'dark' ? 'bg-[--primary]' : 'bg-[--surface-4]'}`}>
                                <motion.div
                                    animate={{ x: theme === 'dark' ? 18 : 2 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className="absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                            </div>
                        )}
                    </button>

                    {/* Sign out */}
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-2.5 ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl text-sm font-medium text-[--accent-rose] hover:bg-[--accent-rose]/8 transition-all`}
                    >
                        <LogOut size={16} strokeWidth={1.8} />
                        {!collapsed && <span className="text-[13px]">Sign Out</span>}
                    </button>

                    {/* Status */}
                    {!collapsed && (
                        <div className="flex items-center gap-2.5 px-3 pt-2">
                            <div className="relative flex items-center justify-center w-2 h-2">
                                <div className="absolute inset-0 bg-[--accent-emerald] rounded-full animate-ping opacity-40" />
                                <div className="relative w-2 h-2 bg-[--accent-emerald] rounded-full" />
                            </div>
                            <span className="text-[10px] font-medium text-[--text-muted]">All Systems Online</span>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}
