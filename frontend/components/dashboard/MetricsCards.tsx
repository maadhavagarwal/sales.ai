"use client"

import { motion } from "framer-motion"
import type { AnalyticsData } from "@/store/useStore"

interface MetricItem {
    label: string
    value: string | number
    icon: string
    color: string
    trend?: string
}

function formatNumber(num: number): string {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
    return `$${num.toFixed(2)}`
}

export default function MetricsCards({ analytics }: { analytics: AnalyticsData }) {
    if (!analytics) return null

    const metrics: MetricItem[] = []

    if (analytics.total_revenue != null) {
        metrics.push({
            label: "Total Revenue",
            value: formatNumber(analytics.total_revenue),
            icon: "💰",
            color: "var(--accent-emerald)",
            trend: "+12.5%",
        })
    }

    if (analytics.average_revenue != null) {
        metrics.push({
            label: "Average Revenue",
            value: formatNumber(analytics.average_revenue),
            icon: "📊",
            color: "var(--primary-400)",
            trend: "+8.2%",
        })
    }

    if (analytics.total_profit != null) {
        metrics.push({
            label: "Total Profit",
            value: formatNumber(analytics.total_profit),
            icon: "🏆",
            color: "var(--accent-amber)",
            trend: "+15.3%",
        })
    }

    if (analytics.top_products) {
        const topProduct = Object.keys(analytics.top_products)[0]
        metrics.push({
            label: "Top Product",
            value: topProduct || "N/A",
            icon: "⭐",
            color: "var(--accent-violet)",
        })
    }

    if (analytics.region_sales) {
        const regionCount = Object.keys(analytics.region_sales).length
        metrics.push({
            label: "Active Regions",
            value: regionCount,
            icon: "🌍",
            color: "var(--accent-cyan)",
        })
    }

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)`,
                gap: "1rem",
            }}
        >
            {metrics.map((metric, i) => (
                <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="metric-card"
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                {metric.label}
                            </p>
                            <p
                                style={{
                                    fontSize: typeof metric.value === "string" && metric.value.length > 10 ? "1.25rem" : "1.75rem",
                                    fontWeight: 700,
                                    letterSpacing: "-0.02em",
                                    color: "var(--text-primary)",
                                }}
                            >
                                {metric.value}
                            </p>
                            {metric.trend && (
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                        marginTop: "0.5rem",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        color: "var(--accent-emerald)",
                                    }}
                                >
                                    ↑ {metric.trend}
                                </div>
                            )}
                        </div>
                        <div
                            style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "var(--radius-md)",
                                background: `${metric.color}15`,
                                border: `1px solid ${metric.color}30`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.15rem",
                            }}
                        >
                            {metric.icon}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}