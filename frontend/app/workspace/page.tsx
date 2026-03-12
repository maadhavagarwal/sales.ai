"use client"

import { useState, useRef, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { motion, AnimatePresence } from "framer-motion"
import WorkspaceInvoicing from "@/components/workspace/WorkspaceInvoicing"
import WorkspaceCRM from "@/components/workspace/WorkspaceCRM"
import WorkspaceMarketing from "@/components/workspace/WorkspaceMarketing"
import WorkspaceInventory from "@/components/workspace/WorkspaceInventory"
import WorkspaceAccounts from "@/components/workspace/WorkspaceAccounts"
import { Card, Button, Badge } from "@/components/ui"
import { uploadCSV, syncWorkspaceToDashboard } from "@/services/api"
import { useStore } from "@/store/useStore"
import { useToast } from "@/components/ui/Toast"

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
    const [isDragging, setIsDragging] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState<{ rows: number; file: string } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const { incrementSyncCount, setResults, setFileName } = useStore()
    const { showToast } = useToast()

    const sections: Section[] = [
        { id: "billing", label: "Financial Engine", icon: "FI", description: "GST Compliant Invoicing", color: "var(--primary)" },
        { id: "crm", label: "Core Directory", icon: "CR", description: "Strategic Client CRM", color: "var(--accent-cyan)" },
        { id: "marketing", label: "Marketing Hub", icon: "MK", description: "Growth & ROI Tracking", color: "var(--accent-violet)" },
        { id: "inventory", label: "Asset Lab", icon: "ST", description: "Inventory & Stock Optimization", color: "var(--accent-amber)" },
        { id: "accounts", label: "Accounting Core", icon: "AC", description: "Ledger & Statutory Control", color: "var(--accent-emerald)" },
    ]

    const handleFile = useCallback(async (file: File) => {
        const isValid = file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
        if (!isValid) {
            showToast("warning", "Invalid File", "Please upload a CSV or Excel file.")
            return
        }
        setIsSyncing(true)
        setSyncResult(null)
        try {
            const data = await uploadCSV(file)
            if (data.error) {
                showToast("error", "Import Failed", data.error)
                return
            }
            setResults(data)
            setFileName(file.name)
            setSyncResult({ rows: data.rows ?? 0, file: file.name })
            incrementSyncCount()
            showToast("success", "Workspace Synced", `${file.name} · ${data.rows ?? 0} rows imported into all modules.`)
        } catch (err: any) {
            const msg = err?.response?.data?.detail || "Import failed. Please try again."
            showToast("error", "Import Error", msg)
        } finally {
            setIsSyncing(false)
        }
    }, [incrementSyncCount, setResults, setFileName, showToast])

    const handleSyncFromDataset = useCallback(async () => {
        setIsSyncing(true)
        setSyncResult(null)
        try {
            const data = await syncWorkspaceToDashboard()
            
            if (data.error) {
                showToast("error", "Sync Failed", data.error)
                return
            }
            
            setResults(data)
            setFileName("Live ERP Stream")
            setSyncResult({ rows: data.rows ?? 0, file: "Live ERP Stream" })
            incrementSyncCount()
            showToast("success", "Dataset Synced", `Successfully synced current active dataset into Workspace modules.`)
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err.message || "Failed to sync from existing dataset."
            showToast("error", "Sync Error", msg)
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
                                            w-12 h-12 rounded-[--radius-sm] flex items-center justify-center text-sm font-black tracking-widest
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

                {/* ── Active Section ── */}
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
