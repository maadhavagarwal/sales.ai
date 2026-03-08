"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Sidebar from "@/components/layout/Sidebar"
import PageHeader from "@/components/layout/PageHeader"
import CSVUploader from "@/components/upload/CSVUploader"
import MetricsCards from "@/components/dashboard/MetricsCards"
import StrategyPanel from "@/components/dashboard/StrategyPanel"
import InsightsPanel from "@/components/dashboard/InsightsPanel"
import ExplanationsPanel from "@/components/dashboard/ExplanationsPanel"
import NLBIChartGenerator from "@/components/ai/NLBIChartGenerator"
import { useStore, CHART_COLORS } from "@/store/useStore"
import type { DashboardWidget } from "@/store/useStore"
import { getDashboardConfig, downloadReport, downloadCleanData, downloadStrategicPlanPDF, reprocessDataset } from "@/services/api"
import { motion, AnimatePresence } from "framer-motion"
import ReactECharts from "echarts-for-react"
import MarkdownRenderer from "@/components/ai/MarkdownRenderer"

/* ============================
   EDITABLE CHART WIDGET
   ============================ */
function ChartWidget({
  widget,
  rawData,
  onEdit,
  onRemove,
}: {
  widget: DashboardWidget
  rawData: Record<string, any>[]
  onEdit: () => void
  onRemove: () => void
}) {
  const { currencySymbol } = useStore()
  // Aggregate data for both chart and AI reading
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
    if (!rawData || rawData.length === 0) return null
    const { xColumn, yColumn, type, color } = widget
    const baseTextStyle = { color: "#9ca3af", fontFamily: "Inter, system-ui, sans-serif" }

    if (type === "pie" || type === "donut") {
      return {
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        series: [{
          type: "pie",
          radius: type === "donut" ? ["45%", "70%"] : ["0%", "70%"],
          center: ["50%", "55%"],
          itemStyle: { borderRadius: 6, borderColor: "#0a0f1e", borderWidth: 2 },
          label: { color: "#9ca3af", fontSize: 11 },
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
        tooltip: { trigger: "item" },
        xAxis: { type: "value", name: xColumn, nameTextStyle: baseTextStyle, axisLabel: baseTextStyle, splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } } },
        yAxis: { type: "value", name: yColumn, nameTextStyle: baseTextStyle, axisLabel: baseTextStyle, splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } } },
        series: [{ type: "scatter", data: scatterData, symbolSize: 6, itemStyle: { color: color || "#6366f1", opacity: 0.7 } }],
      }
    }

    return {
      tooltip: { trigger: "axis", backgroundColor: "rgba(17,24,39,0.95)", borderColor: "rgba(255,255,255,0.1)", textStyle: { color: "#f9fafb" } },
      grid: { left: "3%", right: "4%", bottom: "12%", top: "8%", containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: { ...baseTextStyle, fontSize: 10, rotate: categories.length > 8 ? 35 : 0 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { ...baseTextStyle, fontSize: 10, formatter: (v: number) => v >= 1000000 ? `${currencySymbol}${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${currencySymbol}${(v / 1000).toFixed(0)}K` : v.toString() },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
      },
      series: [{
        type: type === "area" ? "line" : type,
        data: values.map((v) => Math.round(v * 100) / 100),
        areaStyle: type === "area" ? { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: (color || "#6366f1") + "40" }, { offset: 1, color: "transparent" }] } } : undefined,
        itemStyle: { color: color || "#6366f1", borderRadius: type === "bar" ? [4, 4, 0, 0] : undefined },
        smooth: type === "line" || type === "area",
        lineStyle: type === "line" || type === "area" ? { width: 2.5 } : undefined,
        barMaxWidth: 40,
      }],
    }
  }, [widget, rawData, categories, values])

  const dataReading = useMemo(() => {
    if (!categories || categories.length === 0 || !values || values.length === 0) return ""
    const maxVal = Math.max(...values)
    const maxIdx = values.indexOf(maxVal)
    const total = values.reduce((a, b) => a + b, 0)
    const pct = ((maxVal / (total || 1)) * 100).toFixed(1)
    return `AI Reading: ${categories[maxIdx]} leads with ${maxVal.toLocaleString()} (${pct}% of total ${widget.yColumn}).`
  }, [categories, values, widget.yColumn])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="chart-card"
      style={{ position: "relative" }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>{widget.title}</h3>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {widget.yColumn} by {widget.xColumn} • {widget.aggregation} • {widget.type}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          <button onClick={onEdit} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", color: "var(--primary-400)", cursor: "pointer" }}>
            ✏ Edit
          </button>
          <button onClick={onRemove} style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", color: "var(--accent-rose)", cursor: "pointer" }}>
            ✕
          </button>
        </div>
      </div>
      <ReactECharts option={chartOption} style={{ height: "240px" }} />

      {/* AI Reading Hook */}
      <div style={{
        marginTop: "1rem",
        padding: "0.75rem",
        background: "rgba(99,102,241,0.05)",
        borderRadius: "var(--radius-md)",
        borderLeft: "3px solid var(--primary-500)",
        fontSize: "0.75rem",
        color: "var(--text-secondary)",
        lineHeight: 1.4
      }}>
        <span style={{ fontWeight: 800, color: "var(--primary-400)", marginRight: "0.5rem" }}>🤖</span>
        {dataReading}
      </div>
    </motion.div>
  )
}

