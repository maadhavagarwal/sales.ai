"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import CSVUploader from "@/components/upload/CSVUploader"
import MetricsCards from "@/components/dashboard/MetricsCards"
import StrategyPanel from "@/components/dashboard/StrategyPanel"
import InsightsPanel from "@/components/dashboard/InsightsPanel"
import ExplanationsPanel from "@/components/dashboard/ExplanationsPanel"
import NLBIChartGenerator from "@/components/ai/NLBIChartGenerator"
import TradingIntelligencePanel from "@/components/analytics/TradingIntelligencePanel"
import ChartWidget from "@/components/dashboard/ChartWidget"
import WidgetEditor from "@/components/dashboard/WidgetEditor"
import DataTable from "@/components/dashboard/DataTable"
import AnomalyPanel from "@/components/dashboard/AnomalyPanel"
import LiquidityForecast from "@/components/dashboard/LiquidityForecast"
import DebugPanel from "@/components/DebugPanel"
import { useToast } from "@/components/ui/Toast"
import { useStore, CHART_COLORS, DashboardWidget } from "@/store/useStore"
import { getDashboardConfig, downloadStrategicPlanPDF, reprocessDataset, getCopilotResponse } from "@/services/api"
import { motion, AnimatePresence } from "framer-motion"
import MarkdownRenderer from "@/components/ai/MarkdownRenderer"
import { Button, Card, Badge } from "@/components/ui"

