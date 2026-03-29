"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, Button, Badge } from "@/components/ui"
import { uploadBulkFiles, getWorkspaceIntegrity } from "@/services/api"
import { useToast } from "@/components/ui/Toast"
import { getAuthToken } from "@/lib/session"

interface FileStatus {
    name: string
    category: string
    records: number
    status: "PENDING" | "PROCESSING" | "SUCCESS" | "ERROR"
    error?: string
}

interface IntegrityData {
    invoices: number
    customers: number
    inventory: number
    personnel: number
    ledger: number
}

const NEXUS_INTEGRITY_KEY = "workspace-nexus-integrity"
const NEXUS_RESULTS_KEY = "workspace-nexus-upload-results"
const NEXUS_SHOW_RESULTS_KEY = "workspace-nexus-show-results"

const readStoredJson = <T,>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

const toCount = (value: any): number => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

const deriveIntegrityFromAnalysis = (analysis: FileStatus[]): Partial<IntegrityData> => {
    const next: Partial<IntegrityData> = {}
    for (const row of analysis) {
        const count = toCount(row.records)
        const cat = String(row.category || "").toUpperCase()
        if (!count) continue
        if (cat.includes("INVOICE")) next.invoices = (next.invoices || 0) + count
        if (cat.includes("CUSTOMER")) next.customers = (next.customers || 0) + count
        if (cat.includes("INVENTORY")) next.inventory = (next.inventory || 0) + count
        if (cat.includes("STAFF") || cat.includes("PERSONNEL") || cat.includes("HR")) next.personnel = (next.personnel || 0) + count
        if (cat.includes("LEDGER") || cat.includes("ACCOUNT")) next.ledger = (next.ledger || 0) + count
    }
    return next
}

