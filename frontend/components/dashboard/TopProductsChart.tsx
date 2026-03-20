import React, { useMemo } from "react"
import { motion } from "framer-motion"
import SafeChart from "@/components/SafeChart"

import { useStore } from "@/store/useStore"

export default function TopProductsChart({ data }: { data: Record<string, number> }) {
    const { currencySymbol } = useStore()
    const entries = useMemo(() => data ? Object.entries(data).sort((a, b) => b[1] - a[1]) : [], [data])
    const option = useMemo(() => ({
        backgroundColor: "transparent",
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            backgroundColor: "rgba(10,15,30,0.95)",
            borderColor: "rgba(139,92,246,0.3)",
            borderWidth: 1,
            textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: "Inter" },
        },
        grid: { left: "3%", right: "8%", bottom: "5%", top: "8%", containLabel: true },
        xAxis: {
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
        yAxis: {
            type: "category",
            data: entries.map(([k]) => k).reverse(),
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
            axisLabel: { color: "#9ca3af", fontSize: 11, fontFamily: "Inter" },
            axisTick: { show: false },
        },
        series: [
            {
                type: "bar",
                data: entries.map(([, v]) => v).reverse(),
                barWidth: "55%",
                itemStyle: {
                    borderRadius: [0, 6, 6, 0],
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 1, y2: 0,
                        colorStops: [
                            { offset: 0, color: "#7c3aed" },
                            { offset: 1, color: "#06b6d4" },
                        ],
                    },
                },
            },
        ],
        animationEasing: "elasticOut",
        animationDuration: 1200,
    }), [entries, currencySymbol])

    if (!data || entries.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Top Products</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        By total revenue
                    </p>
                </div>
                <span className="badge badge-primary">Top {entries.length}</span>
            </div>
            <SafeChart option={option} style={{ height: "320px" }} />
        </motion.div>
    )
}
