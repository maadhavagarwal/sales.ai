"use client"

import { useMemo } from "react"
import SafeChart from "@/components/SafeChart"
import { motion } from "framer-motion"
import { useStore, CHART_COLORS, DashboardWidget } from "@/store/useStore"
import { Card, Button } from "@/components/ui"

interface ChartWidgetProps {
    widget: DashboardWidget
    rawData: Record<string, any>[]
    onEdit: () => void
    onRemove: () => void
}

export default function ChartWidget({
    widget,
    rawData,
    onEdit,
    onRemove,
}: ChartWidgetProps) {
    const { currencySymbol } = useStore()

    // Aggregate data
    const { categories, values } = useMemo(() => {
        if (!rawData || rawData.length === 0) return { categories: [], values: [] }
        const { xColumn, yColumn, aggregation, type } = widget

        const grouped: Record<string, number[]> = {}
        for (const row of rawData) {
            const key = String(row[xColumn] ?? "Unknown")
            if (!grouped[key]) grouped[key] = []
            const val = parseFloat(row[yColumn])
            if (!isNaN(val)) grouped[key].push(val)
        }

        let cats = Object.keys(grouped).slice(0, 50)
        let vals = cats.map((cat) => {
            const arr = grouped[cat]
            if (!arr || arr.length === 0) return 0
            switch (aggregation) {
                case "sum": return arr.reduce((a, b) => a + b, 0)
                case "mean": return arr.reduce((a, b) => a + b, 0) / arr.length
                case "count": return arr.length
                case "min": return Math.min(...arr)
                case "max": return Math.max(...arr)
                default: return arr.reduce((a, b) => a + b, 0)
            }
        })

        if (type === "bar" || type === "pie" || type === "donut") {
            const pairs = cats.map((c, i) => ({ cat: c, val: vals[i] }))
            pairs.sort((a, b) => b.val - a.val)
            cats = pairs.map(p => p.cat)
            vals = pairs.map(p => p.val)
        }

        return { categories: cats, values: vals }
    }, [widget, rawData])

    const chartOption = useMemo(() => {
        const baseOption = {
            tooltip: {
                trigger: "axis",
                backgroundColor: "#0f172a",
                borderColor: "#1e293b",
                textStyle: { color: "#f8fafc" },
                padding: [10, 14],
                borderRadius: 8
            },
            grid: { left: "4%", right: "4%", bottom: "10%", top: "10%", containLabel: true },
            xAxis: { type: "category", data: [], axisLabel: { color: "#94a3b8", fontSize: 10 } },
            yAxis: { type: "value", axisLabel: { color: "#94a3b8", fontSize: 10 } },
            series: []
        }

        if (!rawData || rawData.length === 0) return baseOption
        const { xColumn, yColumn, type, color } = widget
        const baseTextStyle = { color: "#94a3b8", fontFamily: "Plus Jakarta Sans, system-ui, sans-serif" }

        if (type === "pie" || type === "donut") {
            return {
                tooltip: {
                    trigger: "item",
                    formatter: "{b}: {c} ({d}%)",
                    backgroundColor: "#0f172a",
                    borderColor: "#1e293b",
                    textStyle: { color: "#f8fafc" }
                },
                series: [{
                    type: "pie",
                    radius: type === "donut" ? ["55%", "75%"] : ["0%", "75%"],
                    center: ["50%", "50%"],
                    itemStyle: { borderRadius: 8, borderColor: "#020617", borderWidth: 3 },
                    label: { color: "#94a3b8", fontSize: 11, fontWeight: 600 },
                    data: categories.map((c, i) => ({
                        name: c,
                        value: Math.round(values[i] * 100) / 100,
                        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
                    })),
                }],
            }
        }

        if (type === "scatter") {
            const scatterData = rawData
                .map((r) => [parseFloat(r[xColumn]), parseFloat(r[yColumn])])
                .filter(([x, y]) => !isNaN(x) && !isNaN(y))
                .slice(0, 500)

            return {
                tooltip: {
                    trigger: "item",
                    backgroundColor: "#0f172a",
                    borderColor: "#1e293b",
                    textStyle: { color: "#f8fafc" }
                },
                xAxis: { type: "value", name: xColumn, nameTextStyle: baseTextStyle, axisLabel: baseTextStyle, splitLine: { lineStyle: { color: "var(--surface-2)" } } },
                yAxis: { type: "value", name: yColumn, nameTextStyle: baseTextStyle, axisLabel: baseTextStyle, splitLine: { lineStyle: { color: "var(--surface-2)" } } },
                series: [{ type: "scatter", data: scatterData, symbolSize: 8, itemStyle: { color: color || "#6366f1", opacity: 0.8 } }],
            }
        }

        return {
            tooltip: {
                trigger: "axis",
                backgroundColor: "#0f172a",
                borderColor: "#1e293b",
                textStyle: { color: "#f8fafc" },
                padding: [10, 14],
                borderRadius: 8
            },
            grid: { left: "4%", right: "4%", bottom: "10%", top: "10%", containLabel: true },
            xAxis: {
                type: "category",
                data: categories,
                axisLabel: { ...baseTextStyle, fontSize: 10, rotate: categories.length > 8 ? 35 : 0, fontWeight: 500 },
                axisLine: { lineStyle: { color: "var(--surface-3)" } },
                axisTick: { show: false }
            },
            yAxis: {
                type: "value",
                axisLabel: {
                    ...baseTextStyle,
                    fontSize: 10,
                    fontWeight: 600,
                    formatter: (v: number) => v >= 1000000 ? `${currencySymbol}${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${currencySymbol}${(v / 1000).toFixed(0)}K` : v.toString()
                },
                splitLine: { lineStyle: { color: "var(--surface-2)" } },
                axisLine: { show: false }
            },
            series: [{
                type: type === "area" ? "line" : type,
                data: values.map((v) => Math.round(v * 100) / 100),
                areaStyle: type === "area" ? {
                    color: {
                        type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: (color || "#3b82f6") + "50" }, { offset: 1, color: "transparent" }]
                    }
                } : undefined,
                itemStyle: {
                    color: color || "#3b82f6",
                    borderRadius: type === "bar" ? [6, 6, 0, 0] : undefined
                },
                smooth: type === "line" || type === "area",
                lineStyle: type === "line" || type === "area" ? { width: 3, cap: 'round' } : undefined,
                symbol: 'circle',
                symbolSize: 6,
                barMaxWidth: 35,
            }],
        }
    }, [widget, rawData, categories, values, currencySymbol])

    const dataReading = useMemo(() => {
        if (!categories || categories.length === 0 || !values || values.length === 0) return ""
        const maxVal = Math.max(...values)
        const maxIdx = values.indexOf(maxVal)
        const total = values.reduce((a, b) => a + b, 0)
        const pct = ((maxVal / (total || 1)) * 100).toFixed(1)
        return `Analysis: ${categories[maxIdx]} dominates the segment with ${maxVal.toLocaleString()} (${pct}% of total ${widget.yColumn}).`
    }, [categories, values, widget.yColumn])

    return (
        <motion.div
            layout
            className="h-full"
        >
            <Card variant="glass" padding="lg" className="h-full flex flex-col group overflow-visible">
                <div className="flex items-center justify-between mb-8">
                    <div className="min-w-0">
                        <h3 className="text-sm font-black text-[--text-primary] tracking-tight group-hover:text-[--primary] transition-colors truncate">
                            {widget.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted] whitespace-nowrap">
                                {widget.yColumn} / {widget.xColumn}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-[--border-strong]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[--primary]/70 whitespace-nowrap">
                                {widget.aggregation}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={onEdit}
                            className="p-2 rounded-[--radius-xs] bg-[--surface-2] border border-[--border-strong] text-[--text-secondary] hover:text-[--primary] hover:border-[--primary]/30 transition-all"
                            title="Edit Chart"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                            onClick={onRemove}
                            className="p-2 rounded-[--radius-xs] bg-[--surface-2] border border-[--border-strong] text-[--text-secondary] hover:text-[--accent-rose] hover:border-[--accent-rose]/30 transition-all"
                            title="Remove"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-[240px]">
                    {chartOption ? (
                        <SafeChart 
                            option={chartOption} 
                            style={{ height: "300px", width: "100%" }} 
                            notMerge={true}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center bg-[--surface-2]/30 rounded-[--radius-2xl] border border-dashed border-[--border-subtle]">
                            <div className="text-center">
                                <div className="text-3xl mb-2">📊</div>
                                <p className="text-xs text-[--text-muted]">Insufficient data for chart</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-4 border-t border-[--border-subtle] flex items-start gap-4">
                    <div className="w-8 h-8 rounded-[--radius-xs] bg-[--primary]/10 flex-shrink-0 flex items-center justify-center">
                        <span className="text-sm">🤖</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[--text-secondary] font-medium italic">
                        {dataReading}
                    </p>
                </div>
            </Card>
        </motion.div>
    )
}

