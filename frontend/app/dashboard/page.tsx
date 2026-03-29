"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import CSVUploader from "@/components/upload/CSVUploader"
import MetricsCards from "@/components/dashboard/MetricsCards"
import StrategyPanel from "@/components/dashboard/StrategyPanel"
import InsightsPanel from "@/components/dashboard/InsightsPanel"
import TradingIntelligencePanel from "@/components/analytics/TradingIntelligencePanel"
import ChartWidget from "@/components/dashboard/ChartWidget"
import WidgetEditor from "@/components/dashboard/WidgetEditor"
import DataTable from "@/components/dashboard/DataTable"
import AnomalyPanel from "@/components/dashboard/AnomalyPanel"
import LiquidityForecast from "@/components/dashboard/LiquidityForecast"
import { useToast } from "@/components/ui/Toast"
import { useStore, CHART_COLORS } from "@/store/useStore"
import { getDashboardConfig, downloadStrategicPlanPDF, getLiveKPIs, syncWorkspaceToDashboard } from "@/services/api"
import { motion, AnimatePresence } from "framer-motion"
import MarkdownRenderer from "@/components/ai/MarkdownRenderer"
import { Button, Card, Badge } from "@/components/ui"
import { getAuthToken } from "@/lib/session"
import { Sparkles, Rocket, PlugZap, ShieldCheck, LineChart } from "lucide-react"

