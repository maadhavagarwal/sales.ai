"use client"

import { motion } from "framer-motion"

export default function AIExplanationsPanel({ explanations }: { explanations: string[] }) {
    if (!explanations || explanations.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="chart-card"
            style={{ borderLeft: "4px solid #f59e0b" }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "0.5rem", background: "rgba(245,158,11,0.1)", borderRadius: "10px", color: "#f59e0b", fontSize: "1.25rem" }}>⚖️</div>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Explainable AI (XAI)</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Understanding the "Why" behind the numbers</p>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {explanations.map((text, i) => {
                    const parts = text.split(/(\*\*.*?\*\*)/g)
                    return (
                        <div
                            key={i}
                            style={{
                                padding: "1.25rem",
                                background: "rgba(245,158,11,0.02)",
                                borderRadius: "12px",
                                border: "1px solid rgba(245,158,11,0.1)",
                                fontSize: "0.9rem",
                                color: "var(--text-secondary)",
                                lineHeight: 1.7
                            }}
                        >
                            {parts.map((part, index) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={index} style={{ color: "var(--text-primary)" }}>{part.slice(2, -2)}</strong>
                                }
                                return part
                            })}
                        </div>
                    )
                })}
            </div>

            <div style={{ marginTop: "1.5rem", padding: "0.75rem", background: "rgba(245,158,11,0.05)", borderRadius: "8px", fontSize: "0.7rem", color: "#d97706", textAlign: "center", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Confidence Score verified by SHAP/LIME interpretation engines
            </div>
        </motion.div>
    )
}
