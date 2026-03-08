"use client"

import { motion } from "framer-motion"
import ReactECharts from "echarts-for-react"
import type { SimulationResult } from "@/store/useStore"

export default function SimulationsPanel({ simulations }: { simulations: SimulationResult[] }) {
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
                    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
                    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
                    return `$${v}`
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
                    const isPositive = sim.scenario.includes("-") ? false : true
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            className="metric-card"
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                                <span
                                    style={{
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    {sim.scenario.replace(/_/g, " ")}
                                </span>
                                <span className={`badge ${isPositive ? "badge-success" : "badge-danger"}`}>
                                    {isPositive ? "↑ Growth" : "↓ Decline"}
                                </span>
                            </div>
                            <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                                ${sim.estimated_revenue >= 1_000_000
                                    ? `${(sim.estimated_revenue / 1_000_000).toFixed(2)}M`
                                    : sim.estimated_revenue >= 1_000
                                        ? `${(sim.estimated_revenue / 1_000).toFixed(1)}K`
                                        : sim.estimated_revenue.toFixed(2)}
                            </p>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                Estimated Revenue
                            </p>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
