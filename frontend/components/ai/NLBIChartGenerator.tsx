"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import SafeChart from "@/components/SafeChart"
import { askNLBI } from "@/services/api"
import { useStore, CHART_COLORS } from "@/store/useStore"

export default function NLBIChartGenerator() {
    const [question, setQuestion] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [chartData, setChartData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const datasetId = useStore((state) => state.datasetId)

    const handleGenerate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!datasetId || !question.trim() || isLoading) return

        setIsLoading(true)
        setError(null)
        try {
            const res = await askNLBI(datasetId, question)
            if (res.error) {
                setError(res.error)
                setChartData(null)
            } else {
                setChartData(res)
            }
        } catch (err: any) {
            setError("Failed to reach AI engine. Ensure connection is stable.")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const chartOption = chartData ? {
        backgroundColor: "transparent",
        tooltip: {
            trigger: chartData.chart === "pie" ? "item" : "axis",
            backgroundColor: "rgba(10,15,30,0.95)",
            borderColor: "rgba(99,102,241,0.3)",
            borderWidth: 1,
            textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: "Inter" },
        },
        grid: { left: "3%", right: "4%", bottom: "10%", top: "15%", containLabel: true },
        xAxis: chartData.chart === "pie" ? undefined : {
            type: "category",
            data: chartData.data.map((d: any) => d[chartData.x]),
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
            axisLabel: { color: "#9ca3af", fontSize: 10, rotate: 25 },
        },
        yAxis: chartData.chart === "pie" ? undefined : {
            type: "value",
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
            axisLabel: { color: "#6b7280", fontSize: 11 },
        },
        series: [{
            type: chartData.chart,
            radius: chartData.chart === "pie" ? ["0%", "70%"] : undefined,
            center: chartData.chart === "pie" ? ["50%", "50%"] : undefined,
            data: chartData.chart === "pie"
                ? chartData.data.map((d: any, i: number) => ({
                    value: d[chartData.y],
                    name: d[chartData.x],
                    itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] }
                }))
                : chartData.data.map((d: any) => d[chartData.y]),
            smooth: true,
            itemStyle: {
                borderRadius: chartData.chart === "bar" ? [4, 4, 0, 0] : 0,
                color: chartData.chart === "bar" ? "#6366f1" : undefined
            },
            areaStyle: chartData.chart === "line" ? {
                color: {
                    type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{ offset: 0, color: "rgba(99,102,241,0.2)" }, { offset: 1, color: "transparent" }]
                }
            } : undefined,
            lineStyle: { width: 3, color: "#6366f1" }
        }],
        animationDuration: 1000
    } : null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="chart-card"
            style={{ padding: "1.5rem" }}
        >
            <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    🪄 Natural Language Chart Builder
                    <span className="badge badge-primary">AI Beta</span>
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Ask to see any slice of data (e.g. "sales by region" or "monthly trend")
                </p>
            </div>

            <form onSubmit={handleGenerate} style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ flex: 1, position: "relative" }}>
                    <input
                        className="input-field"
                        placeholder="Type what you want to visualize..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        style={{ paddingLeft: "2.75rem" }}
                    />
                    <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "1.1rem" }}>💬</span>
                </div>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading || !question.trim()}
                    style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                    {isLoading ? "Generating..." : "Generate Chart"}
                </button>
            </form>

            <AnimatePresence mode="wait">
                {isLoading && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 0", gap: "1rem" }}
                    >
                        <div className="spinner" />
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>AI is scanning data columns and aggregating values...</p>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ padding: "1rem", background: "rgba(244,63,94,0.05)", borderRadius: "var(--radius-md)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--accent-rose)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.75rem" }}
                    >
                        <span>⚠️</span>
                        {error}
                    </motion.div>
                )}

                {chartData && !isLoading && (
                    <motion.div
                        key="chart"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ background: "rgba(0,0,0,0.15)", borderRadius: "var(--radius-lg)", padding: "1rem" }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {chartData.y} by {chartData.x} ({chartData.chart})
                            </p>
                            <button onClick={() => setChartData(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem" }}>Clear Result</button>
                        </div>
                        <div style={{ height: "350px", width: "100%" }}>
                            <SafeChart option={chartOption} style={{ height: "100%", width: "100%" }} />
                        </div>
                    </motion.div>
                )}

                {!chartData && !isLoading && !error && (
                    <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ padding: "3rem 0", textAlign: "center", opacity: 0.5 }}
                    >
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Try: "Top 5 products", "Revenue distribution", or "Monthly trend"</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
