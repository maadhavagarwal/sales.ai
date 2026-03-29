"use client"

import { useState } from "react"
import { askNLBI } from "@/services/api"
import { motion, AnimatePresence } from "framer-motion"
import SafeChart from "@/components/SafeChart"
import { useStore } from "@/store/useStore"

export default function NLBIChart() {
    const [question, setQuestion] = useState("")
    const [chartData, setChartData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const datasetId = useStore((state) => state.datasetId)

    const generateChart = async () => {
        if (!question.trim() || loading || !datasetId) {
            setError("Make sure a dataset is uploaded first.")
            return
        }
        setLoading(true)
        setError(null)

        try {
            const res = await askNLBI(datasetId, question.trim())
            if (res.error) {
                setError(res.error)
            } else {
                setChartData(res)
            }
        } catch (err: any) {
            setError("Failed to generate chart. Make sure a dataset is uploaded first.")
        } finally {
            setLoading(false)
        }
    }

    const getChartOption = () => {
        if (!chartData?.data) return null

        const baseConfig = {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                backgroundColor: "var(--surface-1)",
                borderColor: "rgba(99,102,241,0.3)",
                borderWidth: 1,
                textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: "Inter" },
            },
            grid: { left: "3%", right: "4%", bottom: "8%", top: "12%", containLabel: true },
            xAxis: {
                type: "category",
                data: chartData.data.map((d: any) => d[chartData.x]),
                axisLine: { lineStyle: { color: "var(--border-subtle)" } },
                axisLabel: { color: "#9ca3af", fontSize: 11, fontFamily: "Inter" },
                axisTick: { show: false },
            },
            yAxis: {
                type: "value",
                splitLine: { lineStyle: { color: "var(--border-subtle)" } },
                axisLabel: { color: "#6b7280", fontSize: 11, fontFamily: "Inter" },
            },
            animationEasing: "elasticOut",
            animationDuration: 1200,
        }

        if (chartData.chart === "bar") {
            return {
                ...baseConfig,
                series: [{
                    type: "bar",
                    data: chartData.data.map((d: any) => d[chartData.y]),
                    barWidth: "50%",
                    itemStyle: {
                        borderRadius: [6, 6, 0, 0],
                        color: {
                            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "#818cf8" },
                                { offset: 1, color: "#4f46e5" },
                            ],
                        },
                    },
                }],
            }
        }

        if (chartData.chart === "line") {
            return {
                ...baseConfig,
                series: [{
                    type: "line",
                    data: chartData.data.map((d: any) => d[chartData.y]),
                    smooth: true,
                    lineStyle: { width: 3, color: "#06b6d4" },
                    itemStyle: { color: "#06b6d4" },
                    areaStyle: {
                        color: {
                            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "rgba(6,182,212,0.2)" },
                                { offset: 1, color: "rgba(6,182,212,0)" },
                            ],
                        },
                    },
                }],
            }
        }

        // Pie chart fallback
        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "item",
                backgroundColor: "var(--surface-1)",
                borderColor: "rgba(99,102,241,0.3)",
                borderWidth: 1,
                textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: "Inter" },
            },
            series: [{
                type: "pie",
                radius: ["40%", "70%"],
                data: chartData.data.map((d: any) => ({
                    name: d[chartData.x],
                    value: d[chartData.y],
                })),
                itemStyle: { borderRadius: 8, borderColor: "var(--surface-0)", borderWidth: 2 },
                label: { color: "#9ca3af", fontSize: 11, fontFamily: "Inter" },
            }],
        }
    }

    const suggestions = [
        "Show revenue by region",
        "Top 5 products by sales",
        "Monthly revenue trend",
        "Revenue distribution by product",
    ]

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Input area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="chart-card"
            >
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    Natural Language BI
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                    Ask a question and get an instant chart visualization
                </p>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <input
                        className="input-field"
                        placeholder="e.g. Show revenue by region as a bar chart"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && generateChart()}
                        disabled={loading}
                        id="nlbi-input"
                    />
                    <button
                        className="btn-primary"
                        onClick={generateChart}
                        disabled={loading || !question.trim()}
                        style={{ opacity: loading || !question.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}
                        id="nlbi-generate-btn"
                    >
                        {loading ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div className="spinner" /> Generating...
                            </span>
                        ) : (
                            "Generate Chart ✨"
                        )}
                    </button>
                </div>

                {/* Suggestions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            onClick={() => setQuestion(s)}
                            style={{
                                fontSize: "0.7rem",
                                padding: "0.35rem 0.65rem",
                                borderRadius: "9999px",
                                border: "1px solid var(--border-default)",
                                background: "var(--surface-2)",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                transition: "all 200ms",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "var(--primary-500)"
                                e.currentTarget.style.color = "var(--primary-400)"
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--border-default)"
                                e.currentTarget.style.color = "var(--text-muted)"
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                            padding: "0.75rem 1rem",
                            background: "rgba(244,63,94,0.1)",
                            border: "1px solid rgba(244,63,94,0.25)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--accent-rose)",
                            fontSize: "0.85rem",
                        }}
                    >
                        ⚠️ {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chart Result */}
            <AnimatePresence>
                {chartData && !error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="chart-card"
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <div>
                                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Generated Visualization</h3>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                    Type: {chartData.chart} | X: {chartData.x} | Y: {chartData.y}
                                </p>
                            </div>
                            <span className="badge badge-success">AI Generated</span>
                        </div>
                        <SafeChart option={getChartOption()!} style={{ height: "400px" }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

