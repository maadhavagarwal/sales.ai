"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { motion, AnimatePresence } from "framer-motion"
import WorkspaceInvoicing from "@/components/workspace/WorkspaceInvoicing"
import WorkspaceCRM from "@/components/workspace/WorkspaceCRM"
import WorkspaceMarketing from "@/components/workspace/WorkspaceMarketing"
import WorkspaceInventory from "@/components/workspace/WorkspaceInventory"
import WorkspaceAccounts from "@/components/workspace/WorkspaceAccounts"
import WorkspaceHR from "@/components/workspace/WorkspaceHR"
import WorkspaceFinance from "@/components/workspace/WorkspaceFinance"
import WorkspaceCommHub from "@/components/workspace/WorkspaceCommHub"
import WorkspaceNexus from "@/components/workspace/WorkspaceNexus"
import { Card, Button, Badge } from "@/components/ui"
import { uploadCSV, syncWorkspaceToDashboard, getUserState, saveUserState } from "@/services/api"
import { useStore } from "@/store/useStore"
import { useToast } from "@/components/ui/Toast"

import { useSearchParams } from "next/navigation"

type SectionId = "nexus" | "billing" | "crm" | "marketing" | "inventory" | "accounts" | "hr" | "finance" | "comm"

interface Section {
    id: SectionId
    label: string
    icon: string
    description: string
    color: string
}