export default function Dashboard() {
  const { results, datasetId, fileName, widgets, addWidget, updateWidget, removeWidget, setWidgets, setResults, setFileName } = useStore()
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"dashboard" | "data" | "ai">("dashboard")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<string>("0")

  const { showToast } = useToast()

  const numericCols = useMemo(() => results?.numeric_columns || [], [results?.numeric_columns])
  const catCols = useMemo(() => results?.categorical_columns || [], [results?.categorical_columns])
  const rawData = results?.raw_data || []
  const allCols = results?.columns || []

  // Business Logic
  const handleLiveSync = async () => {
    setIsSyncing(true)
    try {
      const { syncWorkspaceToDashboard, getCashFlowForecast } = await import("@/services/api")
      const data = await syncWorkspaceToDashboard()
      
      // Fetch Cash Flow Gap independently if not in sync payload
      if (!data.predictive_liquidity) {
          try {
              const cf = await getCashFlowForecast()
              data.predictive_liquidity = cf
          } catch {}
      }
      
      setResults(data)
      setFileName("Live Enterprise Stream")
      setWidgets([]) // Reset widgets for new dataset logic
      showToast("success", "Live Sync Successful", "Workspace data synchronized.")
    } catch (err: any) {
      console.error("Live Sync Failed:", err)
      showToast("error", "Live Sync Failed", err.message || "An error occurred during sync.")
    } finally {
      setIsSyncing(false)
    }
  }

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
    setSelectedSheet(sheet)
    try {
      const newResults = await reprocessDataset(datasetId, sheet === "ALL" ? "ALL_SHEETS" : sheet)
      console.log("Reprocess results:", newResults) // Debug
      setResults(newResults)
      setWidgets([])
    } catch (err: any) {
      console.error("Sheet reprocessing failed:", err)
      showToast("error", "Sheet Processing Failed", err?.message || "Unable to reprocess dataset")
    }
  }

  const autoGenerateWidgets = useCallback(() => {
    if (!results || widgets.length > 0) return
    const auto: DashboardWidget[] = []
    if (results.analytics?.region_sales) {
      auto.push({ id: "auto_region", type: "bar", title: "Revenue by Region", xColumn: "region", yColumn: "revenue", aggregation: "sum", width: "half", color: "#6366f1" })
    }
    if (results.analytics?.top_products) {
      auto.push({ id: "auto_products", type: "bar", title: "Top Products", xColumn: "product", yColumn: "revenue", aggregation: "sum", width: "half", color: "#8b5cf6" })
    }
    if (catCols.length > 0 && numericCols.length > 0 && auto.length < 2) {
      auto.push({ id: "auto_1", type: "bar", title: `${numericCols[0]} by ${catCols[0]}`, xColumn: catCols[0], yColumn: numericCols[0], aggregation: "sum", width: "half", color: "#06b6d4" })
    }
    if (catCols.length > 0 && numericCols.length > 0) {
      auto.push({ id: "auto_pie", type: "pie", title: `${numericCols[0]} Distribution`, xColumn: catCols[0], yColumn: numericCols[0], aggregation: "sum", width: "half", color: "#10b981" })
    }
    if (auto.length > 0) setWidgets(auto)
  }, [results, widgets.length, catCols, numericCols, setWidgets])

  useEffect(() => {
    if (results && widgets.length === 0) autoGenerateWidgets()
  }, [results, widgets.length, autoGenerateWidgets])

  const editingWidget = editingId ? widgets.find((w) => w.id === editingId) : null

  const handleSave = (widget: DashboardWidget) => {
    if (editingId) updateWidget(widget.id, widget)
    else addWidget(widget)
    setShowEditor(false)
    setEditingId(null)
  }

  const headerActions = (
    <div className="flex items-center gap-4">
      {results?.available_sheets && results.available_sheets.length > 1 && (
        <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
          <span className="text-[10px] font-black tracking-widest text-[--text-muted]">ENGINE BOOK:</span>
          <select
            value={selectedSheet}
            onChange={(e) => handleSheetChange(e.target.value)}
            className="bg-transparent border-none text-xs font-black text-[--primary] outline-none cursor-pointer uppercase tracking-tight"
          >
            {results.available_sheets.map((s: string) => (
              <option key={s} value={s} className="bg-slate-900">{s}</option>
            ))}
            <option value="ALL" className="bg-slate-900 text-[--accent-amber]">Combined Master</option>
          </select>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={handleLiveSync} loading={isSyncing} icon={<span>⚡</span>} className="hidden sm:flex tracking-widest text-[10px]">COGNITIVE SYNC</Button>
      <Button variant="pro" size="sm" onClick={generateAIDashboard} loading={isGenerating} icon={<span>✨</span>} className="shadow-[--shadow-glow] tracking-widest text-[10px]">AI AUTONOMOUS</Button>
      <Button variant="primary" size="sm" onClick={() => { setEditingId(null); setShowEditor(true) }} icon={<span>+</span>} className="tracking-widest text-[10px]">VISUALIZE</Button>
    </div>
  )

  return (
    <DashboardLayout
      title="Executive Nexus"
      subtitle={fileName ? (
        <div className="flex items-center gap-2">
          <span className={fileName.includes("Live") ? "text-[--accent-cyan]" : "text-[--primary]"}>{fileName.includes("Live") ? "LIVE STREAM ACTIVE:" : "Vector Stream Active:"}</span>
          <span>{fileName}</span>
          {fileName.includes("Live") && <Badge variant="pro" pulse size="xs">SYNCHRONIZED</Badge>}
        </div>
      ) : "Awaiting autonomous data ingestion..."}
      actions={results ? headerActions : null}
    >
      <div className="space-y-16">
        {!results ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto text-center py-20"
          >
            <Card variant="glass" padding="lg" className="border-dashed border-white/10 bg-white/[0.01]">
              <div className="w-24 h-24 bg-gradient-to-br from-[--primary]/20 to-[--accent-violet]/20 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-[--shadow-glow] border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[--primary]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-4xl relative z-10 transition-transform group-hover:scale-110">🚀</span>
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter mb-4 font-jakarta">
                Initialize Neural Analysis
              </h2>
              <p className="text-md text-[--text-muted] font-medium max-w-lg mx-auto leading-relaxed mb-12 italic">
                Inject enterprise datasets or synchronize with live Workspace operations to activate autonomous intelligence.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="p-8 bg-black/40 rounded-3xl border border-white/5 shadow-2xl flex flex-col items-center">
                  <CSVUploader />
                </div>
                <div className="p-8 bg-black/40 rounded-3xl border border-white/5 shadow-2xl flex flex-col items-center justify-center gap-6 group hover:border-[--primary]/30 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-[--primary]/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">⚡</div>
                  <div className="text-center">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Workspace Live Sync</h4>
                    <p className="text-[10px] text-[--text-muted] font-bold mt-2 uppercase tracking-tight">Sync directly with Bills, Expenses & Ledgers.</p>
                  </div>
                  <Button variant="pro" size="lg" onClick={handleLiveSync} loading={isSyncing} className="w-full shadow-[--shadow-glow]">
                    SYNC LIVE ERP
                  </Button>
                </div>
              </div>

              <div className="mt-12 flex items-center justify-center gap-8 grayscale opacity-40">
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">TensorFlow Engine</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">PyTorch Core</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">LLM Strategic Layer</span>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-12">
            {/* Top Bar Status */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-white/5">
              <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner overflow-hidden">
                {(["dashboard", "data", "ai"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                                    relative px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500
                                    ${activeTab === tab
                        ? "text-white"
                        : "text-[--text-muted] hover:text-white"}
                                `}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="navTab"
                        className="absolute inset-0 bg-gradient-to-br from-[--primary] to-[--primary-dark] shadow-[--shadow-glow] z-[-1] rounded-xl"
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <Badge variant="pro" pulse size="lg" className="border-white/10 bg-black/40 font-geist tracking-[0.2em]">
                  {results.rows?.toLocaleString()} DATAPOINTS AGGREGATED
                </Badge>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-12"
                >
                  <NLBIChartGenerator />
                  
                  {results.predictive_liquidity && (
                      <LiquidityForecast data={results.predictive_liquidity} />
                  )}

                  {results.anomalies && results.anomalies.length > 0 && (
                      <AnomalyPanel anomalies={results.anomalies} />
                  )}

                  {results.analytics && <MetricsCards analytics={results.analytics} />}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <AnimatePresence>
                      {widgets.map((w) => (
                        <div key={w.id} className={w.width === "full" ? "md:col-span-2" : ""}>
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

                  {widgets.length < 8 && (
                    <button
                      onClick={() => { setEditingId(null); setShowEditor(true) }}
                      className="w-full py-24 rounded-3xl border-2 border-dashed border-white/5 text-[--text-muted] hover:border-[--primary]/50 hover:text-white hover:bg-[--primary]/5 transition-all group relative overflow-hidden"
                    >
                      <div className="relative z-10 flex flex-col items-center gap-4">
                        <span className="text-3xl group-hover:scale-125 group-hover:rotate-12 transition-transform opacity-40 group-hover:opacity-100">📡</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] transition-all group-hover:tracking-[0.6em]">Integrate Synthetic Perspective</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[--primary]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </motion.div>
              )}

              {activeTab === "data" && (
                <motion.div
                  key="data"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <Card variant="bento" padding="lg">
                    <DataTable data={rawData} columns={allCols} />
                  </Card>
                </motion.div>
              )}

              {activeTab === "ai" && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  className="space-y-12"
                >
                  {results.dataset_type === "market_dataset" && results.market_intelligence && (
                    <div className="mb-12">
                      <Badge variant="pro" className="mb-6 tracking-[0.2em]">FINANCIAL RISK ENGINE ACTIVE</Badge>
                      <TradingIntelligencePanel
                        marketIntelligence={results.market_intelligence}
                        report={results.analyst_report?.report || ""}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {results.strategy?.length > 0 && <StrategyPanel strategy={results.strategy} />}
                    {results.insights?.length > 0 && <InsightsPanel insights={results.insights} />}
                  </div>
                  {results.explanations?.length > 0 && <ExplanationsPanel explanations={results.explanations} />}

                  {results.analyst_report?.report && (
                    <Card variant="glass" padding="lg">
                      <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-[--primary]/20 flex items-center justify-center text-xl">📋</div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Autonomous Board Executive Directive</h3>
                      </div>
                      <div className="prose prose-invert max-w-none prose-p:font-medium prose-headings:font-black prose-headings:tracking-tighter">
                        <MarkdownRenderer text={results.analyst_report.report} />
                      </div>
                    </Card>
                  )}

                  {results.strategic_plan && (
                    <Card variant="bento" padding="lg" className="border-[--primary]/30 bg-gradient-to-br from-[--primary]/5 to-transparent">
                      <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
                        <div>
                          <Badge variant="pro" className="mb-4">Top Secret Intelligence</Badge>
                          <h3 className="text-3xl font-black text-white tracking-tighter leading-none font-jakarta">Quantum Strategic Roadmap</h3>
                          <p className="text-xs font-bold text-[--text-muted] mt-3 opacity-60 uppercase tracking-widest leading-relaxed">Synthesized Multi-horizon Autonomous Execution Architecture.</p>
                        </div>
                        <div className="flex gap-4 items-start">
                          <Button variant="pro" size="md" onClick={() => datasetId && downloadStrategicPlanPDF(datasetId)} className="shadow-[--shadow-glow]">
                            EXPORT MASTER INTEL
                          </Button>
                        </div>
                      </div>
                      <div className="prose prose-invert max-w-none bg-black/20 p-8 rounded-2xl border border-white/5 shadow-inner">
                        <MarkdownRenderer text={results.strategic_plan} />
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-16 border-t border-white/5">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">📥</div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[--text-muted]">Ingestion Stream Aggregator</h4>
              </div>
              <Card variant="glass" padding="lg" className="bg-white/[0.01]">
                <CSVUploader />
              </Card>
            </div>
          </motion.div>
        )}
      </div>

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

      <CopilotFloating datasetId={datasetId || undefined} />
    </DashboardLayout>
  )
}

function CopilotFloating({ datasetId }: { datasetId?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [history, setHistory] = useState<Array<{ type: "user" | "ai"; text: string }>>([])
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!query) return
    setLoading(true)
    const currentQuery = query
    setQuery("")
    setHistory((prev) => [...prev, { type: "user", text: currentQuery }])

    try {
      const res = await getCopilotResponse(currentQuery, datasetId)
      setHistory(h => [...h, { type: "ai", text: res.response }])
    } catch {
      setHistory(h => [...h, { type: "ai", text: "Neural Link Error: System recalibrating..." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[400px] h-[500px] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-[--primary]/10 border-b border-white/5 flex justify-between items-center">
              <div>
                <Badge variant="primary" size="xs">COPILOT v2</Badge>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Autonomous Business Intelligence</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-pro">
              {history.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <span className="text-4xl mb-4">🧠</span>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Neural Link Active</p>
                  <p className="text-[10px] text-white/40 mt-2 leading-relaxed italic">
                    "Ask me about your sales, inventory risk, or financial health. I analyze live data streams."
                  </p>
                </div>
              )}
              {history.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-xs font-bold ${msg.type === "user" ? "bg-[--primary] text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]" : "bg-white/5 text-white/80 border border-white/5"}`}>
                    <MarkdownRenderer text={msg.text} />
                  </div>
                </div>
              ))}
              {loading && <div className="text-[10px] font-black text-[--primary] animate-pulse italic">Neural reasoning in progress...</div>}
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Query your enterprise data..."
                  className="input-pro w-full pr-12 text-xs py-3"
                />
                <button
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[--primary]/20 text-[--primary] flex items-center justify-center hover:bg-[--primary] hover:text-white transition-all"
                >
                  ↑
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full bg-[--primary] shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center text-2xl relative group"
      >
        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping group-hover:hidden" />
        🧠
      </motion.button>
    </div>
  )
}
