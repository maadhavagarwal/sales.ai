"use client"

import { motion } from "framer-motion"
import type { AnalyticsData } from "@/store/useStore"
import { useStore } from "@/store/useStore"
import { Card } from "@/components/ui"

interface MetricItem {
    label: string
    value: string | number
    icon: string
    color: string
    trend?: string
}

function formatNumber(num: number, symbol: string): string {
    if (num >= 1_000_000) return `${symbol}${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `${symbol}${(num / 1_000).toFixed(1)}K`
    return `${symbol}${num.toFixed(2)}`
}

export default function MetricsCards({ analytics }: { analytics: AnalyticsData & { total_profit?: number; total_revenue?: number } }) {
    const { currencySymbol } = useStore()
    if (!analytics) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 bg-black/40 rounded-xl border border-white/5 animate-pulse" />
                ))}
            </div>
        )
    }

    const metrics: MetricItem[] = []

    if (analytics.total_revenue != null) {
        metrics.push({
            label: "Gross Revenue",
            value: formatNumber(analytics.total_revenue, currencySymbol),
            icon: "💎",
            color: "var(--primary)",
        })
    }

    if (analytics.total_profit != null) {
        const tr = analytics.total_revenue ?? 0
        const rawMargin =
            analytics.average_margin != null && Number.isFinite(analytics.average_margin)
                ? analytics.average_margin
                : tr > 0
                  ? (analytics.total_profit / tr) * 100
                  : null
        let trend: string | undefined
        if (rawMargin != null && Number.isFinite(rawMargin)) {
            if (Math.abs(rawMargin) <= 500) {
                trend = `${rawMargin.toFixed(1)}% margin`
            } else {
                trend = "Verify profit vs revenue columns"
            }
        }
        metrics.push({
            label: "Net Profit",
            value: formatNumber(analytics.total_profit, currencySymbol),
            icon: "📈",
            color: "var(--accent-emerald)",
            trend,
        })
    }

    if (analytics.top_products) {
        const topProduct = Object.keys(analytics.top_products)[0]
        metrics.push({
            label: "Alpha Asset",
            value: topProduct || "N/A",
            icon: "⚡",
            color: "var(--accent-amber)",
        })
    }

    if (analytics.region_sales) {
        const regionCount = Object.keys(analytics.region_sales).length
        metrics.push({
            label: "Global Reach",
            value: `${regionCount} Nodes`,
            icon: "🌐",
            color: "var(--accent-cyan)",
        })
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, i) => (
                <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                    <Card variant="glass" padding="md" className="group hover:scale-[1.02] active:scale-[0.98] transition-all cursor-default">
                        <div className="flex justify-between items-start">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-3 group-hover:text-[--primary] transition-colors">
                                    {metric.label}
                                </p>
                                <p className="text-2xl font-black text-[--text-primary] tracking-tight truncate">
                                    {metric.value}
                                </p>
                                {metric.trend && (
                                    <div className="mt-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[--accent-emerald]/10 border border-[--accent-emerald]/20 w-fit">
                                        <div className="w-1 h-1 rounded-full bg-[--accent-emerald] animate-pulse" />
                                        <span className="text-[10px] font-black text-[--accent-emerald] uppercase tracking-wider">
                                            {metric.trend}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div
                                className="w-12 h-12 rounded-[--radius-sm] flex items-center justify-center text-xl group-hover:shadow-[--shadow-glow] transition-all duration-500"
                                style={{
                                    background: `linear-gradient(135deg, ${metric.color}15, ${metric.color}05)`,
                                    border: `1px solid ${metric.color}30`
                                }}
                            >
                                {metric.icon}
                            </div>
                        </div>
                    </Card>
                </motion.div>
            ))}
        </div>
    )
}
