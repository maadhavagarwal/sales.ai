"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { simulateWhatIf, getCashFlowForecast, getRevenueScenarios, api } from "@/services/api"
import { useStore } from "@/store/useStore"
import { Card, Button, Badge } from "@/components/ui"
import { TrendingUp, TrendingDown, AlertCircle, Zap, Brain, BarChart3, LineChart } from "lucide-react"

export default function WorkspaceIntelligence() {
    const { currencySymbol } = useStore()
    const [scenarios, setScenarios] = useState<any[]>([])
    const [cashFlow, setCashFlow] = useState<any>(null)
    const [anomalies, setAnomalies] = useState<any[]>([])
    const [whatIfInput, setWhatIfInput] = useState("")
    const [whatIfResult, setWhatIfResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [activeView, setActiveView] = useState<"scenarios" | "cashflow" | "whatif" | "anomalies">("scenarios")

    useEffect(() => {
        loadIntelligence()
    }, [])

    const loadIntelligence = async () => {
        setLoading(true)
        try {
            const [sRes, cRes, aRes] = await Promise.all([
                getRevenueScenarios(),
                getCashFlowForecast(),
                (async () => {
                    try {
                        const { data } = await api.get("/workspace/accounting/anomalies")
                        return data;
                    } catch (err) {
                        return { alerts: [] };
                    }
                })()
            ])
            setScenarios(sRes || [])
            setCashFlow(cRes)
            setAnomalies(aRes?.alerts || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleWhatIfSubmit = async () => {
        if (!whatIfInput) return
        setLoading(true)
        try {
            const res = await simulateWhatIf(whatIfInput)
            setWhatIfResult(res)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                     <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">AI Decision Intelligence</h3>
                     <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.3em] mt-1">Enterprise-Grade Financial Modeling & Simulation</p>
                </div>
                <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/5">
                    <button 
                        onClick={() => setActiveView("scenarios")}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'scenarios' ? 'bg-[--primary] text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        Outlook Scenarios
                    </button>
                    <button 
                        onClick={() => setActiveView("cashflow")}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'cashflow' ? 'bg-[--primary] text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        Cash Flow Forecast
                    </button>
                    <button 
                        onClick={() => setActiveView("whatif")}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'whatif' ? 'bg-[--primary] text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        What-If Engine
                    </button>
                    <button 
                        onClick={() => setActiveView("anomalies")}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'anomalies' ? 'bg-[--primary] text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        Anomalies
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeView === "anomalies" && (
                    <motion.div 
                        key="anomalies"
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-widest text-white/40">Neural Anomaly Detection (Isolation Forest)</h4>
                            <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-500 uppercase">Scanning Active</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {anomalies.length === 0 ? (
                                <Card variant="glass" className="col-span-full p-12 text-center border-dashed border-white/5 opacity-30 italic">
                                    No irregularities detected in recent cycles.
                                </Card>
                            ) : (
                                anomalies.map((a, i) => (
                                    <Card key={i} variant="bento" className="p-8 border-white/5 bg-white/[0.01] hover:border-[--primary]/20 transition-all">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                                    <AlertCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Trigger</p>
                                                    <h5 className="text-sm font-black text-white italic uppercase">{a.metric}</h5>
                                                </div>
                                            </div>
                                            <Badge className={a.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}>
                                                {a.severity}
                                            </Badge>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-base font-bold text-white italic leading-relaxed">"{a.insight}"</p>
                                            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                                                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Recommended Response</p>
                                                <p className="text-[11px] font-medium text-slate-400 leading-relaxed">{a.recommendation}</p>
                                            </div>
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-4">Detected on {a.date}</p>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
                {activeView === "scenarios" && (
                    <motion.div 
                        key="scenarios"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        {scenarios.map((s, i) => (
                            <Card key={i} variant="bento" padding="lg" className={`relative overflow-hidden group border-white/5 ${s.case === 'Bull' || s.case === 'Expansive' ? 'bg-emerald-500/5 hover:border-emerald-500/30' : s.case === 'Base' || s.case === 'Target' ? 'bg-blue-500/5 hover:border-blue-500/30' : 'bg-rose-500/5 hover:border-rose-500/30'}`}>
                                <div className={`absolute top-0 right-0 p-6 text-4xl opacity-5 transition-transform group-hover:scale-110 ${s.case === 'Bull' || s.case === 'Expansive' ? 'text-emerald-500' : s.case === 'Base' || s.case === 'Target' ? 'text-blue-500' : 'text-rose-500'}`}>
                                    {s.case === 'Bull' || s.case === 'Expansive' ? <TrendingUp /> : s.case === 'Base' || s.case === 'Target' ? <Zap /> : <TrendingDown />}
                                </div>
                                <Badge variant={s.case === 'Bull' || s.case === 'Expansive' ? 'success' : s.case === 'Base' || s.case === 'Target' ? 'primary' : 'danger'} className="mb-6 uppercase tracking-widest text-[9px]">
                                    {s.case === 'Bull' ? 'Expansive' : s.case === 'Base' ? 'Target' : s.case === 'Bear' ? 'Defensive' : s.case} Outlook
                                </Badge>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Projected Revenue</p>
                                <h4 className="text-4xl font-black text-white italic tracking-tighter mb-6">{currencySymbol}{s.revenue?.toLocaleString()}</h4>
                                <div className="space-y-4 pt-6 border-t border-white/5">
                                    <p className="text-xs font-bold text-white/70 leading-relaxed italic">"{s.desc}"</p>
                                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Core Assumption</p>
                                        <p className="text-[10px] font-bold text-white/60">{s.assumptions}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </motion.div>
                )}

                {activeView === "cashflow" && (
                    <motion.div 
                        key="cashflow"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            <Card variant="glass" padding="lg" className="bg-black/40 border-white/5 lg:col-span-3">
                                <div className="flex justify-between items-center mb-10">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-3">
                                        <LineChart className="w-4 h-4 text-[--primary]" /> 90-Day Liquidity Projection
                                    </h4>
                                    <Badge variant={cashFlow?.risk_assessment === 'STABLE' ? 'success' : 'danger'} pulse>
                                        {cashFlow?.risk_assessment} PROFILE
                                    </Badge>
                                </div>
                                
                                 <div className="h-64 flex items-end gap-1 pb-4">
                                    {(cashFlow?.forecast_90d || []).map((f: any, i: number) => {
                                        const denom = (cashFlow?.current_balance || 1) * 2
                                        const percentage = denom !== 0 ? (f.projected_cash / denom) * 100 : 0
                                        const heightVal = isFinite(percentage) ? Math.max(10, percentage) : 10

                                        return (
                                            <div key={f.date || i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                <div 
                                                    className={`w-full rounded-t-sm transition-all duration-500 ${f.is_gap ? 'bg-rose-500/40 group-hover:bg-rose-500' : 'bg-[--primary]/30 group-hover:bg-[--primary]'}`}
                                                    style={{ height: `${heightVal}%` }}
                                                />
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-[8px] font-black px-2 py-1 rounded whitespace-nowrap z-10">
                                                    {currencySymbol}{(f.projected_cash || 0).toLocaleString()}
                                                </div>
                                                <span className="text-[7px] font-black text-slate-700 uppercase mt-4 rotate-45 origin-left">
                                                    {f.date ? new Date(f.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '---'}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </Card>

                            <div className="space-y-6">
                                <Card variant="bento" padding="md" className="bg-white/[0.02] border-white/5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Balance</p>
                                    <p className="text-2xl font-black text-white italic tracking-tighter">{currencySymbol}{cashFlow?.current_balance?.toLocaleString()}</p>
                                </Card>
                                <Card variant="bento" padding="lg" className={`border-none ${cashFlow?.risk_assessment === 'STABLE' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                    <p className="text-[9px] font-black uppercase tracking-widest mb-4 opacity-50">Intelligence Insight</p>
                                    <p className={`text-xs font-bold leading-relaxed italic ${cashFlow?.risk_assessment === 'STABLE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        "{cashFlow?.insight}"
                                    </p>
                                    <div className="mt-6 flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cashFlow?.risk_assessment === 'STABLE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Risk Factor: {cashFlow?.risk_assessment === 'STABLE' ? 'NIL' : 'CRITICAL'}</p>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeView === "whatif" && (
                    <motion.div 
                        key="whatif"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-10"
                    >
                        <Card variant="glass" padding="xl" className="border-[--primary]/30 bg-black/60 shadow-[0_0_100px_rgba(99,102,241,0.1)] relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-10 opacity-5">
                                <Brain className="w-40 h-40 text-[--primary]" />
                            </div>
                            
                            <div className="relative z-10 max-w-2xl">
                                <h4 className="text-lg font-black text-white uppercase italic tracking-tighter mb-4">Conversational Simulation Engine</h4>
                                <p className="text-sm text-slate-400 leading-relaxed mb-8">
                                    Input natural language business constraints to simulate the impact on your forward-looking revenue baseline.
                                </p>
                                
                                <div className="flex gap-4 p-2 bg-white/[0.03] rounded-2xl border border-white/10 group focus-within:border-[--primary]/50 transition-colors">
                                    <input 
                                        type="text"
                                        placeholder="e.g. What happens if I lose my top 2 clients next month?"
                                        value={whatIfInput}
                                        onChange={(e) => setWhatIfInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleWhatIfSubmit()}
                                        className="bg-transparent border-none outline-none flex-1 px-4 text-white font-bold h-14"
                                    />
                                    <Button variant="pro" onClick={handleWhatIfSubmit} loading={loading} className="px-10 h-14 shadow-[--shadow-glow] uppercase tracking-widest text-[10px] font-black">
                                        Execute Simulation
                                    </Button>
                                </div>
                                <div className="flex gap-4 mt-6">
                                    <button onClick={() => setWhatIfInput("Impact of 20% increase in manufacturing COGS?")} className="text-[9px] font-black uppercase text-slate-500 hover:text-[--primary] transition-colors tracking-widest">• Simulation: Input Cost Shock</button>
                                    <button onClick={() => setWhatIfInput("Simulate 15% drop in enterprise receivables collection rate")} className="text-[9px] font-black uppercase text-slate-500 hover:text-[--primary] transition-colors tracking-widest">• Simulation: Liquidity Gap</button>
                                </div>
                            </div>
                        </Card>

                        <AnimatePresence>
                            {whatIfResult && (
                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <Card variant="bento" padding="lg" className="bg-black/40 border-white/5 flex flex-col justify-center items-center text-center">
                                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Simulation Revenue Impact</p>
                                         <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-600 uppercase">Baseline</p>
                                                <p className="text-xl font-black text-white opacity-40">{currencySymbol}{whatIfResult.baseline_revenue?.toLocaleString()}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-[--primary]" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[8px] font-black text-[--primary] uppercase">Hypothetical</p>
                                                <p className="text-3xl font-black text-white italic tracking-tighter">{currencySymbol}{whatIfResult.hypothetical_revenue?.toLocaleString()}</p>
                                            </div>
                                         </div>
                                         <div className="mt-10 w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: "100%" }}
                                                animate={{ width: `${(whatIfResult.hypothetical_revenue / whatIfResult.baseline_revenue) * 100}%` }}
                                                className="h-full bg-gradient-to-r from-rose-500 to-[--primary]"
                                            />
                                         </div>
                                    </Card>

                                    <Card variant="bento" padding="lg" className="lg:col-span-2 bg-gradient-to-br from-[--primary]/10 to-transparent border-[--primary]/20">
                                         <div className="flex gap-6 items-start">
                                            <div className="w-12 h-12 rounded-2xl bg-[--primary]/20 flex items-center justify-center shrink-0">
                                                <AlertCircle className="w-6 h-6 text-[--primary]" />
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-black text-white uppercase tracking-widest">Model Synthesis & Insights</h4>
                                                <p className="text-base font-bold text-white leading-relaxed italic">"{whatIfResult.impact_description}"</p>
                                                <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                                                    <p className="text-[10px] font-black text-[--accent-emerald] uppercase tracking-widest mb-2">Neural Recommendation</p>
                                                    <p className="text-xs font-medium text-slate-400 leading-relaxed">{whatIfResult.recommendation}</p>
                                                </div>
                                                <div className="flex items-center gap-6 pt-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase">Confidence: {Math.round(whatIfResult.confidence_interval * 100)}%</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        <span className="text-[10px] font-black text-blue-500 uppercase">Model: Monte Carlo / Neural Aggregation</span>
                                                    </div>
                                                </div>
                                            </div>
                                         </div>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
