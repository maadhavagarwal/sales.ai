"use client"

import { motion } from "framer-motion"
import ReactECharts from "echarts-for-react"

interface ClusteringProps {
    data: Record<string, { count: number; total_value: number; top_example: string }>
}

export default function ClusteringPanel({ data }: ClusteringProps) {
    if (!data || Object.keys(data).length === 0) return null

    const chartOption = {
        backgroundColor: "transparent",
        tooltip: {
            trigger: "item",
            backgroundColor: "rgba(10,15,30,0.95)",
            borderColor: "rgba(139,92,246,0.3)",
            borderWidth: 1,
            textStyle: { color: "#f9fafb" }
        },
        series: [
            {
                name: "Market Segmentation",
                type: "pie",
                radius: ["40%", "70%"],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: "#0a0f1e",
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: "center"
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: "bold",
                        color: "#fff"
                    }
                },
                labelLine: {
                    show: false
                },
                data: Object.entries(data).map(([name, details]) => ({
                    value: details.count,
                    name: name.split(" ")[0] // e.g. "High-Value"
                }))
            }
        ]
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>🧠 K-Means Customer Segmentation</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Auto-clustering by revenue performance</p>
                </div>
                <span className="badge badge-primary">Unsupervised ML</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem", alignItems: "center" }}>
                <ReactECharts option={chartOption} style={{ height: "240px" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {Object.entries(data).map(([tier, details], i) => (
                        <div key={tier} style={{ padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: i === 0 ? "#6366f1" : i === 1 ? "#8b5cf6" : "#a855f7" }}>{tier}</span>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{details.count} items</span>
                            </div>
                            <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>Total: ${details.total_value.toLocaleString()}</p>
                            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Top: {details.top_example}</p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
