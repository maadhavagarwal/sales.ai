"use client"

import React, { useMemo } from "react"
import { motion } from "framer-motion"
import SafeChart from "@/components/SafeChart"
import { useStore } from "@/store/useStore"

export default function RevenueChart({ data }: { data: Record<string, number> }) {
    const { currencySymbol } = useStore()
    if (!data) return null

    const entries = Object.entries(data).sort((a, b) => b[1] - a[1])

    const option = React.useMemo(() => ({
        backgroundColor: "transparent",
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(10,15,30,0.95)",
            borderColor: "rgba(99,102,241,0.3)",
            borderWidth: 1,
            textStyle: { color: "#f9fafb", fontSize: 13, fontFamily: "Inter" },
            formatter: (params: any) => {
                const d = params[0]
                return `<div style="font-weight:600;margin-bottom:4px">${d.name}</div>
                <div style="color:#a5b4fc">Revenue: <b>${currencySymbol}${Number(d.value).toLocaleString()}</b></div>`
            },
        },
        grid: { left: "3%", right: "4%", bottom: "8%", top: "12%", containLabel: true },
        xAxis: {
            type: "category",
            data: entries.map(([k]) => k),
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
            axisLabel: { color: "#9ca3af", fontSize: 11, fontFamily: "Inter" },
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
                    if (v >= 1_000_000) return `${currencySymbol}${(v / 1_000_000).toFixed(1)}M`
                    if (v >= 1_000) return `${currencySymbol}${(v / 1_000).toFixed(0)}K`
                    return `${currencySymbol}${v}`
                },
            },
        },
        series: [
            {
                type: "bar",
                data: entries.map(([, v]) => v),
                barWidth: "50%",
                itemStyle: {
                    borderRadius: [6, 6, 0, 0],
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "#818cf8" },
                            { offset: 1, color: "#4f46e5" },
                        ],
                    },
                },
                emphasis: {
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "#a5b4fc" },
                                { offset: 1, color: "#6366f1" },
                            ],
                        },
                    },
                },
            },
        ],
        animationEasing: "elasticOut",
        animationDuration: 1200,
    }), [entries, currencySymbol])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="chart-card"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>Revenue by Region</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {entries.length} regions analyzed
                    </p>
                </div>
                <span className="badge badge-primary">Live Data</span>
            </div>
            <SafeChart option={option} style={{ height: "320px" }} />
        </motion.div>
    )
}