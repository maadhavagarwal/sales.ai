"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"

interface TradingIntelligenceProps {
    marketIntelligence: {
        pcr: {
            pcr_oi: number
            pcr_vol: number
            sentiment: string
        }
        indicators: any[]
    }
    report: string
}

export default function TradingIntelligencePanel({ marketIntelligence, report }: TradingIntelligenceProps) {
    const { pcr = { pcr_oi: 0, pcr_vol: 0, sentiment: "Neutral" }, indicators = [] } = marketIntelligence || {}

    const latestIndicator = useMemo(() => {
        if (!indicators || !Array.isArray(indicators) || indicators.length === 0) return null
        return indicators[indicators.length - 1]
    }, [indicators])

    const sentimentResult = pcr?.sentiment || "Neutral"
    const sentimentColor = sentimentResult.includes("Bullish") ? "#10b981" :
        sentimentResult.includes("Bearish") ? "#ef4444" : "#f59e0b"

    const rsiValue = latestIndicator?.rsi || 50
    const rsiColor = rsiValue > 70 ? "#ef4444" :
        rsiValue < 30 ? "#10b981" : "#8b5cf6"

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                {/* Sentiment & PCR Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="chart-card"
                    style={{ position: "relative", overflow: "hidden" }}
                >
                    <div style={{ position: "absolute", top: 0, right: 0, width: "120px", height: "120px", background: `radial-gradient(circle at center, ${sentimentColor}15 0%, transparent 70%)`, pointerEvents: "none" }} />

                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        📊 Market Sentiment (PCR)
                    </h3>

                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "2.5rem", fontWeight: 800, color: sentimentColor }}>
                            {typeof pcr?.pcr_oi === 'number' ? pcr.pcr_oi.toFixed(2) : "0.00"}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Put-Call Ratio (OI)</span>
                    </div>

                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: sentimentColor, marginBottom: "1.5rem", padding: "0.5rem 0.75rem", background: `${sentimentColor}10`, borderRadius: "8px", display: "inline-block" }}>
                        {pcr?.sentiment || "Neutral Sentiment"}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Volume PCR</p>
                            <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                                {typeof pcr?.pcr_vol === 'number' ? pcr.pcr_vol.toFixed(2) : "0.00"}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Flow Status</p>
                            <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>{(pcr?.pcr_oi || 0) > 1 ? "Put Heavy" : "Call Heavy"}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Technical Indicators Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="chart-card"
                    transition={{ delay: 0.1 }}
                >
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        📈 Tactical Indicators
                    </h3>

                    {latestIndicator ? (
                        <>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "1rem" }}>
                                <span style={{ fontSize: "2.5rem", fontWeight: 800, color: rsiColor }}>{latestIndicator.rsi.toFixed(1)}</span>
                                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>RSI (14)</span>
                            </div>

                            <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden", marginBottom: "1.5rem" }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${latestIndicator.rsi}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    style={{ height: "100%", background: rsiColor, boxShadow: `0 0 10px ${rsiColor}` }}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>BB Upper</p>
                                    <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>{latestIndicator.bb_upper?.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>BB Lower</p>
                                    <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>{latestIndicator.bb_lower?.toFixed(2)}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p style={{ color: "var(--text-muted)" }}>No technical data available.</p>
                    )}
                </motion.div>
            </div>

            {/* Strategic Brief & Greeks */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="chart-card"
                transition={{ delay: 0.2 }}
            >
                <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>🦅 Quantitative Strategy Brief</h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>AI-Synthesized Market Directives</p>
                    </div>
                </div>

                <div
                    style={{
                        fontSize: "0.95rem",
                        lineHeight: 1.6,
                        color: "var(--text-secondary)",
                        padding: "1.5rem",
                        background: "rgba(255,255,255,0.02)",
                        borderRadius: "16px",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "1.5rem",
                        maxHeight: "300px",
                        overflowY: "auto"
                    }}
                    dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                />

                <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        🛡️ Greek Risk Analysis (Option Physics)
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                        <div className="greek-box">
                            <span className="greek-label">Delta (Δ)</span>
                            <span className="greek-value" style={{ color: "#8b5cf6" }}>{latestIndicator?.delta?.toFixed(3) || "0.500"}</span>
                        </div>
                        <div className="greek-box">
                            <span className="greek-label">Gamma (Γ)</span>
                            <span className="greek-value" style={{ color: "#ec4899" }}>{latestIndicator?.gamma?.toFixed(4) || "0.0240"}</span>
                        </div>
                        <div className="greek-box">
                            <span className="greek-label">Vega (ν)</span>
                            <span className="greek-value" style={{ color: "#0ea5e9" }}>{latestIndicator?.vega?.toFixed(2) || "0.15"}</span>
                        </div>
                        <div className="greek-box">
                            <span className="greek-label">Theta (Θ)</span>
                            <span className="greek-value" style={{ color: "#f43f5e" }}>{latestIndicator?.theta?.toFixed(2) || "-0.08"}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

        </div>
    )
}