export default function WorkspaceNexus() {
    const [isUploading, setIsUploading] = useState(false)
    const [integrity, setIntegrity] = useState<IntegrityData | null>(() => readStoredJson<IntegrityData | null>(NEXUS_INTEGRITY_KEY, null))
    const [uploadResults, setUploadResults] = useState<FileStatus[]>(() => readStoredJson<FileStatus[]>(NEXUS_RESULTS_KEY, []))
    const [showResults, setShowResults] = useState<boolean>(() => readStoredJson<boolean>(NEXUS_SHOW_RESULTS_KEY, false))
    const { showToast } = useToast()

    useEffect(() => {
        if (typeof window === "undefined") return
        localStorage.setItem(NEXUS_INTEGRITY_KEY, JSON.stringify(integrity || null))
    }, [integrity])

    useEffect(() => {
        if (typeof window === "undefined") return
        localStorage.setItem(NEXUS_RESULTS_KEY, JSON.stringify(uploadResults))
        localStorage.setItem(NEXUS_SHOW_RESULTS_KEY, JSON.stringify(showResults))
    }, [uploadResults, showResults])

    const fetchIntegrity = useCallback(async () => {
        if (!getAuthToken()) {
            // Keep last known counters visible if auth is transiently unavailable.
            return
        }
        try {
            const data = await getWorkspaceIntegrity()
            const hasIntegrityPayload =
                data &&
                typeof data === "object" &&
                ["invoices", "customers", "inventory", "personnel", "ledger"].some(
                    (k) => Object.prototype.hasOwnProperty.call(data, k),
                )

            if (hasIntegrityPayload) {
                setIntegrity({
                    invoices: toCount((data as any).invoices),
                    customers: toCount((data as any).customers),
                    inventory: toCount((data as any).inventory),
                    personnel: toCount((data as any).personnel),
                    ledger: toCount((data as any).ledger),
                })
            }
        } catch (error) {
            // Integrity is optional during auth/bootstrap; keep last cached values.
        }
    }, [])

    useEffect(() => {
        fetchIntegrity()
    }, [fetchIntegrity])

    const handleBulkUpload = async (files: FileList) => {
        if (!files.length) return

        setIsUploading(true)
        setShowResults(true)
        const fileArray = Array.from(files)
        
        // Initial pending states
        setUploadResults(fileArray.map(f => ({
            name: f.name,
            category: "ANALYZING...",
            records: 0,
            status: "PROCESSING"
        })))

        try {
            const result = await uploadBulkFiles(fileArray)
            if (result.status === "SUCCESS") {
                const normalized = (result.analysis || []).map((r: any) => ({
                    name: r.name,
                    category: String(r.category || (r.status === "ERROR" ? "PROCESSING_ERROR" : "UNKNOWN")),
                    records: toCount(r.records ?? r.rows ?? r.count),
                    status: r.status
                }))
                setUploadResults(normalized)

                // Optimistically preserve right-side counters even before API refresh returns.
                const derived = deriveIntegrityFromAnalysis(normalized)
                if (Object.keys(derived).length > 0) {
                    setIntegrity((prev) => ({
                        invoices: Math.max(toCount(prev?.invoices), toCount(derived.invoices)),
                        customers: Math.max(toCount(prev?.customers), toCount(derived.customers)),
                        inventory: Math.max(toCount(prev?.inventory), toCount(derived.inventory)),
                        personnel: Math.max(toCount(prev?.personnel), toCount(derived.personnel)),
                        ledger: Math.max(toCount(prev?.ledger), toCount(derived.ledger)),
                    }))
                }

                showToast("success", "Enterprise Sync Complete", "Multi-file ingestion successful.")
                fetchIntegrity()
            } else {
                showToast("error", "Sync Error", "Partial failure in data ingestion.")
            }
        } catch (error) {
            showToast("error", "Network Error", "Failed to reach enterprise engine.")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-8 pb-20">
            {/* ── Central Command Core ── */}
            <div className="relative h-[300px] w-full flex items-center justify-center overflow-hidden rounded-3xl border border-[--border-default] bg-[--surface-1] backdrop-blur-xl mb-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary-glow)_0%,transparent_70%)] opacity-20" />
                
                {/* Orbital Rings */}
                {[1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full border border-[--border-subtle]"
                        style={{ width: i * 200, height: i * 200 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20 / i, repeat: Infinity, ease: "linear" }}
                    />
                ))}

                <div className="relative z-10 text-center">
                    <motion.div
                        animate={{ 
                            scale: isUploading ? [1, 1.1, 1] : 1,
                            filter: isUploading ? "brightness(1.5)" : "brightness(1)"
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.5)] mx-auto mb-6"
                    >
                        <span className="text-3xl">🧩</span>
                    </motion.div>
                    <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-[--text-primary]">Data Nexus</h2>
                    <p className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest mt-2 px-10">
                        {isUploading ? "Neural Engine Active: Segregating Data Silos" : "Central operational core for bulk data orchestration"}
                    </p>
                </div>

                {/* Processing Nodes */}
                <AnimatePresence>
                    {isUploading && uploadResults.map((file, idx) => (
                        <motion.div
                            key={file.name}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ 
                                opacity: 1, 
                                scale: 1,
                                x: Math.sin(idx) * 150,
                                y: Math.cos(idx) * 100
                            }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute p-3 rounded-xl bg-[--surface-2] border border-[--border-default] backdrop-blur-md"
                        >
                            <p className="text-[8px] font-black text-[--text-primary] truncate max-w-[80px]">{file.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <div className="w-1 h-1 rounded-full bg-[--accent-cyan] animate-pulse" />
                                <span className="text-[6px] text-[--accent-cyan] uppercase font-bold">SEGREGATING</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Bulk Import Card ── */}
                <Card variant="glass" className="lg:col-span-2 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="text-6xl grayscale">📤</span>
                    </div>
                    
                    <h3 className="text-sm font-black uppercase tracking-widest text-[--text-primary] mb-2 flex items-center gap-2">
                        Enterprise Bulk Ingestion
                        <Badge variant="pro" size="sm">V2.0</Badge>
                    </h3>
                    <p className="text-xs text-[--text-muted] font-medium mb-8 leading-relaxed max-w-md">
                        Upload all your business CSVs at once. Our engine automatically recognizes Staff, Invoices, Customers, Stock and Financial Ledgers.
                    </p>

                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault()
                            if (e.dataTransfer.files) handleBulkUpload(e.dataTransfer.files)
                        }}
                        className={`
                            relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-500
                            ${isUploading 
                                ? "border-[--primary] bg-[--primary]/5 shadow-[0_0_30px_rgba(99,102,241,0.2)]" 
                                : "border-[--border-default] hover:border-[--primary]/40 hover:bg-[--surface-2]"}
                        `}
                    >
                        <input 
                            type="file" 
                            multiple 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={(e) => e.target.files && handleBulkUpload(e.target.files)}
                        />
                        <div className="text-center">
                            <div className="text-3xl mb-4">{isUploading ? "🧬" : "📄"}</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[--text-primary]">
                                {isUploading ? "Ingestion in Progress..." : "Drag & Drop Multi-Files"}
                            </p>
                            <p className="text-[9px] text-[--text-muted] mt-2 font-bold uppercase tracking-tight">
                                CSV, XLSX, XLS supported
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {uploadResults.map((res, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-3 rounded-xl bg-[--surface-2] border border-[--border-subtle]"
                            >
                                <p className="text-[9px] font-black text-[--text-primary] truncate">{res.name}</p>
                                <Badge 
                                    size="xs" 
                                    variant={res.status === 'ERROR' ? 'outline' : 'pro'} 
                                    className="mt-2 text-[7px]"
                                >
                                    {res.category}
                                </Badge>
                                <p className="text-[8px] mt-1 font-bold text-[--text-muted]">{res.records} Records</p>
                            </motion.div>
                        ))}
                    </div>

                    {uploadResults.length > 0 && showResults && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-4 rounded-xl bg-[--primary]/10 border border-[--primary]/20 flex items-center justify-between"
                        >
                            <div>
                                <p className="text-[9px] font-black text-[--text-primary] uppercase tracking-widest">
                                    {uploadResults.length} File{uploadResults.length !== 1 ? "s" : ""} Processed
                                </p>
                                <p className="text-[8px] text-[--text-muted] font-bold mt-1">
                                    Total Records: {uploadResults.reduce((sum, r) => sum + r.records, 0).toLocaleString()}
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                    setUploadResults([])
                                    setShowResults(false)
                                    if (typeof window !== "undefined") {
                                        localStorage.removeItem(NEXUS_RESULTS_KEY)
                                        localStorage.removeItem(NEXUS_SHOW_RESULTS_KEY)
                                    }
                                }}
                                className="text-[9px] font-black uppercase tracking-widest"
                            >
                                Clear Results
                            </Button>
                        </motion.div>
                    )}
                </Card>

                {/* ── System Integrity Silos ── */}
                <Card variant="glass" className="p-8">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[--text-primary] mb-6">Silo Persistance</h3>
                    
                    <div className="space-y-6">
                        {[
                            { label: "Invoices", count: integrity?.invoices || 0, color: "var(--primary)" },
                            { label: "Customers", count: integrity?.customers || 0, color: "var(--accent-cyan)" },
                            { label: "Inventory", count: integrity?.inventory || 0, color: "var(--accent-amber)" },
                            { label: "Personnel", count: integrity?.personnel || 0, color: "var(--accent-rose)" },
                            { label: "Financial Ledger", count: integrity?.ledger || 0, color: "var(--accent-emerald)" },
                        ].map((silo, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">{silo.label}</span>
                                    <span className="text-[10px] font-black text-[--text-primary]">{silo.count.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 w-full bg-[--surface-3] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: silo.count > 0 ? "100%" : "5%" }}
                                        transition={{ duration: 1, delay: i * 0.1 }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: silo.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 p-4 rounded-2xl bg-[--primary]/10 border border-[--primary]/20">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">🛡️</span>
                            <div>
                                <p className="text-[9px] font-black text-[--text-primary] uppercase tracking-widest leading-normal">Data Encryption Active</p>
                                <p className="text-[8px] text-[--text-muted] font-bold mt-1 leading-relaxed">
                                    All personal data and financial records are AES-256 encrypted at rest.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
