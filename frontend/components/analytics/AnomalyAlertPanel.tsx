"use client"

import { motion } from "framer-motion"

export default function AnomalyAlertPanel({ anomalies }: { anomalies: string[] }) {
    if (!anomalies || anomalies.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="chart-card"
            style={{ border: "1px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.02)" }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(244,63,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-rose)" }}>🚨</div>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Isolation Forest Anomaly Lab</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Detected {anomalies.length} extreme statistical outliers</p>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {anomalies.map((text, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ x: 5 }}
                        style={{
                            padding: "1rem",
                            background: "var(--surface-2)",
                            borderRadius: "10px",
                            border: "1px solid rgba(244,63,94,0.1)",
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                            lineHeight: 1.5,
                            borderLeft: "3px solid var(--accent-rose)"
                        }}
                    >
                        {text}
                    </motion.div>
                ))}
            </div>

            <div style={{ marginTop: "1rem", fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                Top 1% anomalous data points flagged for manual executive review.
            </div>
        </motion.div>
    )
}
