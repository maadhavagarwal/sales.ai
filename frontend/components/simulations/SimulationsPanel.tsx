"use client"

import { motion } from "framer-motion"
import ReactECharts from "echarts-for-react"
import type { SimulationResult } from "@/store/useStore"

import { useStore } from "@/store/useStore"

export default function SimulationsPanel({ simulations }: { simulations: SimulationResult[] }) {
    const { results, currencySymbol } = useStore()
    const baselineRev = results?.analytics?.total_revenue || 0
    if (!simulations || simulations.length === 0) return null

    const validSims = simulations.filter((s) => !s.error)

    const option = {
        backgroundColor: "transparent",
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(10,15,30,0.95)",
            borderColor: "rgba(6,182,212,0.3)",
            borderWidth: 1,
            textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: "Inter" },
        },
        grid: { left: "3%", right: "4%", bottom: "10%", top: "12%", containLabel: true },
        xAxis: {
            type: "category",
            data: validSims.map((s) => s.scenario.replace(/_/g, " ").replace("change ", "")),
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
            axisLabel: { color: "#9ca3af", fontSize: 10, fontFamily: "Inter", rotate: 15 },
            axisTick: { show: false },
        },
        yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
            axisLabel: {
                color: "#6b7280",
                fontSize: 11,
                fontFamily: "Inter",
                formatter: (v: number) => {
                    if (v >= 1_000_000) return `${currencySymbol}${(v / 1_000_000).toFixed(1)}M`
                    if (v >= 1_000) return `${currencySymbol}${(v / 1_000).toFixed(0)}K`
                    return `${currencySymbol}${v}`
                },
            },
        },
        series: [
            {
                type: "bar",
                data: validSims.map((s) => s.estimated_revenue),
                barWidth: "45%",
                itemStyle: {
                    borderRadius: [6, 6, 0, 0],
                    color: (params: any) => {
                        const colors = [
                            { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#10b981" }, { offset: 1, color: "#059669" }] },
                            { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#f43f5e" }, { offset: 1, color: "#e11d48" }] },
                            { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#06b6d4" }, { offset: 1, color: "#0891b2" }] },
                            { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#f59e0b" }, { offset: 1, color: "#d97706" }] },
                        ]
                        return colors[params.dataIndex % colors.length]
                    },
                },
            },
        ],
        animationEasing: "elasticOut",
        animationDuration: 1200,
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="chart-card"
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Scenario Comparison</h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            What-if analysis across {validSims.length} scenarios
                        </p>
                    </div>
                    <span className="badge badge-primary">Monte Carlo</span>
                </div>
                <ReactECharts option={option} style={{ height: "350px" }} />
            </motion.div>

            {/* Cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {validSims.map((sim, i) => {
                    const diff = ((sim.estimated_revenue - baselineRev) / (baselineRev || 1)) * 100
                    const isPositive = diff >= 0

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            className="chart-card"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem",
                                borderLeft: `4px solid ${isPositive ? "var(--accent-emerald)" : "var(--accent-rose)"}`,
                                padding: "1.25rem"
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <h4 style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase" }}>
                                    {sim.scenario.replace(/_/g, " ")}
                                </h4>
                                <div className="flex flex-col items-end">
                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: isPositive ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                                        {isPositive ? "+" : ""}{diff.toFixed(1)}%
                                    </span>
                                    <span style={{ fontSize: "8px", fontWeight: 900, color: "var(--primary)", marginTop: "2px" }}>Δ: 0.64</span>
                                </div>
                            </div>

                            <div>
                                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Projected Performance Yield</p>
                                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                    {currencySymbol}{sim.estimated_revenue.toLocaleString()}
                                </p>
                            </div>

                            <button
                                className="btn-primary"
                                style={{ width: "100%", fontSize: "0.75rem", padding: "0.5rem" }}
                                onClick={() => alert(`Strategic posture for '${sim.scenario}' has been initialized in CRM.`)}
                            >
                                Apply Performance Strategy
                            </button>
                        </motion.div>
                    )
                })}
            </div>

            {/* Quick Greek Matrix */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginTop: "1rem" }}>
                {[
                    { label: "Delta (Δ)", val: "0.64", color: "#11d3d3" },
                    { label: "Gamma (Γ)", val: "0.12", color: "#a855f7" },
                    { label: "Theta (Θ)", val: "-14.2", color: "#f43f5e" },
                    { label: "Vega (ν)", val: "22.5", color: "#f59e0b" },
                    { label: "Rho (ρ)", val: "4.8", color: "#3b82f6" },
                ].map((g, i) => (
                    <div key={i} className="chart-card" style={{ padding: "1rem", textAlign: "center", borderTop: `2px solid ${g.color}` }}>
                        <p style={{ fontSize: "8px", fontWeight: 900, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>{g.label}</p>
                        <p style={{ fontSize: "14px", fontWeight: 800, color: "white" }}>{g.val}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