/* ============================
   ADD / EDIT WIDGET MODAL
   ============================ */
function WidgetEditor({
  existingWidget,
  numericColumns,
  categoricalColumns,
  onSave,
  onClose,
}: {
  existingWidget?: DashboardWidget | null
  numericColumns: string[]
  categoricalColumns: string[]
  onSave: (widget: DashboardWidget) => void
  onClose: () => void
}) {
  const allColumns = [...categoricalColumns, ...numericColumns]
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.98), rgba(10,15,30,0.99))", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "2rem", width: "520px", maxHeight: "90vh", overflowY: "auto" }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.5rem", background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {existingWidget ? "Edit Chart" : "Add New Chart"}
        </h2>

        {/* Chart Type Selector */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>Chart Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            {chartTypes.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setType(ct.value as DashboardWidget["type"])}
                style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", border: type === ct.value ? "2px solid var(--primary-500)" : "1px solid var(--border-default)", background: type === ct.value ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}
              >
                <span style={{ fontSize: "1.25rem" }}>{ct.icon}</span>
                <span style={{ fontSize: "0.75rem", color: type === ct.value ? "var(--primary-400)" : "var(--text-secondary)" }}>{ct.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.375rem" }}>Title (optional)</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto-generated if empty" />
        </div>

        {/* X & Y Axis */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.375rem" }}>
              {type === "scatter" ? "X Axis" : "Group By"}
            </label>
            <select className="input-field" value={xColumn} onChange={(e) => setXColumn(e.target.value)} style={{ cursor: "pointer" }}>
              {allColumns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.375rem" }}>
              {type === "scatter" ? "Y Axis" : "Value"}
            </label>
            <select className="input-field" value={yColumn} onChange={(e) => setYColumn(e.target.value)} style={{ cursor: "pointer" }}>
              {numericColumns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Aggregation & Width */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.375rem" }}>Aggregation</label>
            <select className="input-field" value={aggregation} onChange={(e) => setAggregation(e.target.value as any)} style={{ cursor: "pointer" }}>
              <option value="sum">Sum</option>
              <option value="mean">Average</option>
              <option value="count">Count</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.375rem" }}>Width</label>
            <select className="input-field" value={width} onChange={(e) => setWidth(e.target.value as any)} style={{ cursor: "pointer" }}>
              <option value="third">1/3 Width</option>
              <option value="half">1/2 Width</option>
              <option value="full">Full Width</option>
            </select>
          </div>
        </div>

        {/* Color Picker */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.375rem" }}>Color</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {CHART_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "3px solid white" : "2px solid transparent", cursor: "pointer", transition: "all 0.15s" }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>
            {existingWidget ? "Update Chart" : "Add Chart"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ============================
   DATA TABLE COMPONENT
   ============================ */
function DataTable({ data, columns }: { data: Record<string, any>[]; columns: string[] }) {
  const [sortCol, setSortCol] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(0)
  const pageSize = 20

  const sorted = useMemo(() => {
    if (!sortCol) return data
    return [...data].sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol]
      if (va == null) return 1; if (vb == null) return -1
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [data, sortCol, sortAsc])

  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(sorted.length / pageSize)

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  const fmtVal = (v: any) => {
    if (v == null) return "—"
    if (typeof v === "number") return v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v.toString()
    return String(v).length > 30 ? String(v).slice(0, 30) + "…" : String(v)
  }

  return (
    <div className="chart-card" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700 }}>📋 Data Table</h3>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{data.length} rows</span>
      </div>
      <div style={{ overflowX: "auto", maxHeight: "480px", overflowY: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.slice(0, 12).map((col) => (
                <th key={col} onClick={() => handleSort(col)} style={{ cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                  {col} {sortCol === col ? (sortAsc ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i}>
                {columns.slice(0, 12).map((col) => (
                  <td key={col} style={{ whiteSpace: "nowrap" }}>{fmtVal(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
          <button className="btn-ghost" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>← Prev</button>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Page {page + 1} of {totalPages}</span>
          <button className="btn-ghost" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next →</button>
        </div>
      )}
    </div>
  )
}

/* ============================
   MAIN DASHBOARD PAGE
   ============================ */
export default function Dashboard() {
  const { results, datasetId, fileName, widgets, addWidget, updateWidget, removeWidget, setWidgets, setResults } = useStore()
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"dashboard" | "data" | "ai">("dashboard")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<string>("0")

  const numericCols = results?.numeric_columns || []
  const catCols = results?.categorical_columns || []
  const rawData = results?.raw_data || []
  const allCols = results?.columns || []

  const generateAIDashboard = async () => {
    if (!datasetId) return
    setIsGenerating(true)
    try {
      const config = await getDashboardConfig(datasetId)
      if (config.charts) {
        const newWidgets: DashboardWidget[] = config.charts.map((c: any, idx: number) => ({
          id: `ai_${Date.now()}_${idx}`,
          type: c.chart_type === "histogram" ? "bar" : c.chart_type,
          title: c.title,
          xColumn: c.x || c.category || c.column,
          yColumn: c.y || c.value || c.column,
          aggregation: "sum",
          width: "half",
          color: CHART_COLORS[idx % CHART_COLORS.length]
        }))
        setWidgets(newWidgets)
      }
    } catch (err) {
      console.error("Dashboard generation failed:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSheetChange = async (sheet: string) => {
    if (!datasetId) return
    setIsReprocessing(true)
    setSelectedSheet(sheet)
    try {
      const newResults = await reprocessDataset(datasetId, sheet === "ALL" ? "ALL_SHEETS" : sheet)
      setResults(newResults)
      setWidgets([])
    } catch (err) {
      console.error("Sheet reprocessing failed:", err)
    } finally {
      setIsReprocessing(false)
    }
  }

  // Auto-generate default widgets on first load
  const autoGenerateWidgets = useCallback(() => {
    if (!results || widgets.length > 0) return

    const auto: DashboardWidget[] = []

    if (results.analytics?.region_sales) {
      auto.push({
        id: "auto_region", type: "bar", title: "Revenue by Region",
        xColumn: "region", yColumn: "revenue", aggregation: "sum", width: "half", color: "#6366f1",
      })
    }
    if (results.analytics?.top_products) {
      auto.push({
        id: "auto_products", type: "bar", title: "Top Products",
        xColumn: "product", yColumn: "revenue", aggregation: "sum", width: "half", color: "#8b5cf6",
      })
    }
    if (catCols.length > 0 && numericCols.length > 0 && auto.length < 2) {
      auto.push({
        id: "auto_1", type: "bar", title: `${numericCols[0]} by ${catCols[0]}`,
        xColumn: catCols[0], yColumn: numericCols[0], aggregation: "sum", width: "half", color: "#06b6d4",
      })
    }
    if (catCols.length > 0 && numericCols.length > 0) {
      auto.push({
        id: "auto_pie", type: "pie", title: `${numericCols[0]} Distribution`,
        xColumn: catCols[0], yColumn: numericCols[0], aggregation: "sum", width: "half", color: "#10b981",
      })
    }
    if (numericCols.length >= 2) {
      auto.push({
        id: "auto_scatter", type: "scatter", title: `${numericCols[0]} vs ${numericCols[1]}`,
        xColumn: numericCols[0], yColumn: numericCols[1], aggregation: "sum", width: "half", color: "#f59e0b",
      })
    }
    if (catCols.length > 1 && numericCols.length > 0) {
      auto.push({
        id: "auto_line", type: "line", title: `${numericCols[0]} by ${catCols[1] || catCols[0]}`,
        xColumn: catCols[1] || catCols[0], yColumn: numericCols[0], aggregation: "mean", width: "half", color: "#f43f5e",
      })
    }

    if (auto.length > 0) setWidgets(auto)
  }, [results, widgets.length, catCols, numericCols, setWidgets])

  // Auto-generate on first results
  useEffect(() => {
    if (results && widgets.length === 0) {
      autoGenerateWidgets()
    }
  }, [results, widgets.length, autoGenerateWidgets])

  const editingWidget = editingId ? widgets.find((w) => w.id === editingId) : null

  const handleSave = (widget: DashboardWidget) => {
    if (editingId) {
      updateWidget(widget.id, widget)
    } else {
      addWidget(widget)
    }
    setShowEditor(false)
    setEditingId(null)
  }

  const getGridCol = (w: DashboardWidget["width"]) => {
    if (w === "full") return "1 / -1"
    if (w === "third") return "span 1"
    return "span 1"
  }

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <PageHeader
          title="Dashboard"
          subtitle={fileName ? `Analyzing: ${fileName}` : "Upload a dataset to begin"}
          actions={
            results && (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {results.available_sheets && results.available_sheets.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginRight: "1rem", background: "rgba(255,255,255,0.03)", padding: "0.25rem 0.5rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>📚 BOOK:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      disabled={isReprocessing}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary-400)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        outline: "none",
                        padding: "0.25rem"
                      }}
                    >
                      {results.available_sheets.map((s: string) => (
                        <option key={s} value={s} style={{ background: "var(--bg-dark)", color: "var(--text-main)" }}>Sheet: {s}</option>
                      ))}
                      <option value="ALL" style={{ background: "var(--bg-dark)", color: "var(--accent-amber)" }}>✨ All Sheets (Combined)</option>
                    </select>
                    {isReprocessing && <span style={{ fontSize: "0.7rem", color: "var(--primary-500)", animation: "pulse 1.5s infinite" }}>Processing...</span>}
                  </div>
                )}
                <button className="btn-secondary" onClick={() => window.print()} style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
                  🖨️ Export PDF
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => datasetId && downloadReport(datasetId)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.8rem",
                    border: "1px solid var(--accent-amber)",
                    background: "rgba(245,158,11,0.05)",
                    color: "var(--accent-amber)"
                  }}
                >
                  📄 Download Master Report
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => datasetId && downloadCleanData(datasetId)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.8rem",
                    border: "1px solid var(--accent-emerald)",
                    background: "rgba(16,185,129,0.05)",
                    color: "var(--accent-emerald)"
                  }}
                >
                  🧹 Download Clean CSV
                </button>
                <button
                  className="btn-secondary"
                  onClick={generateAIDashboard}
                  disabled={isGenerating}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.8rem",
                    border: "1px solid var(--primary-500)",
                    background: "rgba(99,102,241,0.05)",
                    color: "var(--primary-400)"
                  }}
                >
                  {isGenerating ? "🪄 Generating..." : "✨ AI Auto-Layout"}
                </button>
                <span className="badge badge-success">{results.rows?.toLocaleString()} rows</span>
                <button className="btn-primary" onClick={() => { setEditingId(null); setShowEditor(true) }} style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
                  + Add Chart
                </button>
              </div>
            )
          }
        />

        <div className="page-body">
          {/* Upload Section */}
          {!results && (
            <div style={{ maxWidth: "640px", margin: "3rem auto" }}>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  AI-Powered Analytics Dashboard
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Upload any sales CSV — we'll automatically detect columns, run AI analysis, and build an editable dashboard
                </p>
              </div>
              <CSVUploader />
            </div>
          )}

          {/* Results Dashboard */}
          <AnimatePresence>
            {results && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
              >
                {/* Tab Bar */}
                <div style={{ display: "flex", gap: "2px", background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: "3px", width: "fit-content" }}>
                  {[
                    { key: "dashboard", label: "📊 Dashboard" },
                    { key: "data", label: "📋 Data" },
                    { key: "ai", label: "🤖 AI Insights" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      style={{
                        padding: "0.5rem 1.25rem", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                        background: activeTab === tab.key ? "var(--primary-600)" : "transparent",
                        color: activeTab === tab.key ? "white" : "var(--text-secondary)",
                        fontSize: "0.8rem", fontWeight: 600, transition: "all 0.15s",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ========== DASHBOARD TAB ========== */}
                {activeTab === "dashboard" && (
                  <>
                    {/* NLBI Engine */}
                    <NLBIChartGenerator />

                    {/* Metrics */}
                    {results.analytics && <MetricsCards analytics={results.analytics} />}

                    {/* Editable Chart Grid */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "1.25rem",
                    }}>
                      <AnimatePresence>
                        {widgets.map((w) => (
                          <div key={w.id} style={{ gridColumn: getGridCol(w.width) }}>
                            <ChartWidget
                              widget={w}
                              rawData={rawData}
                              onEdit={() => { setEditingId(w.id); setShowEditor(true) }}
                              onRemove={() => removeWidget(w.id)}
                            />
                          </div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Add Chart Prompt */}
                    {widgets.length < 8 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => { setEditingId(null); setShowEditor(true) }}
                        style={{
                          border: "2px dashed var(--border-default)", borderRadius: "var(--radius-lg)", padding: "2.5rem",
                          textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                          background: "rgba(99,102,241,0.02)",
                        }}
                        whileHover={{ borderColor: "var(--primary-500)", background: "rgba(99,102,241,0.05)" }}
                      >
                        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>+</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          Click to add a new chart widget
                        </div>
                      </motion.div>
                    )}

                    {/* Simulations */}
                    {results.simulation_results?.length > 0 && (
                      <div className="chart-card">
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>🔮 What-If Simulations</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                          {results.simulation_results.map((sim, i) => (
                            <div key={i} style={{ padding: "1rem", background: "rgba(99,102,241,0.04)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{sim.scenario}</div>
                              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                                ${sim.estimated_revenue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ========== DATA TAB ========== */}
                {activeTab === "data" && rawData.length > 0 && (
                  <>
                    {/* Dataset Summary */}
                    {results.dataset_summary && (
                      <div className="chart-card">
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>📊 Dataset Profile</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
                          <div className="metric-card">
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rows</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary-400)" }}>{results.dataset_summary.total_rows.toLocaleString()}</div>
                          </div>
                          <div className="metric-card">
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Columns</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-cyan)" }}>{results.dataset_summary.total_columns}</div>
                          </div>
                          <div className="metric-card">
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Numeric</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{results.dataset_summary.numeric_columns?.length || 0}</div>
                          </div>
                          <div className="metric-card">
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Categorical</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-amber)" }}>{results.dataset_summary.categorical_columns?.length || 0}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Numeric Stats */}
                    {results.dataset_summary?.numeric_stats && Object.keys(results.dataset_summary.numeric_stats).length > 0 && (
                      <div className="chart-card">
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>📈 Column Statistics</h3>
                        <div style={{ overflowX: "auto" }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Column</th><th>Sum</th><th>Mean</th><th>Median</th><th>Min</th><th>Max</th><th>Std</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(results.dataset_summary.numeric_stats).map(([col, stats]) => (
                                <tr key={col}>
                                  <td style={{ fontWeight: 600, color: "var(--primary-400)" }}>{col}</td>
                                  <td>{stats.sum?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                  <td>{stats.mean?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                  <td>{stats.median?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                  <td>{stats.min?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                  <td>{stats.max?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                  <td>{stats.std?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Data Table */}
                    <DataTable data={rawData} columns={allCols} />
                  </>
                )}

                {/* ========== AI INSIGHTS TAB ========== */}
                {activeTab === "ai" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      {results.strategy?.length > 0 && <StrategyPanel strategy={results.strategy} />}
                      {results.insights?.length > 0 && <InsightsPanel insights={results.insights} />}
                    </div>

                    {results.recommendations?.length > 0 && (
                      <div className="chart-card">
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>🎯 AI Recommendations</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {results.recommendations.map((rec, i) => (
                            <div key={i} style={{ padding: "0.75rem 1rem", background: "rgba(16,185,129,0.04)", borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--accent-emerald)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {results.explanations?.length > 0 && <ExplanationsPanel explanations={results.explanations} />}

                    {/* Analyst Report */}
                    {results.analyst_report?.report && (
                      <div className="chart-card">
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1.5rem" }}>🧠 AI Autonomous CDO Report</h3>
                        <MarkdownRenderer text={results.analyst_report.report} />
                      </div>
                    )}

                    {/* NEW: Detailed Strategic Plan Section */}
                    {results.strategic_plan && (
                      <div className="chart-card" style={{ border: "1px solid var(--primary-500)", background: "rgba(99,102,241,0.03)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary-400)" }}>🌟 Deep Strategic Analysis & Roadmap</h3>
                          <div style={{ display: "flex", gap: "0.75rem" }}>
                            <button
                              className="btn-primary"
                              onClick={() => alert("Strategic Posture Activated: Syncing Marketing Hub and Finance ledger.")}
                              style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", background: "#10b981", border: "none" }}
                            >
                              🚀 Activate Strategy
                            </button>
                            <button
                              className="btn-primary"
                              onClick={() => datasetId && downloadStrategicPlanPDF(datasetId as string)}
                              style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", background: "var(--gradient-primary)" }}
                            >
                              📥 Download Master Report PDF
                            </button>
                          </div>
                        </div>
                        <div className="markdown-content" style={{ marginTop: "1rem" }}>
                          <MarkdownRenderer text={results.strategic_plan} />
                        </div>
                      </div>
                    )}

                    {/* ML Results */}
                    {results.ml_predictions && Object.keys(results.ml_predictions).length > 0 && (
                      <div className="chart-card">
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>🧠 ML Pipeline Results</h3>
                        <pre style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "var(--radius-md)", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                          {JSON.stringify(results.ml_predictions, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {/* Upload another */}
                <div style={{ marginTop: "0.5rem", padding: "1rem 0" }}>
                  <CSVUploader />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Widget Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <WidgetEditor
            existingWidget={editingWidget}
            numericColumns={numericCols}
            categoricalColumns={catCols}
            onSave={handleSave}
            onClose={() => { setShowEditor(false); setEditingId(null) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}