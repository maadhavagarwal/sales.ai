"use client"

import { useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import PageHeader from "@/components/layout/PageHeader"
import { motion, AnimatePresence } from "framer-motion"
import WorkspaceInvoicing from "@/components/workspace/WorkspaceInvoicing"
import WorkspaceCRM from "@/components/workspace/WorkspaceCRM"
import WorkspaceMarketing from "@/components/workspace/WorkspaceMarketing"
import WorkspaceInventory from "@/components/workspace/WorkspaceInventory"
import WorkspaceAccounts from "@/components/workspace/WorkspaceAccounts"
import { useStore } from "@/store/useStore"

export default function WorkspacePage() {
    const [activeSection, setActiveSection] = useState<"billing" | "crm" | "marketing" | "inventory" | "accounts">("billing")
    const { results } = useStore()

    const sections = [
        { id: "billing", label: "Tax Invoicing", icon: "🧾", description: "GST Compliant Billing" },
        { id: "crm", label: "Client Directory", icon: "👥", description: "Statutory CRM Records" },
        { id: "marketing", label: "Marketing Hub", icon: "🚀", description: "Growth & ROI Tracking" },
        { id: "inventory", label: "Fixed Assets", icon: "📦", description: "Asset & Stock Tracking" },
        { id: "accounts", label: "Accounting", icon: "🏛️", description: "Ledger & Asset Control" },
    ]

    return (
        <>
            <Sidebar />
            <div className="main-content">
                <PageHeader
                    title="Enterprise Workspace"
                    subtitle="Integrated operational management and business logistics workstation"
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
                    {sections.map((s) => (
                        <motion.div
                            key={s.id}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveSection(s.id as any)}
                            style={{
                                flex: 1,
                                minWidth: "200px",
                                padding: "1.25rem",
                                borderRadius: "12px",
                                background: activeSection === s.id ? "var(--gradient-primary)" : "rgba(255,255,255,0.03)",
                                border: "1px solid",
                                borderColor: activeSection === s.id ? "var(--primary-400)" : "rgba(255,255,255,0.05)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "1rem"
                            }}
                        >
                            <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
                            <div>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: activeSection === s.id ? "white" : "var(--text-primary)" }}>{s.label}</h3>
                                <p style={{ fontSize: "0.7rem", color: activeSection === s.id ? "rgba(255,255,255,0.8)" : "var(--text-muted)" }}>{s.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeSection === "billing" && <WorkspaceInvoicing />}
                        {activeSection === "crm" && <WorkspaceCRM />}
                        {activeSection === "marketing" && <WorkspaceMarketing />}
                        {activeSection === "inventory" && <WorkspaceInventory />}
                        {activeSection === "accounts" && <WorkspaceAccounts />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </>
    )
}
