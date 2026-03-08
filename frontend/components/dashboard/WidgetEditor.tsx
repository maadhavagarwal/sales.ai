"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CHART_COLORS, DashboardWidget } from "@/store/useStore"
import { Card, Button } from "@/components/ui"

interface WidgetEditorProps {
    existingWidget?: DashboardWidget | null
    numericColumns: string[]
    categoricalColumns: string[]
    onSave: (widget: DashboardWidget) => void
    onClose: () => void
}

export default function WidgetEditor({
    existingWidget,
    numericColumns,
    categoricalColumns,
    onSave,
    onClose,
}: WidgetEditorProps) {
    const allColumns = Array.from(new Set([...categoricalColumns, ...numericColumns]))
    const [type, setType] = useState<DashboardWidget["type"]>(existingWidget?.type || "bar")
    const [title, setTitle] = useState(existingWidget?.title || "")
    const [xColumn, setXColumn] = useState(existingWidget?.xColumn || categoricalColumns[0] || "")
    const [yColumn, setYColumn] = useState(existingWidget?.yColumn || numericColumns[0] || "")
    const [aggregation, setAggregation] = useState<DashboardWidget["aggregation"]>(existingWidget?.aggregation || "sum")
    const [width, setWidth] = useState<DashboardWidget["width"]>(existingWidget?.width || "half")
    const [color, setColor] = useState(existingWidget?.color || CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)])

    const chartTypes = [
        { value: "bar", label: "Bar", icon: "📊" },
        { value: "line", label: "Line", icon: "📈" },
        { value: "area", label: "Area", icon: "📉" },
        { value: "pie", label: "Pie", icon: "🥧" },
        { value: "donut", label: "Donut", icon: "🍩" },
        { value: "scatter", label: "Scatter", icon: "⚡" },
    ]

    const handleSave = () => {
        const autoTitle = title || `${yColumn} by ${xColumn}`
        onSave({
            id: existingWidget?.id || `widget_${Date.now()}`,
            type,
            title: autoTitle,
            xColumn,
            yColumn,
            aggregation,
            width,
            color,
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
            <div
                className="absolute inset-0 bg-[--background]/60 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.95, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                className="relative w-full max-w-[640px] z-10"
            >
                <Card variant="glass" padding="lg" className="shadow-2xl border-[--border-strong] max-h-[90vh] overflow-y-auto scrollbar-pro">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-[--text-primary] tracking-tight">
                                {existingWidget ? "Update Visualization" : "New Intelligence Stream"}
                            </h2>
                            <p className="text-sm font-medium text-[--text-muted] mt-1 italic tracking-wide">
                                Configure your data stream parameters below.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-[--radius-xs] bg-[--surface-1] border border-[--border-strong] text-[--text-secondary] hover:bg-[--surface-2] transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-10">
                        {/* Chart Type Selector */}
                        <section>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-4 block">Visual Output Type</label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                {chartTypes.map((ct) => (
                                    <button
                                        key={ct.value}
                                        onClick={() => setType(ct.value as DashboardWidget["type"])}
                                        className={`
                        aspect-square flex flex-col items-center justify-center gap-2 rounded-[--radius-sm] border transition-all
                        ${type === ct.value
                                                ? "bg-[--primary]/10 border-[--primary] shadow-[0_0_15px_-5px_var(--primary)]"
                                                : "bg-[--surface-1] border-[--border-strong] hover:bg-[--surface-2] hover:border-[--primary]/30"
                                            }
                    `}
                                    >
                                        <span className="text-2xl">{ct.icon}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${type === ct.value ? "text-[--primary]" : "text-[--text-muted]"}`}>
                                            {ct.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Core Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <section>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-3 block">Perspective Dimension (X)</label>
                                <div className="relative group">
                                    <select
                                        className="input-pro w-full h-12"
                                        value={xColumn}
                                        onChange={(e) => setXColumn(e.target.value)}
                                    >
                                        {allColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </section>
                            <section>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-3 block">Target Value (Y)</label>
                                <select
                                    className="input-pro w-full h-12"
                                    value={yColumn}
                                    onChange={(e) => setYColumn(e.target.value)}
                                >
                                    {numericColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </section>
                            <section>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-3 block">Aggregated Logic</label>
                                <select
                                    className="input-pro w-full h-12"
                                    value={aggregation}
                                    onChange={(e) => setAggregation(e.target.value as any)}
                                >
                                    <option value="sum">Summation of Stream</option>
                                    <option value="mean">Average Density</option>
                                    <option value="count">Frequency Count</option>
                                    <option value="min">Minimum Value</option>
                                    <option value="max">Maximum Peak</option>
                                </select>
                            </section>
                            <section>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-3 block">Grid Influence (Width)</label>
                                <select
                                    className="input-pro w-full h-12"
                                    value={width}
                                    onChange={(e) => setWidth(e.target.value as any)}
                                >
                                    <option value="third">Compact (1/3)</option>
                                    <option value="half">Standard (1/2)</option>
                                    <option value="full">Expanded Frame (Full)</option>
                                </select>
                            </section>
                        </div>

                        {/* Custom Theme Color */}
                        <section>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-4 block">Visual Signature Color</label>
                            <div className="flex flex-wrap gap-3">
                                {CHART_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`
                        w-10 h-10 rounded-full border-4 transition-all
                        ${color === c ? "border-white scale-110 shadow-lg" : "border-[--surface-3] opacity-60 hover:opacity-100"}
                    `}
                                        style={{ background: c }}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Identifier Input */}
                        <section>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-3 block">Override Identifier (Optional)</label>
                            <input
                                className="input-pro w-full h-12"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Auto-generated based on parameters"
                            />
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-[--border-subtle] flex gap-4 justify-end">
                        <Button variant="outline" size="lg" onClick={onClose} className="px-6 h-12 min-w-[120px]">
                            Discard
                        </Button>
                        <Button variant="primary" size="lg" onClick={handleSave} className="px-8 h-12 min-w-[140px]">
                            {existingWidget ? "Update Stream" : "Establish Stream"}
                        </Button>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    )
}
