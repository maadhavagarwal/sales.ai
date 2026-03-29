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
import WorkspaceNexus from "@/components/workspace/WorkspaceNexus"
import { Card, Button, Badge } from "@/components/ui"
import { uploadCSV, syncWorkspaceToDashboard, getUserState, saveUserState } from "@/services/api"
import { getAuthToken } from "@/lib/session"
import { useStore } from "@/store/useStore"
import { useToast } from "@/components/ui/Toast"

import { useSearchParams } from "next/navigation"

type SectionId = "nexus" | "billing" | "crm" | "marketing" | "inventory" | "accounts" | "hr" | "finance"

const SUPPORTED_SECTIONS: SectionId[] = ["nexus", "billing", "crm", "marketing", "inventory", "accounts", "hr", "finance"]

const isSupportedSection = (section: string | null): section is SectionId => {
    if (!section) return false
    return SUPPORTED_SECTIONS.includes(section as SectionId)
}

interface Section {
    id: SectionId
    label: string
    icon: string
    description: string
    color: string
}

function WorkspaceContent() {
    const searchParams = useSearchParams()
    const rawInitialSection = searchParams.get("section")
    const initialSection = isSupportedSection(rawInitialSection) ? rawInitialSection : "nexus"
    const [activeSection, setActiveSection] = useState<SectionId>(initialSection)
    const [visitedSections, setVisitedSections] = useState<SectionId[]>([initialSection])

    // Load persisted section on mount (Backend Sync)
    useEffect(() => {
        const syncState = async () => {
            const token = getAuthToken()
            if (!token) {
                const persistedSection = localStorage.getItem("workspace-active-section") as SectionId
                if (isSupportedSection(persistedSection)) {
                    setActiveSection(persistedSection)
                }
                return
            }
            try {
                const state = await getUserState()
                if (state && isSupportedSection(state.activeSection)) {
                    setActiveSection(state.activeSection as SectionId)
                } else {
                    // Fallback to localStorage if backend empty
                    const persistedSection = localStorage.getItem("workspace-active-section") as SectionId
                    if (isSupportedSection(persistedSection)) {
                        setActiveSection(persistedSection)
                    }
                }
            } catch (err: any) {
                // Gracefully fallback to localStorage if backend sync fails (endpoint may not exist)
                const persistedSection = localStorage.getItem("workspace-active-section") as SectionId
                if (isSupportedSection(persistedSection)) {
                    setActiveSection(persistedSection)
                }
            }
        }
        syncState()
    }, [])

    // Persist section changes
    useEffect(() => {
        localStorage.setItem("workspace-active-section", activeSection)
        const syncToBackend = async () => {
             if (!getAuthToken()) return
             try {
                 await saveUserState({ activeSection })
             } catch (err) {
                 // Silent fail - backend endpoint may not exist, localStorage is primary persistence
             }
        }
        syncToBackend()
    }, [activeSection])

    // Lazy keep-alive: mount a section once visited, keep it mounted afterwards.
    useEffect(() => {
        setVisitedSections((prev) => (prev.includes(activeSection) ? prev : [...prev, activeSection]))
    }, [activeSection])

    useEffect(() => {
        const section = searchParams.get("section") as SectionId
        if (isSupportedSection(section)) {
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
        { id: "crm", label: "Sales CRM", icon: "CR", description: "Deals & Targets", color: "#f97316" },
        { id: "marketing", label: "Growth Ops", icon: "MK", description: "Campaign Intelligence", color: "#14b8a6" },
        { id: "hr", label: "Workforce", icon: "HR", description: "HR & Employees", color: "var(--accent-rose)" },
        { id: "finance", label: "Finance Center", icon: "FN", description: "Treasury Center", color: "var(--accent-emerald)" },
        { id: "inventory", label: "Asset Lab", icon: "ST", description: "Stock Optimization", color: "var(--accent-amber)" },
        { id: "accounts", label: "Ledger Core", icon: "AC", description: "Bookkeeping", color: "#64748b" },
    ]

    const handleFile = useCallback(async (file: File) => {
        try {
            if (!getAuthToken()) {
                showToast("warning", "Authentication Required", "Please login before uploading data.")
                return
            }
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
            if (!getAuthToken()) {
                showToast("warning", "Authentication Required", "Please login before syncing workspace.")
                return
            }
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
            <div className="page-rhythm">
                {/* ── CSV Import Banner ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all duration-300 overflow-hidden
                        ${isDragging
                            ? "border-[--primary] bg-[--primary]/10 shadow-[0_0_40px_rgba(99,102,241,0.2)]"
                            : "border-white/10 bg-white/2"
                        }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    {/* Animated gradient accent */}
                    <div className="absolute inset-0 bg-[--primary]/5 pointer-events-none" />

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-[--primary]/15 border border-[--primary]/30 flex items-center justify-center text-xl shrink-0">
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

                    <div className="flex items-center gap-3 relative z-10 shrink-0">
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
                            className="tracking-widest text-[10px]"
                        >
                            {syncResult ? "RE-IMPORT" : "IMPORT FILE"}
                        </Button>
                    </div>
                </motion.div>

                {/* ── Section Nav ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
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

                {/* ── Active Section ──
                    Keep panels mounted so per-tab local state survives switching.
                */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                >
                    {visitedSections.includes("nexus") && (
                        <div className={activeSection === "nexus" ? "block" : "hidden"}>
                            <WorkspaceNexus />
                        </div>
                    )}
                    {visitedSections.includes("billing") && (
                        <div className={activeSection === "billing" ? "block" : "hidden"}>
                            <WorkspaceInvoicing />
                        </div>
                    )}
                    {visitedSections.includes("crm") && (
                        <div className={activeSection === "crm" ? "block" : "hidden"}>
                            <WorkspaceCRM />
                        </div>
                    )}
                    {visitedSections.includes("marketing") && (
                        <div className={activeSection === "marketing" ? "block" : "hidden"}>
                            <WorkspaceMarketing />
                        </div>
                    )}
                    {visitedSections.includes("inventory") && (
                        <div className={activeSection === "inventory" ? "block" : "hidden"}>
                            <WorkspaceInventory />
                        </div>
                    )}
                    {visitedSections.includes("accounts") && (
                        <div className={activeSection === "accounts" ? "block" : "hidden"}>
                            <WorkspaceAccounts />
                        </div>
                    )}
                    {visitedSections.includes("hr") && (
                        <div className={activeSection === "hr" ? "block" : "hidden"}>
                            <WorkspaceHR />
                        </div>
                    )}
                    {visitedSections.includes("finance") && (
                        <div className={activeSection === "finance" ? "block" : "hidden"}>
                            <WorkspaceFinance />
                        </div>
                    )}
                </motion.section>
            </div>
        </DashboardLayout>
    )
}

export default WorkspaceContent