function WorkspaceContent() {
    const searchParams = useSearchParams()
    const initialSection = (searchParams.get("section") as SectionId) || "nexus"
    const [activeSection, setActiveSection] = useState<SectionId>(initialSection)

    // Load persisted section on mount (Backend Sync)
    useEffect(() => {
        const syncState = async () => {
            try {
                const state = await getUserState()
                if (state && state.activeSection && ["nexus", "billing", "crm", "marketing", "inventory", "accounts", "hr", "finance", "comm"].includes(state.activeSection)) {
                    setActiveSection(state.activeSection as SectionId)
                } else {
                    // Fallback to localStorage if backend empty
                    const persistedSection = localStorage.getItem("workspace-active-section") as SectionId
                    if (persistedSection && ["nexus", "billing", "crm", "marketing", "inventory", "accounts", "hr", "finance", "comm"].includes(persistedSection)) {
                        setActiveSection(persistedSection)
                    }
                }
            } catch (err) {
                console.error("Failed to sync workspace state from backend")
            }
        }
        syncState()
    }, [])

    // Persist section changes
    useEffect(() => {
        localStorage.setItem("workspace-active-section", activeSection)
        const syncToBackend = async () => {
             try {
                 await saveUserState({ activeSection })
             } catch (err) {
                 // Silent fail for background sync
             }
        }
        syncToBackend()
    }, [activeSection])

    useEffect(() => {
        const section = searchParams.get("section") as SectionId
        if (section && ["nexus", "billing", "crm", "marketing", "inventory", "accounts", "hr", "finance", "comm"].includes(section)) {
            setActiveSection(section)
        }
    }, [searchParams])

    const [isDragging, setIsDragging] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState<{ rows: number; file: string } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const { incrementSyncCount, setResults, setFileName } = useStore()
    const { showToast } = useToast()

    const sections: Section[] = [
        { id: "nexus", label: "Enterprise Nexus", icon: "NX", description: "Central Data Portal", color: "var(--primary)" },
        { id: "billing", label: "Financial Engine", icon: "FI", description: "Invoicing & GST", color: "var(--accent-cyan)" },
        { id: "hr", label: "Workforce", icon: "HR", description: "HR & Employees", color: "var(--accent-rose)" },
        { id: "finance", label: "Finance Center", icon: "FN", description: "Treasury Center", color: "var(--accent-emerald)" },
        { id: "comm", label: "Comm Hub", icon: "CH", description: "Meetings & Mail", color: "var(--accent-violet)" },
        { id: "inventory", label: "Asset Lab", icon: "ST", description: "Stock Optimization", color: "var(--accent-amber)" },
        { id: "accounts", label: "Ledger Core", icon: "AC", description: "Bookkeeping", color: "#64748b" },
    ]

    const handleFile = useCallback(async (file: File) => {
        try {
            setIsSyncing(true)
            const result = await uploadCSV(file)
            setSyncResult({ rows: result.rows, file: file.name })
            incrementSyncCount()
            setResults(result)
            setFileName(file.name)
            showToast("success", "Upload Successful", "Data uploaded successfully!")
        } catch (error) {
            console.error("Upload failed:", error)
            showToast("error", "Upload Failed", "Please try again.")
        } finally {
            setIsSyncing(false)
        }
    }, [incrementSyncCount, setResults, setFileName, showToast])

    const handleSyncFromDataset = useCallback(async () => {
        try {
            setIsSyncing(true)
            const result = await syncWorkspaceToDashboard()
            setSyncResult({ rows: result.rows, file: "Current Dataset" })
            incrementSyncCount()
            setResults(result)
            setFileName("Current Dataset")
            showToast("success", "Sync Successful", "Workspace synced successfully!")
        } catch (error) {
            console.error("Sync failed:", error)
            showToast("error", "Sync Failed", "Please try again.")
        } finally {
            setIsSyncing(false)
        }
    }, [incrementSyncCount, setResults, setFileName, showToast])

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
    }

    return (
        <DashboardLayout
            title="Enterprise Workspace"
            subtitle="Centralized operational hub for statutory compliance and logistical orchestration."
        >
            <div className="flex flex-col gap-12">
                {/* ── CSV Import Banner ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all duration-300 overflow-hidden
                        ${isDragging
                            ? "border-[--primary] bg-[--primary]/10 shadow-[0_0_40px_rgba(99,102,241,0.2)]"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    {/* Animated gradient accent */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[--primary]/5 via-transparent to-[--accent-cyan]/5 pointer-events-none" />

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-[--primary]/15 border border-[--primary]/30 flex items-center justify-center text-xl flex-shrink-0">
                            {isSyncing ? "⏳" : syncResult ? "✅" : "📁"}
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-white">
                                {isSyncing ? "Syncing Data Stream..." : syncResult ? `Last Import: ${syncResult.file}` : "Import Dataset to Workspace"}
                            </p>
                            <p className="text-[10px] font-bold text-[--text-muted] mt-1">
                                {isSyncing
                                    ? "Parsing CSV/Excel and populating all modules..."
                                    : syncResult
                                        ? `${syncResult.rows.toLocaleString()} rows distributed to CRM, Inventory & Ledger`
                                        : "Drop a CSV / Excel file here to instantly populate Customers, Inventory & Ledger entries"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 relative z-10 flex-shrink-0">
                        {syncResult && (
                            <Badge variant="pro" pulse size="sm" className="tracking-widest hidden sm:flex">
                                SYNCED
                            </Badge>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSyncFromDataset}
                            loading={isSyncing}
                            className="tracking-widest text-[10px] hidden lg:flex"
                        >
                            SYNC CURRENT DATASET
                        </Button>
                        <Button
                            variant={syncResult ? "outline" : "pro"}
                            size="sm"
                            onClick={() => fileRef.current?.click()}
                            loading={isSyncing}
                            className="tracking-widest text-[10px] shadow-[--shadow-glow]"
                        >
                            {syncResult ? "RE-IMPORT" : "IMPORT FILE"}
                        </Button>
                    </div>
                </motion.div>

                {/* ── Section Nav ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
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
                                        ? `border-[${s.color}] shadow-[0_0_20px_${s.color}40]`
                                        : "border-white/10 hover:border-white/20"
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                                        style={{ backgroundColor: `${s.color}20`, color: s.color }}
                                    >
                                        {s.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-white">{s.label}</h4>
                                        <p className="text-[9px] font-bold text-[--text-muted] uppercase tracking-tight">{s.description}</p>
                                    </div>
                                </div>
                                <div className="w-full h-1 rounded-full bg-white/10">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: s.color }}
                                        initial={{ width: 0 }}
                                        animate={{ width: activeSection === s.id ? "100%" : "0%" }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* ── Active Section ── */}
                <AnimatePresence mode="wait">
                    <motion.section
                        key={activeSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1"
                    >
                        {activeSection === "nexus" && <WorkspaceNexus />}
                        {activeSection === "billing" && <WorkspaceInvoicing />}
                        {activeSection === "crm" && <WorkspaceCRM />}
                        {activeSection === "marketing" && <WorkspaceMarketing />}
                        {activeSection === "inventory" && <WorkspaceInventory />}
                        {activeSection === "accounts" && <WorkspaceAccounts />}
                        {activeSection === "hr" && <WorkspaceHR />}
                        {activeSection === "finance" && <WorkspaceFinance />}
                        {activeSection === "comm" && <WorkspaceCommHub />}
                    </motion.section>
                </AnimatePresence>
            </div>
        </DashboardLayout>
    )
}

export default WorkspaceContent