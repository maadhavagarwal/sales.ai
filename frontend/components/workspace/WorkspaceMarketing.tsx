"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createMarketingCampaign, getMarketingCampaigns } from "@/services/api"
import { useStore } from "@/store/useStore"

export default function WorkspaceMarketing() {
    const { currencySymbol, results } = useStore()
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({ name: "", channel: "Meta", spend: 0, conversions: 0, revenue_generated: 0 })

    const aiSuggestion = results?.strategic_plan || results?.analyst_report?.report || "No active AI growth directive found. Run an Autonomous Analysis to generate multi-channel suggestions."

    useEffect(() => {
        refreshData()
    }, [])

    const refreshData = async () => {
        try {
            const res = await getMarketingCampaigns()
            setCampaigns(res)
        } catch (e) {
            console.error(e)
        }
    }

    const handleCreate = async () => {
        setLoading(true)
        try {
            await createMarketingCampaign(formData)
            setShowCreate(false)
            setFormData({ name: "", channel: "Meta", spend: 0, conversions: 0, revenue_generated: 0 })
            refreshData()
        } catch (e) {
            alert("Failed to create campaign")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-indigo)" }}>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Marketing Spend</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800 }}>{currencySymbol}{campaigns.reduce((a, b) => a + b.spend, 0).toLocaleString()}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-emerald)" }}>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Campaign Revenue</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{currencySymbol}{campaigns.reduce((a, b) => a + b.revenue_generated, 0).toLocaleString()}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-cyan)" }}>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Avg. ROAS</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
                        {(campaigns.reduce((a, b) => a + b.revenue_generated, 0) / (campaigns.reduce((a, b) => a + b.spend, 0) || 1)).toFixed(2)}x
                    </p>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Marketing Performance Hub</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Track multi-channel acquisition and ROI performance</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                    + Launch New Campaign
                </button>
            </div>

            {/* AI Suggestion Logic Connection */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="chart-card"
                style={{ borderLeft: "4px solid var(--primary-500)", background: "rgba(99,102,241,0.05)", padding: "1.25rem" }}
            >
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "1.5rem" }}>🤖</div>
                    <div>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary-400)", marginBottom: "0.4rem" }}>AI GROWTH DIRECTIVE</h4>
                        <div style={{ fontSize: "1rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5 }}>
                            {typeof aiSuggestion === 'string' && aiSuggestion.length > 300
                                ? aiSuggestion.substring(0, 300) + "..."
                                : aiSuggestion}
                        </div>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="chart-card"
                        style={{ border: "1px solid var(--accent-indigo)", background: "rgba(99,102,241,0.03)" }}
                    >
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Deploy Growth Campaign</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div>
                                <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>Campaign Name</label>
                                <input placeholder="Q1 Scaler" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.2)" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>Channel</label>
                                <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.2)", width: "100%" }}>
                                    <option>Meta</option>
                                    <option>Google Ads</option>
                                    <option>LinkedIn</option>
                                    <option>Email</option>
                                    <option>Offline</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>Budget ({currencySymbol})</label>
                                <input type="number" value={formData.spend || 0} onChange={(e) => setFormData({ ...formData, spend: parseFloat(e.target.value) || 0 })} className="input-base" style={{ background: "rgba(0,0,0,0.2)" }} />
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div>
                                <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>Conversions</label>
                                <input type="number" value={formData.conversions || 0} onChange={(e) => setFormData({ ...formData, conversions: parseInt(e.target.value) || 0 })} className="input-base" style={{ background: "rgba(0,0,0,0.2)" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>Revenue ({currencySymbol})</label>
                                <input type="number" value={formData.revenue_generated || 0} onChange={(e) => setFormData({ ...formData, revenue_generated: parseFloat(e.target.value) || 0 })} className="input-base" style={{ background: "rgba(0,0,0,0.2)" }} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button className="btn-primary" onClick={handleCreate} disabled={loading} style={{ flex: 1 }}>{loading ? "Launching..." : "Deploy Campaign"}</button>
                            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="chart-card">
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1.5rem" }}>Active Acquisition Channels</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                    {campaigns.length === 0 && (
                        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                            No active growth campaigns. Launch your first acquisition drive to see data!
                        </div>
                    )}
                    {campaigns.map((camp) => (
                        <div key={camp.id} className="metric-card" style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                                <h4 style={{ fontWeight: 800 }}>{camp.name}</h4>
                                <span className="badge badge-primary" style={{ fontSize: "0.65rem" }}>{camp.channel}</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div>
                                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Spend</p>
                                    <p style={{ fontWeight: 700 }}>{currencySymbol}{camp.spend.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Revenue</p>
                                    <p style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>{currencySymbol}{camp.revenue_generated.toLocaleString()}</p>
                                </div>
                            </div>
                            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>ROI Efficiency</span>
                                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent-indigo)" }}>
                                    {(camp.revenue_generated / (camp.spend || 1)).toFixed(1)}x
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
