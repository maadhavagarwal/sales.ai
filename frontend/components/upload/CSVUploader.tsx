"use client"

import { useRef, useState } from "react"
import { uploadCSV } from "@/services/api"
import { useStore } from "@/store/useStore"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/Toast"

export default function CSVUploader() {
    const fileRef = useRef<HTMLInputElement>(null)
    const [dragActive, setDragActive] = useState(false)
    const { setResults, setIsUploading, setUploadProgress, setFileName, isUploading, uploadProgress, incrementSyncCount } = useStore()
    const [error, setError] = useState<string | null>(null)
    const { showToast } = useToast()

    const handleFile = async (file: File) => {
        const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
        const isCSV = file.name.endsWith(".csv")
        if (!isCSV && !isExcel) {
            const msg = "Please upload a CSV or Excel file"
            setError(msg)
            showToast("warning", "Invalid File", msg)
            return
        }

        setError(null)
        setIsUploading(true)
        setUploadProgress(0)
        setFileName(file.name)

        try {
            const data = await uploadCSV(file, (progress) => {
                setUploadProgress(progress)
            })

            if (data.error) {
                setError(data.error)
                showToast("error", "Upload Failed", data.error)
                setIsUploading(false)
                return
            }

            setResults(data)
            incrementSyncCount()
            setUploadProgress(100)
            showToast("success", "Dataset Loaded", `${file.name} · ${data.rows ?? "?"} rows processed`)
        } catch (err: any) {
            const msg = err?.response?.data?.detail || "Failed to process dataset. Please try again."
            setError(msg)
            showToast("error", "Upload Error", msg)
        } finally {
            setIsUploading(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0])
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div
                className={`upload-zone ${dragActive ? "active" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
            >
                <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleChange}
                    style={{ display: "none" }}
                    id="csv-file-input"
                />

                <AnimatePresence mode="wait">
                    {isUploading ? (
                        <motion.div
                            key="uploading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}
                        >
                            <div className="spinner spinner-lg" />
                            <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                Processing your dataset...
                            </p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                Running AI analytics, ML pipeline & simulations
                            </p>
                            <div style={{ width: "260px", marginTop: "0.5rem" }}>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}
                        >
                            <div
                                style={{
                                    width: "64px",
                                    height: "64px",
                                    borderRadius: "var(--radius-xl)",
                                    background: "var(--gradient-surface)",
                                    border: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.5rem",
                                }}
                            >
                                Files
                            </div>
                            <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                Drop your dataset here
                            </p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                or <span style={{ color: "var(--primary-400)", fontWeight: 500 }}>browse files</span> to upload
                            </p>
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                <span className="badge badge-primary">CSV or Excel</span>
                                <span className="badge badge-success">Up to 100MB</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                            marginTop: "1rem",
                            padding: "0.75rem 1rem",
                            background: "rgba(244,63,94,0.1)",
                            border: "1px solid rgba(244,63,94,0.25)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--accent-rose)",
                            fontSize: "0.85rem",
                        }}
                    >
                        Warning: {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
