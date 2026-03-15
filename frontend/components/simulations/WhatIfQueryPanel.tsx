"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { simulateWhatIf } from "@/services/api"
import { useStore } from "@/store/useStore"

export default function WhatIfQueryPanel() {
    const [query, setQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const { currencySymbol } = useStore()

    const handleSimulate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setLoading(true)
        setResult(null)
        try {
            const res = await simulateWhatIf(query)
            setResult(res)
        } catch (err) {
            console.error("Simulation failed", err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="chart-card"
            style={{ padding: "2rem" }}
        >
            <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Neural What-If Simulator</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Ask the AI about hypothetical business scenarios (e.g., "What if we lose 20% of our enterprise clients?")
                </p>
            </div>

            <form onSubmit={handleSimulate} style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Describe a scenario..."
                    className="form-input"
                    style={{ flex: 1, padding: "1rem", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}
                />
                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={loading || !query.trim()}
                    style={{ padding: "0 2rem" }}
                >
                    {loading ? "Simulating..." : "Run Simulation"}
                </button>
            </form>

            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "2rem" }}>
                            <div>
                                <span className="badge badge-primary" style={{ marginBottom: "1rem" }}>{result.scenario}</span>
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Projected Revenue Shift</p>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
                                        <h4 style={{ fontSize: "2.5rem", fontWeight: 900 }}>
                                            {currencySymbol}{result.hypothetical_revenue.toLocaleString()}
                                        </h4>
                                        <span style={{ 
                                            color: result.impact_percentage >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)",
                                            fontSize: "1.25rem",
                                            fontWeight: 800
                                        }}>
                                            {result.impact_percentage >= 0 ? "+" : ""}{result.impact_percentage}%
                                        </span>
                                    </div>
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                        Baseline: {currencySymbol}{result.baseline_revenue.toLocaleString()}
                                    </p>
                                </div>

                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <Metric label="Confidence" value={`${(result.confidence_score * 100).toFixed(0)}%`} emphasize />
                                    <Metric label="Engine" value="Neural Trajectory MC" />
                                </div>
                            </div>

                            <div style={{ background: "var(--gradient-surface)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-lg)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                                    <span style={{ fontSize: "1.25rem" }}>🧠</span>
                                    <h4 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", color: "white" }}>AI Strategic Advice</h4>
                                </div>
                                <p style={{ fontSize: "1rem", color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
                                    "{result.neural_advice}"
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

function Metric({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
    return (
        <div style={{ background: "rgba(255,255,255,0.02)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</p>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: emphasize ? "var(--accent-emerald)" : "white" }}>{value}</p>
        </div>
    )
}
