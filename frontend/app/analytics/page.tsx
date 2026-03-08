"use client"

import Sidebar from "@/components/layout/Sidebar"
import PageHeader from "@/components/layout/PageHeader"
import MetricsCards from "@/components/dashboard/MetricsCards"
import RevenueChart from "@/components/dashboard/RevenueChart"
import TopProductsChart from "@/components/dashboard/TopProductsChart"
import AnalystReportPanel from "@/components/analytics/AnalystReportPanel"
import StrategicInsightsPanel from "@/components/analytics/StrategicInsightsPanel"
import AIExplanationsPanel from "@/components/analytics/AIExplanationsPanel"
import RevenueForecastChart from "@/components/analytics/RevenueForecastChart"
import ClusteringPanel from "@/components/analytics/ClusteringPanel"
import AnomalyAlertPanel from "@/components/analytics/AnomalyAlertPanel"
import DataIntelligencePanel from "@/components/analytics/DataIntelligencePanel"
import { useStore } from "@/store/useStore"
import { motion } from "framer-motion"
import ReactECharts from "echarts-for-react"

function MLResultsPanel({ ml }: { ml: Record<string, any> }) {
    if (!ml) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>🤖 ML Pipeline Results</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Mode: {ml.mode || "N/A"}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {ml.model_drift && <span className="badge badge-danger">Model Drift Detected</span>}
                    <span className="badge badge-primary">AutoML</span>
                </div>
            </div>

            {ml.automl_results && typeof ml.automl_results === "object" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {ml.automl_results.best_model && (
                        <div
                            style={{
                                padding: "0.875rem 1rem",
                                background: "rgba(99,102,241,0.06)",
                                borderRadius: "var(--radius-md)",
                                borderLeft: "3px solid var(--primary-500)",
                            }}
                        >
                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Best Model</p>
                            <p style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.25rem" }}>{ml.automl_results.best_model}</p>
                        </div>
                    )}
                    {ml.automl_results.best_score != null && (
                        <div
                            style={{
                                padding: "0.875rem 1rem",
                                background: "rgba(16,185,129,0.06)",
                                borderRadius: "var(--radius-md)",
                                borderLeft: "3px solid var(--accent-emerald)",
                            }}
                        >
                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Best Score</p>
                            <p style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.25rem" }}>{ml.automl_results.best_score?.toFixed(4)}</p>
                        </div>
                    )}
                    {ml.automl_results.model_scores && (
                        <div style={{ marginTop: "0.5rem" }}>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem", fontWeight: 600 }}>
                                Model Comparison
                            </p>
                            <ReactECharts
                                style={{ height: "250px" }}
                                option={{
                                    backgroundColor: "transparent",
                                    tooltip: {
                                        trigger: "axis",
                                        backgroundColor: "rgba(10,15,30,0.95)",
                                        borderColor: "rgba(99,102,241,0.3)",
                                        borderWidth: 1,
                                        textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: "Inter" },
                                    },
                                    grid: { left: "3%", right: "5%", bottom: "5%", top: "8%", containLabel: true },
                                    xAxis: {
                                        type: "category",
                                        data: Object.keys(ml.automl_results.model_scores),
                                        axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
                                        axisLabel: { color: "#9ca3af", fontSize: 10, fontFamily: "Inter", rotate: 20 },
                                        axisTick: { show: false },
                                    },
                                    yAxis: {
                                        type: "value",
                                        splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
                                        axisLabel: { color: "#6b7280", fontSize: 11, fontFamily: "Inter" },
                                    },
                                    series: [{
                                        type: "bar",
                                        data: Object.values(ml.automl_results.model_scores),
                                        barWidth: "50%",
                                        itemStyle: {
                                            borderRadius: [6, 6, 0, 0],
                                            color: {
                                                type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                                                colorStops: [
                                                    { offset: 0, color: "#06b6d4" },
                                                    { offset: 1, color: "#0891b2" },
                                                ],
                                            },
                                        },
                                    }],
                                    animationEasing: "elasticOut",
                                    animationDuration: 1200,
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    )
}

export default function AnalyticsPage() {
    const { results } = useStore()

    return (
        <>
            <Sidebar />
            <div className="main-content">
                <PageHeader
                    title="Analytics"
                    subtitle="Deep dive into your data"
                />

                <div className="page-body">
                    {!results ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
                            <div
                                style={{
                                    width: "72px",
                                    height: "72px",
                                    borderRadius: "var(--radius-xl)",
                                    background: "var(--gradient-surface)",
                                    border: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.75rem",
                                }}
                            >
                                📈
                            </div>
                            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No data loaded</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                Upload a CSV from the Dashboard to see analytics
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {/* Confidence & Intelligence Section */}
                            {(results.confidence_score !== undefined || results.data_quality !== undefined) && (
                                <DataIntelligencePanel
                                    confidence={results.confidence_score || 0}
                                    dataQuality={results.data_quality || 0}
                                    summary={results.summary || {}}
                                />
                            )}

                            {results.analytics && <MetricsCards analytics={results.analytics} />}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                                {results.analytics?.region_sales && <RevenueChart data={results.analytics.region_sales} />}
                                {results.analytics?.top_products && <TopProductsChart data={results.analytics.top_products} />}
                            </div>

                            <MLResultsPanel ml={results.ml_predictions} />

                            {results.ml_predictions?.time_series_forecast && (
                                <RevenueForecastChart data={results.ml_predictions.time_series_forecast} />
                            )}

                            <StrategicInsightsPanel
                                insights={results.insights}
                                recommendations={results.recommendations}
                                strategy={results.strategy}
                            />

                            <AIExplanationsPanel explanations={results.explanations} />

                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
                                {results.clustering && <ClusteringPanel data={results.clustering} />}
                                {results.anomalies && results.anomalies.length > 0 && (
                                    <AnomalyAlertPanel anomalies={results.anomalies} />
                                )}
                            </div>

                            {results.analyst_report && <AnalystReportPanel report={results.analyst_report} />}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