export default function Dashboard() {
  const { 
    results, 
    datasetId, 
    fileName, 
    widgets, 
    addWidget, 
    updateWidget, 
    removeWidget, 
    setWidgets, 
    setResults, 
    setFileName,
    setDatasetId,
    onboardingComplete
  } = useStore()
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"dashboard" | "data" | "ai">("dashboard")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [liveKPIs, setLiveKPIs] = useState<any>(null)
  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false)

  const { showToast } = useToast()

  const refreshLiveKpis = useCallback(async () => {
    try {
      const data = await getLiveKPIs()
      if (data?.kpis && typeof data.kpis === "object") {
        setLiveKPIs(data.kpis)
      }
    } catch {
      /* backend optional */
    }
  }, [])

  // HTTP KPI snapshot (WS auth is easy to misconfigure; polling keeps UI alive)
  useEffect(() => {
    if (!results) return
    refreshLiveKpis()
    const id = window.setInterval(refreshLiveKpis, 25000)
    return () => window.clearInterval(id)
  }, [results, refreshLiveKpis])

  // Live KPI WebSocket — correct path + JWT query (browser cannot send Authorization header)
  useEffect(() => {
    let ws: WebSocket | undefined
    let cancelled = false
    const connect = () => {
      const token = typeof window !== "undefined" ? getAuthToken() : null
      if (!token) return

      const rawApiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim()
      const backendBase =
        /^https?:\/\//i.test(rawApiBase)
          ? rawApiBase
              .replace(/\/api\/backend\/api\/v1\/?$/i, "")
              .replace(/\/api\/v1\/?$/i, "")
              .replace(/\/$/, "")
          : "http://127.0.0.1:8000"
      const proto = backendBase.startsWith("https") ? "wss" : "ws"
      const host = backendBase.replace(/^https?:\/\//, "")
      const qs = token ? `?token=${encodeURIComponent(token)}` : ""
      const wsUrl = `${proto}://${host}/api/v1/analytics/ws/live-kpis${qs}`
      try {
        ws = new WebSocket(wsUrl)
      } catch {
        return
      }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          if (d.kpis) setLiveKPIs(d.kpis)
        } catch {
          /* ignore */
        }
      }
      ws.onclose = () => {
        if (!cancelled) window.setTimeout(connect, 6000)
      }
    }
    connect()
    return () => {
      cancelled = true
      ws?.close()
    }
  }, [])

  const numericCols = useMemo(() => results?.numeric_columns || [], [results?.numeric_columns])
  const catCols = useMemo(() => results?.categorical_columns || [], [results?.categorical_columns])
  const rawData = results?.raw_data || []
  const allCols = results?.columns || []

  // Default charts when the user has not run Autonomous Gen yet
  useEffect(() => {
    if (!results?.dataset_id || !rawData.length || widgets.length > 0) return
    const pickY =
      numericCols.find((c) => /revenue|amount|sales|total|qty|quantity|price|value/i.test(c)) || numericCols[0]
    const pickX =
      catCols.find((c) => /product|region|category|customer|vendor|name|sku|month/i.test(c)) || catCols[0]
    if (!pickX || !pickY) return
    addWidget({
      id: `default-bar-${pickX}-${pickY}`,
      type: "bar",
      title: `${pickY} by ${pickX}`,
      xColumn: pickX,
      yColumn: pickY,
      aggregation: "sum",
      width: "half",
      color: CHART_COLORS[0],
    })
    const altY = numericCols.find((c) => c !== pickY)
    if (altY) {
      addWidget({
        id: `default-line-${pickX}-${altY}`,
        type: "line",
        title: `${altY} by ${pickX}`,
        xColumn: pickX,
        yColumn: altY,
        aggregation: "mean",
        width: "half",
        color: CHART_COLORS[1],
      })
    }
  }, [results?.dataset_id, rawData.length, widgets.length, numericCols, catCols, addWidget])

  // Business Logic
  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const token = getAuthToken()
      if (!token) return

      const data = await syncWorkspaceToDashboard()
      setResults(data)
      setDatasetId(data.dataset_id)
      setFileName("Strategic Live Stream")
      showToast("success", "Sync Established", "Neural link with workspace active.")
    } catch {
      showToast("warning", "Sync Interrupted", "Ensure data is uploaded in the Workspace.")
    } finally {
      setIsSyncing(false)
    }
  }, [showToast, setResults, setDatasetId, setFileName])

  useEffect(() => {
    const token = getAuthToken()
    if (!results && token && onboardingComplete && !isSyncing && !autoSyncAttempted) {
      setAutoSyncAttempted(true)
      handleSync()
    }
  }, [onboardingComplete, autoSyncAttempted, results, isSyncing, handleSync])

  const generateAI = async () => {
    if (!datasetId) return
    setIsGenerating(true)
    try {
      const config = await getDashboardConfig(datasetId)
      if (config.charts) {
        setWidgets(config.charts.map((c: any, i: number) => ({
          id: `ai_${i}`, type: c.chart_type === "histogram" ? "bar" : c.chart_type,
          title: c.title, xColumn: c.x || c.column, yColumn: c.y || c.column,
          aggregation: "sum", width: "half", color: CHART_COLORS[i % CHART_COLORS.length]
        })))
      }
    } finally { setIsGenerating(false) }
  }

  const actions = (
    <div className="flex items-center gap-4">
      <Button variant="outline" size="sm" onClick={handleSync} loading={isSyncing} className="hidden lg:flex text-[9px] tracking-widest uppercase font-black">SYNC REAL-TIME</Button>
      <Button variant="pro" size="sm" onClick={generateAI} loading={isGenerating} className="text-[9px] tracking-widest uppercase font-black shadow-indigo-500/20">AUTONOMOUS GEN</Button>
      <Button variant="primary" size="sm" onClick={() => { setEditingId(null); setShowEditor(true) }} className="text-[9px] tracking-widest uppercase font-black">MANUAL INJECT</Button>
    </div>
  )

  return (
    <DashboardLayout 
      title="Command Center" 
      subtitle={fileName ? `Live Data Stream: ${fileName}` : "Connect your data to activate the intelligence layer"}
      actions={results ? actions : null}
    >
      <div className="space-y-10">
        {!results ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-20">
             <Card variant="glass" className="p-12 text-center border-[--border-subtle] bg-[--surface-1] aurora-ring">
                <div className="w-24 h-24 bg-indigo-500/10 rounded-[40px] border border-indigo-500/20 flex items-center justify-center mx-auto mb-10 neural-pulse-glow">
                   <Rocket size={42} className="text-[--primary]" />
                </div>
                <h1 className="text-4xl font-black text-[--text-primary] tracking-tighter mb-4">Neural Link Inactive</h1>
                <p className="text-sm text-[--text-muted] font-medium max-w-lg mx-auto leading-relaxed mb-12 uppercase tracking-wide">
                  Inject datasets to activate the autonomous strategic layer.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="p-10 bg-[--surface-2] rounded-3xl border border-[--border-subtle] hover:border-[--border-default] transition-all"><CSVUploader /></div>
                   <div className="p-10 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 flex flex-col items-center justify-center gap-6 group cursor-pointer hover:bg-indigo-500/10 transition-all" onClick={handleSync}>
                      <PlugZap size={30} className="text-[--primary] group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-[--text-primary]">Live Workspace Sync</h4>
                        <p className="text-[10px] text-[--text-muted] font-bold mt-2 uppercase">Direct ERP Data Extraction</p>
                      </div>
                      <Button variant="pro" size="lg" loading={isSyncing} className="w-full">SYNCHRONIZE NOW</Button>
                   </div>
                </div>
             </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
            {/* TAB NAV */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-[--border-subtle]">
                <div className="flex p-1 rounded-2xl bg-[--surface-1] border border-[--border-subtle]">
                  {(["dashboard", "data", "ai"] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === t ? "bg-indigo-500/20 text-indigo-400" : "text-[--text-muted] hover:text-[--text-primary]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <Badge variant="pro" pulse size="lg" className="bg-[--surface-2] border-[--border-default] font-geist tracking-widest">{results.rows?.toLocaleString()} DATA-POINTS AGGREGATED</Badge>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div key="dash" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-10">
                   {results.analytics && <MetricsCards analytics={results.analytics} />}

                   {liveKPIs && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[--text-muted] mb-3">Live stream</p>
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                         {Object.entries(liveKPIs).slice(0, 6).map(([k, v]: [string, any]) => (
                           <Card key={k} variant="glass" className="p-1 border-[--border-subtle] bg-[--surface-1] text-center hover:border-indigo-500/30 transition-all">
                              <div className="p-5">
                                <div className="text-[9px] font-black text-indigo-500/70 uppercase tracking-widest mb-2">{k.replace(/_/g, " ")}</div>
                                <div className="text-xl font-black text-[--text-primary] tracking-tighter">
                                  {typeof v === "number" ? (String(k).includes("revenue") ? `₹${(v/1000).toFixed(1)}k` : v.toFixed(1)) : v}
                                </div>
                              </div>
                           </Card>
                         ))}
                        </div>
                      </div>
                   )}

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {(results?.anomalies && results.anomalies.length > 0) ? (
                        <AnomalyPanel anomalies={results.anomalies} />
                      ) : (
                        <Card variant="glass" className="p-6 border-[--border-subtle] bg-[--surface-1]/80">
                          <div className="flex gap-4 items-start">
                            <div className="w-11 h-11 rounded-xl bg-[--accent-emerald]/15 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-5 h-5 text-[--accent-emerald]" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black uppercase tracking-wide text-[--text-primary]">Anomaly scan</h3>
                              <p className="text-sm text-[--text-muted] mt-1 leading-relaxed">
                                No anomaly flags in this snapshot. Upload richer time series or run sync after new workspace activity to refresh.
                              </p>
                            </div>
                          </div>
                        </Card>
                      )}
                      {results?.predictive_liquidity ? (
                        <LiquidityForecast data={results.predictive_liquidity} />
                      ) : (
                        <Card variant="glass" className="p-6 border-[--border-subtle] bg-[--surface-1]/80">
                          <div className="flex gap-4 items-start">
                            <div className="w-11 h-11 rounded-xl bg-[--primary]/12 flex items-center justify-center shrink-0">
                              <LineChart className="w-5 h-5 text-[--primary]" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black uppercase tracking-wide text-[--text-primary]">Liquidity outlook</h3>
                              <p className="text-sm text-[--text-muted] mt-1 leading-relaxed">
                                Forecast curves appear when the pipeline produces a liquidity projection. Try Autonomous Gen or enrich expense / ledger columns.
                              </p>
                            </div>
                          </div>
                        </Card>
                      )}
                   </div>

                   {Array.isArray(results.insights) && results.insights.length > 0 && (
                     <Card variant="glass" className="p-6 border-[--border-default] bg-[--surface-1]">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[--primary] mb-3">Signals</p>
                       <ul className="grid sm:grid-cols-2 gap-3">
                         {results.insights.slice(0, 6).map((line, i) => (
                           <li key={i} className="text-sm text-[--text-secondary] leading-snug border-l-2 border-[--primary]/25 pl-3">
                             {line}
                           </li>
                         ))}
                       </ul>
                     </Card>
                   )}

                   <div>
                     <div className="flex items-center justify-between gap-3 mb-4">
                       <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[--text-muted]">Visualizations</p>
                       {widgets.length === 0 && (
                         <span className="text-[11px] text-[--text-dim]">Generating defaults from your columns…</span>
                       )}
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {widgets.map(w => <ChartWidget key={w.id} widget={w} rawData={rawData} onEdit={() => {setEditingId(w.id); setShowEditor(true)}} onRemove={() => removeWidget(w.id)} />)}
                     </div>
                   </div>
                </motion.div>
              )}

              {activeTab === "data" && (
                <motion.div key="data" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                   <Card variant="bento" className="bg-[--surface-1] border-[--border-subtle]"><DataTable data={rawData} columns={allCols} /></Card>
                </motion.div>
              )}

              {activeTab === "ai" && (
                <motion.div key="ai" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                   {results.dataset_type === "market_dataset" && results.market_intelligence && <TradingIntelligencePanel marketIntelligence={results.market_intelligence} report={results.analyst_report?.report || ""} />}
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {results.strategy?.length > 0 && <StrategyPanel strategy={results.strategy} />}
                      {results.insights?.length > 0 && <InsightsPanel insights={results.insights} />}
                   </div>
                   {results.strategic_plan && (
                      <Card variant="glass" className="p-10 bg-indigo-500/5 border-indigo-500/20">
                         <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
                            <div><Badge variant="pro" className="mb-4"><Sparkles size={12} className="mr-1" />EXECUTIVE BRIEF</Badge><h1 className="text-4xl font-black text-[--text-primary] tracking-tighter leading-none">Strategic Execution Roadmap</h1></div>
                            <Button variant="pro" size="md" onClick={() => datasetId && downloadStrategicPlanPDF(datasetId)}>EXPORT MASTER PERSPECTIVE</Button>
                         </div>
                         <div className="prose prose-invert max-w-none"><MarkdownRenderer text={results.strategic_plan} /></div>
                      </Card>
                   )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showEditor && <WidgetEditor existingWidget={editingId ? widgets.find(w => w.id === editingId) : null} numericColumns={numericCols} categoricalColumns={catCols} onSave={(w) => { if(editingId) updateWidget(w.id, w); else addWidget(w); setShowEditor(false); }} onClose={() => setShowEditor(false)} />}
      </AnimatePresence>
    </DashboardLayout>
  )
}


