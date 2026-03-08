"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { motion, AnimatePresence } from "framer-motion"
import WorkspaceInvoicing from "@/components/workspace/WorkspaceInvoicing"
import WorkspaceCRM from "@/components/workspace/WorkspaceCRM"
import WorkspaceMarketing from "@/components/workspace/WorkspaceMarketing"
import WorkspaceInventory from "@/components/workspace/WorkspaceInventory"
import WorkspaceAccounts from "@/components/workspace/WorkspaceAccounts"
import { Card } from "@/components/ui"

type SectionId = "billing" | "crm" | "marketing" | "inventory" | "accounts"

interface Section {
    id: SectionId
    label: string
    icon: string
    description: string
    color: string
}

export default function WorkspacePage() {
    const [activeSection, setActiveSection] = useState<SectionId>("billing")

    const sections: Section[] = [
        { id: "billing", label: "Financial Engine", icon: "💎", description: "GST Compliant Invoicing", color: "var(--primary)" },
        { id: "crm", label: "Core Directory", icon: "👥", description: "Strategic Client CRM", color: "var(--accent-cyan)" },
        { id: "marketing", label: "Marketing Hub", icon: "🚀", description: "Growth & ROI Tracking", color: "var(--accent-violet)" },
        { id: "inventory", label: "Asset Lab", icon: "📦", description: "Inventory & Stock Optimization", color: "var(--accent-amber)" },
        { id: "accounts", label: "Accounting Core", icon: "🏛️", description: "Ledger & Statutory Control", color: "var(--accent-emerald)" },
    ]

    return (
        <DashboardLayout
            title="Enterprise Workspace"
            subtitle="Centralized operational hub for statutory compliance and logistical orchestration."
        >
            <div className="flex flex-col gap-12">
                {/* Horizontal Navigation Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {sections.map((s) => (
                        <motion.div
                            key={s.id}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveSection(s.id)}
                            className="h-full"
                        >
                            <Card
                                variant={activeSection === s.id ? "bento" : "glass"}
                                padding="md"
                                className={`
                                    h-full cursor-pointer transition-all duration-300 border
                                    ${activeSection === s.id
                                        ? "shadow-[--shadow-glow] border-[--primary]/40"
                                        : "hover:bg-[--surface-1]/50 border-[--border-subtle]"}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`
                                            w-12 h-12 rounded-[--radius-sm] flex items-center justify-center text-xl
                                            ${activeSection === s.id ? "bg-white/10" : "bg-[--surface-1] border border-[--border-strong]"}
                                        `}
                                        style={activeSection === s.id ? { color: s.color } : {}}
                                    >
                                        {s.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`text-xs font-black uppercase tracking-widest ${activeSection === s.id ? "text-white" : "text-[--text-primary]"}`}>
                                            {s.label}
                                        </h3>
                                        <p className={`text-[10px] font-medium leading-tight truncate ${activeSection === s.id ? "text-white/70" : "text-[--text-muted]"}`}>
                                            {s.description}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Section Content with Animation */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="w-full"
                    >
                        <section className="space-y-10">
                            {activeSection === "billing" && <WorkspaceInvoicing />}
                            {activeSection === "crm" && <WorkspaceCRM />}
                            {activeSection === "marketing" && <WorkspaceMarketing />}
                            {activeSection === "inventory" && <WorkspaceInventory />}
                            {activeSection === "accounts" && <WorkspaceAccounts />}
                        </section>
                    </motion.div>
                </AnimatePresence>
            </div>
        </DashboardLayout>
    )
}
