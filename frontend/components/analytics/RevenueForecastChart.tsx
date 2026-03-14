"use client"

import { useMemo } from "react"
import SafeChart from "@/components/SafeChart"
import { motion } from "framer-motion"

interface ForecastData {
    date: string
    predicted_revenue: number
}

interface RevenueForecastChartProps {
    data: ForecastData[]
    reasoning?: string
    confidence?: { lower: number; upper: number }
}

export default function RevenueForecastChart({ data, reasoning, confidence }: RevenueForecastChartProps) {
    const chartOption = useMemo(() => {
        if (!data || data.length === 0) return null

        const series: any[] = [
            {
                name: "Predicted Revenue",
                type: "line",
                data: data.map(d => d.predicted_revenue),
                smooth: true,
                symbol: "circle",
                symbolSize: 8,
                itemStyle: { color: "#6366f1" },
                lineStyle: { width: 3, color: "#6366f1" },
                areaStyle: {
                    color: {
                        type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(99,102,241,0.2)" },
                            { offset: 1, color: "transparent" }
                        ]
                    }
                }
            }
        ]

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(10,15,30,0.95)",
                borderColor: "rgba(99,102,241,0.3)",
                borderWidth: 1,
                textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: "Inter" },
                formatter: (params: any) => {
                    const p = params[0]
                    return `
                        <div style="font-weight: 700; margin-bottom: 4px;">${p.name}</div>
                        <div style="color: #67e8f9;">Predicted: $${p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    `
                }
            },
            grid: { left: "3%", right: "4%", bottom: "10%", top: "15%", containLabel: true },
            xAxis: {
                type: "category",
                data: data.map(d => d.date),
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
                axisLabel: { color: "#9ca3af", fontSize: 10, fontFamily: "Inter", rotate: 30 },
                axisTick: { show: false }
            },
            yAxis: {
                type: "value",
                name: "Revenue ($)",
                nameTextStyle: { color: "#6b7280", fontSize: 11, padding: [0, 0, 0, 40] },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
                axisLabel: { color: "#6b7280", fontSize: 11, fontFamily: "Inter" }
            },
            series,
            animationDuration: 2000
        }
    }, [data])

    if (!data || data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="chart-card"
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>🔮 AI 30-Day Revenue Forecast</h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Neural network time-series prediction</p>
                    </div>
                </div>
                <div style={{ height: "350px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
                    <div>Loading forecast data...</div>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>🔮 AI 30-Day Revenue Forecast</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Neural network time-series prediction</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {confidence && (
                        <div className="text-[10px] font-black text-[--accent-emerald] bg-[--accent-emerald]/10 px-3 py-1 rounded-full border border-[--accent-emerald]/20">
                            CONFIDENCE: {((1 - (confidence.upper - confidence.lower) / (confidence.upper + confidence.lower)) * 100).toFixed(0)}%
                        </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 8px #6366f1" }}></span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>ML PREDICTION</span>
                    </div>
                </div>
            </div>

            <div style={{ height: "350px", width: "100%" }}>
                <SafeChart option={chartOption} style={{ height: "350px", width: "100%" }} />
            </div>

            <div style={{ marginTop: "1rem", padding: "1.5rem", background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)", borderRadius: "16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center text-xl shrink-0">🧠</div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[--primary] mb-1">Explainable Reasoning</p>
                        <p className="leading-relaxed font-medium">
                            {reasoning || "This forecast utilizes a specialized Recurrent Neural Network (RNN) to isolate historical seasonality and cyclical volatility, projecting future yields based on weighted temporal dependencies."}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

