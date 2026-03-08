"use client"

import { motion } from "framer-motion"

interface StrategicInsightsProps {
    insights: string[]
    recommendations: string[]
    strategy: string[]
}

export default function StrategicInsightsPanel({ insights, recommendations, strategy }: StrategicInsightsProps) {
    if (!insights?.length && !recommendations?.length && !strategy?.length) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="chart-card"
        >
            <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🎯 Strategic AI Roadmap</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Deep-learning derived business strategy and optimizations</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                {/* Insights Section */}
                <section>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-400)" }}>🔍</div>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>Market Insights</h4>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {insights?.map((item, i) => (
                            <div key={i} style={{ padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border-subtle)", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Strategy Section */}
                <section>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(168,85,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7" }}>🛡️</div>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>Tactical Strategy</h4>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {strategy?.map((item, i) => (
                            <div key={i} style={{ padding: "1rem", background: "rgba(168,85,247,0.03)", borderRadius: "12px", border: "1px solid rgba(168,85,247,0.1)", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                <span style={{ color: "#a855f7", fontWeight: 700, marginRight: "0.5rem" }}>STEP {i + 1}</span>
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recommendations Section */}
                <section>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-emerald)" }}>⚡</div>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>Action Items</h4>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {recommendations?.map((item, i) => (
                            <div key={i} style={{ padding: "1rem", background: "rgba(16,185,129,0.03)", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.1)", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, display: "flex", gap: "0.75rem" }}>
                                <div style={{ minWidth: "20px", height: "20px", borderRadius: "50%", background: "var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center", color: "black", fontSize: "0.7rem", fontWeight: 700 }}>✓</div>
                                {item}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </motion.div>
    )
}
