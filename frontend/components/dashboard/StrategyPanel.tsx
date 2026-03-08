"use client"

import { motion } from "framer-motion"

export default function StrategyPanel({ strategy }: { strategy: string[] }) {
    if (!strategy || strategy.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                        AI Strategy Recommendations
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {strategy.length} recommendations generated
                    </p>
                </div>
                <span className="badge badge-success">AI Generated</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {strategy.map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        style={{
                            display: "flex",
                            gap: "0.75rem",
                            alignItems: "flex-start",
                            padding: "0.875rem 1rem",
                            background: "rgba(255,255,255,0.02)",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                            transition: "all 250ms ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"
                            e.currentTarget.style.background = "rgba(99,102,241,0.05)"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-subtle)"
                            e.currentTarget.style.background = "rgba(255,255,255,0.02)"
                        }}
                    >
                        <div
                            style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                background: "var(--gradient-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                flexShrink: 0,
                                marginTop: "1px",
                            }}
                        >
                            {i + 1}
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                            {s}
                        </p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}