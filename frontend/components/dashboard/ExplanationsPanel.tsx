"use client"

import { motion } from "framer-motion"

export default function ExplanationsPanel({ explanations }: { explanations: string[] }) {
    if (!explanations || explanations.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Explainable AI</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        How the AI arrived at its predictions
                    </p>
                </div>
                <span className="badge badge-primary">XAI</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {explanations.map((exp, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        style={{
                            padding: "0.75rem 1rem",
                            background: "rgba(99,102,241,0.04)",
                            borderRadius: "var(--radius-md)",
                            borderLeft: "3px solid var(--primary-500)",
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                            lineHeight: 1.6,
                        }}
                    >
                        {exp}
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}
