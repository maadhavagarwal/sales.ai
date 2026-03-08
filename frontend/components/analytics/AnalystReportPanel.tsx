"use client"

import { motion } from "framer-motion"
import type { AnalystReport } from "@/store/useStore"

export default function AnalystReportPanel({ report }: { report: AnalystReport }) {
    if (!report) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>🧠 Autonomous Analyst Report</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        AI-generated executive summary
                    </p>
                </div>
                <span className="badge badge-primary">Auto-Generated</span>
            </div>

            {/* Dataset Profile */}
            {report.profile && (
                <div style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                        Dataset Profile
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rows</p>
                            <p style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.25rem" }}>{report.profile.rows?.toLocaleString()}</p>
                        </div>
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Columns</p>
                            <p style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.25rem" }}>{report.profile.columns?.length}</p>
                        </div>
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Features</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
                                {report.profile.columns?.slice(0, 5).map((col) => (
                                    <span key={col} className="badge badge-primary" style={{ fontSize: "0.6rem" }}>{col}</span>
                                ))}
                                {(report.profile.columns?.length || 0) > 5 && (
                                    <span className="badge badge-primary" style={{ fontSize: "0.6rem" }}>
                                        +{(report.profile.columns?.length || 0) - 5}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Executive Report */}
            {report.report && (
                <div
                    style={{
                        padding: "1.25rem",
                        background: "rgba(99,102,241,0.04)",
                        borderRadius: "var(--radius-md)",
                        borderLeft: "3px solid var(--primary-500)",
                    }}
                >
                    <h4 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--primary-400)", marginBottom: "0.5rem" }}>
                        Executive Summary
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                        {report.report}
                    </p>
                </div>
            )}
        </motion.div>
    )
}
