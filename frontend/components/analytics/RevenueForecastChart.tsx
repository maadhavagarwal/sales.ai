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
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border-default)",
                borderWidth: 1,
                textStyle: { color: "var(--text-primary)", fontSize: 13, fontFamily: "Inter" },
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
                axisLine: { lineStyle: { color: "var(--border-subtle)" } },
                axisLabel: { color: "#9ca3af", fontSize: 10, fontFamily: "Inter", rotate: 30 },
                axisTick: { show: false }
            },
            yAxis: {
                type: "value",
                name: "Revenue ($)",
                nameTextStyle: { color: "#6b7280", fontSize: 11, padding: [0, 0, 0, 40] },
                splitLine: { lineStyle: { color: "var(--border-subtle)" } },
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
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-[--text-primary]">AI 30-Day Revenue Forecast</h3>
                        <p className="mt-0.5 text-xs text-[--text-muted]">Neural network time-series prediction</p>
                    </div>
                </div>
                <div className="flex h-87.5 items-center justify-center rounded-[--radius-md] border border-[--border-default] bg-[--surface-1] text-[--text-muted]">
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
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-[--text-primary]">AI 30-Day Revenue Forecast</h3>
                    <p className="mt-0.5 text-xs text-[--text-muted]">Neural network time-series prediction</p>
                </div>
                <div className="flex items-center gap-3">
                    {confidence && (
                        <div className="text-[10px] font-black text-[--accent-emerald] bg-[--accent-emerald]/10 px-3 py-1 rounded-full border border-[--accent-emerald]/20">
                            CONFIDENCE: {((1 - (confidence.upper - confidence.lower) / (confidence.upper + confidence.lower)) * 100).toFixed(0)}%
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[--primary] shadow-[0_0_8px_var(--primary)]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[--text-muted]">ML Prediction</span>
                    </div>
                </div>
            </div>

            <div className="h-87.5 w-full">
                <SafeChart option={chartOption} style={{ height: "350px", width: "100%" }} />
            </div>

            <div className="mt-4 rounded-[--radius-md] border border-[--primary]/20 bg-[--primary]/8 p-6 text-sm text-[--text-secondary]">
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

