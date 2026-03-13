"use client"

import { motion } from "framer-motion"

export default function InsightsPanel({ insights }: { insights: string[] }) {
    const icons = ["💡", "📌", "🎯", "⚡", "🔍"]
    
    if (!insights || insights.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="chart-card"
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Key Insights</h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            Extracting insights from data...
                        </p>
                    </div>
                </div>
                <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    <div className="animate-pulse">Discovering patterns...</div>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Key Insights</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Auto-discovered from your data
                    </p>
                </div>
                <span className="badge badge-warning">AI Insights</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {insights.map((insight, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        style={{
                            display: "flex",
                            gap: "0.75rem",
                            alignItems: "center",
                            padding: "0.75rem 1rem",
                            background: "rgba(255,255,255,0.02)",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                            transition: "all 200ms ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"
                            e.currentTarget.style.background = "rgba(245,158,11,0.04)"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-subtle)"
                            e.currentTarget.style.background = "rgba(255,255,255,0.02)"
                        }}
                    >
                        <span style={{ fontSize: "1.15rem" }}>{icons[i % icons.length]}</span>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{insight}</p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}
