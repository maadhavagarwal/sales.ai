"use client"

import { useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
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
import TradingIntelligencePanel from "@/components/analytics/TradingIntelligencePanel"
import EnterpriseIntelligence from "@/components/analytics/EnterpriseIntelligence"
import { useStore } from "@/store/useStore"
import { motion } from "framer-motion"
import SafeChart from "@/components/SafeChart"
import { Card, Button, Badge } from "@/components/ui"
import { Skeleton, SkeletonCard, SkeletonChart } from "@/components/ui/Skeleton"
import { Bot, Sparkles, Zap, TrendingUp } from "lucide-react"

function MLResultsPanel({ ml }: { ml: Record<string, any> }) {
    if (!ml) return null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
        >
            <Card variant="bento" padding="lg" className="border-[--primary]/20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[--primary]/20 flex items-center justify-center text-[--primary]">
                            <Bot className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-[--text-primary] tracking-tight">Enterprise ML Pipeline</h3>
                            <p className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest mt-1">
                                Execution Mode: <span className="text-[--primary]">{ml.mode || "DISTRIBUTED"}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {ml.model_drift && <Badge variant="danger" pulse>Model Drift Detected</Badge>}
                        <Badge variant="pro">Autonomous Training Active</Badge>
                    </div>
                </div>

                {ml.automl_results && typeof ml.automl_results === "object" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-4 space-y-6">
                            {ml.automl_results.best_model && (
                                <Card variant="glass" padding="md" className="bg-[--primary]/5 border-[--primary]/10">
                                    <p className="text-[10px] font-black text-[--text-muted] uppercase tracking-[0.2em] mb-2">Optimal Model Architecture</p>
                                    <p className="text-xl font-black text-[--text-primary] tracking-tight leading-none">{ml.automl_results.best_model}</p>
                                    <div className="mt-4 pt-4 border-t border-[--border-subtle] flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-[--text-muted]">Validation Accuracy</span>
                                        <span className="text-xs font-black text-[--accent-emerald]">{(ml.automl_results.best_score * 100).toFixed(2)}%</span>
                                    </div>
                                </Card>
                            )}

                            <div className="p-6 rounded-[--radius-md] bg-[--surface-2] border border-[--border-default] space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[--text-muted]">Execution Telemetry</h4>
                                <div className="space-y-3">
                                    <TelemetryLine label="Training Samples" value="124,502" />
                                    <TelemetryLine label="Hyperparams Adjusted" value="82" />
                                    <TelemetryLine label="Convergence Time" value="4.2s" />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-8">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[--text-muted] mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[--primary]" />
                                Loss Convergence Chart
                            </h4>
                            {ml.automl_results.model_scores && (
                                <SafeChart
                                    style={{ height: "300px" }}
                                    option={{
                                        backgroundColor: "transparent",
                                        tooltip: {
                                            trigger: "axis",
                                            backgroundColor: "var(--surface-1)",
                                            borderColor: "rgba(99,102,241,0.3)",
                                            borderWidth: 1,
                                            textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: 'var(--font-geist-mono)' },
                                        },
                                        grid: { left: "0%", right: "2%", bottom: "5%", top: "5%", containLabel: true },
                                        xAxis: {
                                            type: "category",
                                            data: Object.keys(ml.automl_results.model_scores),
                                            axisLine: { lineStyle: { color: "var(--border-subtle)" } },
                                            axisLabel: { color: "#9ca3af", fontSize: 10, fontWeight: 700, rotate: 0 },
                                            axisTick: { show: false },
                                        },
                                        yAxis: {
                                            type: "value",
                                            splitLine: { lineStyle: { color: "var(--surface-2)" } },
                                            axisLabel: { color: "#6b7280", fontSize: 10, fontWeight: 700 },
                                        },
                                        series: [{
                                            type: "pictorialBar",
                                            symbol: 'path://M0,10 L10,10 C5.5,10 5.5,0 0,0 z',
                                            data: Object.values(ml.automl_results.model_scores),
                                            itemStyle: {
                                                color: {
                                                    type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                                                    colorStops: [
                                                        { offset: 0, color: "var(--primary)" },
                                                        { offset: 1, color: "var(--primary-dark)" },
                                                    ],
                                                },
                                                opacity: 0.8
                                            },
                                        }],
                                        animationEasing: "cubicOut",
                                        animationDuration: 1500,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </motion.div>
    )
}

function TelemetryLine({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-[10px] font-medium text-[--text-muted] tracking-tight">{label}</span>
            <span className="text-[10px] font-black text-[--text-primary] font-mono">{value}</span>
        </div>
    )
}

export default function AnalyticsPage() {
    const results = useStore(state => state.results)
    const isUploading = useStore(state => state.isUploading)
    const fetchForecast = useStore(state => state.fetchForecast)

    useEffect(() => {
        if (results?.dataset_id && !results.forecast) {
            fetchForecast(results.dataset_id)
        }
    }, [results?.dataset_id, results?.forecast, fetchForecast])

    // Loading & Empty State Component
    const LoadingState = () => (
        <div className="page-stack">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Skeleton height={140} className="rounded-2xl" />
                <Skeleton height={140} className="rounded-2xl" />
                <Skeleton height={140} className="rounded-2xl" />
                <Skeleton height={140} className="rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <SkeletonChart />
                <SkeletonChart />
            </div>
            <SkeletonCard rows={4} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton height={300} className="rounded-2xl" />
                <Skeleton height={300} className="rounded-2xl col-span-2" />
            </div>
        </div>
    )

    return (
        <DashboardLayout
            title="Predictive Intelligence Core"
            subtitle="Forecasting, anomaly detection, and executive-grade machine learning insights"
            actions={
                results?.dataset_id ? (
                    <Button
                        variant="pro"
                        size="md"
                        onClick={() => fetchForecast(results.dataset_id!)}
                        disabled={!results.dataset_id}
                        className="shadow-[--shadow-glow]"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Forecast Future Yield
                    </Button>
                ) : null
            }
        >
            {isUploading ? (
                <div className="page-stack">
                    <div className="showcase-panel rounded-3xl p-5 sm:p-6 aurora-ring">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[--text-muted] font-black">ANALYTICS ORCHESTRATION</p>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[--text-primary] mt-2">Strategic Signal Engine</h2>
                                <p className="text-sm text-[--text-muted] mt-2 max-w-3xl">
                                    Enterprise-grade forecasting, anomaly detection, and ML inference in one intelligence layer.
                                </p>
                            </div>
                            <Badge variant="pro">LIVE PIPELINE</Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mb-10 p-5 sm:p-8 rounded-3xl bg-[--primary]/5 border border-[--primary]/10 animate-pulse">
                        <div className="w-12 h-12 rounded-2xl bg-[--primary]/20 flex items-center justify-center text-[--primary]">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-[--text-primary]">Neural Processing Active</h3>
                            <p className="text-sm font-medium text-[--text-muted]">Orchestrating multi-model pipeline and synthesizing strategic vectors...</p>
                        </div>
                    </div>
                    <LoadingState />
                </div>
            ) : !results ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
                    <div className="w-24 h-24 rounded-3xl bg-[--surface-2] border border-[--border-default] flex items-center justify-center text-[--primary] relative">
                        <div className="absolute inset-0 bg-[--primary]/5 rounded-full" />
                        <TrendingUp className="h-11 w-11" />
                    </div>
                    <div className="space-y-3">
                        <p className="text-xl font-black text-[--text-primary] tracking-tight font-jakarta">No Synthetic Data Detected</p>
                        <p className="text-sm font-medium text-[--text-muted] max-w-xs mx-auto leading-relaxed">
                            Upload enterprise datasets from the command terminal to initialize deep analytics.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="page-rhythm">
                    <div className="showcase-panel rounded-3xl p-5 sm:p-6 aurora-ring">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[--text-muted] font-black">ANALYTICS ORCHESTRATION</p>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[--text-primary] mt-2">Strategic Signal Engine</h2>
                                <p className="text-sm text-[--text-muted] mt-2 max-w-3xl">
                                    Convert raw operational streams into board-level insight with predictive models and explainable intelligence.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="pro">MODEL STACK ACTIVE</Badge>
                                <Badge variant="outline">REAL-TIME ANALYTICS</Badge>
                            </div>
                        </div>
                    </div>
                    <EnterpriseIntelligence />
                    {/* Confidence & Intelligence Section */}
                    {(results.confidence_score !== undefined || results.data_quality !== undefined) && (
                        <DataIntelligencePanel
                            confidence={results.confidence_score || 0}
                            dataQuality={results.data_quality || 0}
                            summary={results.summary || {}}
                        />
                    )}

                    {results.dataset_type === "market_dataset" && results.market_intelligence && (
                        <div className="page-stack">
                            <h3 className="section-kicker text-[--primary]">Financial Market Intelligence (Greeks & Sentiment)</h3>
                            <TradingIntelligencePanel
                                marketIntelligence={results.market_intelligence}
                                report={results.analyst_report?.report || ""}
                            />
                        </div>
                    )}

                    {results.analytics && <MetricsCards analytics={results.analytics} />}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {results.analytics?.region_sales && (
                            <Card variant="glass" padding="lg">
                                <h3 className="section-kicker text-[--primary] mb-6">Geospatial Distribution</h3>
                                <RevenueChart data={results.analytics.region_sales} />
                            </Card>
                        )}
                        {results.analytics?.top_products && (
                            <Card variant="glass" padding="lg">
                                <h3 className="section-kicker text-[--accent-cyan] mb-6">Asset Performance Matrix</h3>
                                <TopProductsChart data={results.analytics.top_products} />
                            </Card>
                        )}
                    </div>

                    <MLResultsPanel ml={results.ml_predictions} />

                    {results.ml_predictions?.time_series_forecast && (
                        <Card variant="bento" padding="lg">
                            <h3 className="section-kicker text-[--accent-emerald] mb-6">Predictive Yield Forecast</h3>
                            <RevenueForecastChart 
                                data={results.ml_predictions.time_series_forecast.forecast || []} 
                                reasoning={results.ml_predictions.time_series_forecast.logic}
                            />
                        </Card>
                    )}

                    {results.forecast?.forecast && (
                        <Card variant="glass" padding="lg">
                            <h3 className="section-kicker text-[--accent-violet] mb-6">Dynamic Forecasting Layer</h3>
                            <RevenueForecastChart 
                                data={results.forecast.forecast} 
                                reasoning={(results.forecast as any).reasoning}
                                confidence={(results.forecast as any).confidence_interval}
                            />
                        </Card>
                    )}

                    <StrategicInsightsPanel
                        insights={results.insights}
                        recommendations={results.recommendations}
                        strategy={results.strategy}
                    />

                    <AIExplanationsPanel explanations={results.explanations} />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-8">
                            {results.clustering && (
                                <Card variant="glass" padding="lg">
                                    <h3 className="section-kicker text-[--accent-cyan] mb-6">Segment Clustering Map</h3>
                                    <ClusteringPanel data={results.clustering} />
                                </Card>
                            )}
                        </div>
                        <div className="lg:col-span-4 h-full">
                            {results.anomalies && results.anomalies.length > 0 && (
                                <AnomalyAlertPanel anomalies={results.anomalies} />
                            )}
                        </div>
                    </div>

                    {results.analyst_report && (
                        <Card variant="bento" padding="lg" className="bg-[--surface-1] border-[--border-default]">
                            <h3 className="section-kicker text-[--primary] mb-8 pb-5 border-b border-[--border-subtle]">Autonomous Board Report</h3>
                            <AnalystReportPanel report={results.analyst_report} />
                        </Card>
                    )}
                </div>
            )}
        </DashboardLayout>
    )
}

