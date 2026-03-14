"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    getIntelligenceAnomalies, 
    getCashFlowForecast, 
    simulateWhatIf,
    getRevenueScenarios, 
    getSalesLeaderboard 
} from "@/services/api"
import { Card, Badge, Button, Input } from "@/components/ui"
import { useStore } from "@/store/useStore"
import { 
    AlertTriangle, 
    TrendingUp, 
    TrendingDown, 
    Activity, 
    BarChart3, 
    ShieldCheck, 
    Zap,
    MessageSquare,
    PlayCircle
} from "lucide-react"

export default function EnterpriseIntelligence() {
    const { currencySymbol, intelligenceData, setIntelligenceData } = useStore()
    
    // Local derived state from store
    const scenarios = intelligenceData?.scenarios || []
    const leaderboard = intelligenceData?.leaderboard || []
    const anomalies = intelligenceData?.anomalies || []
    const cashFlow = intelligenceData?.cashFlow || null

    const [loading, setLoading] = useState(!intelligenceData)
    
    // What-if State
    const [whatIfQuery, setWhatIfQuery] = useState("")
    const [whatIfResult, setWhatIfResult] = useState<any>(null)
    const [simulating, setSimulating] = useState(false)

    useEffect(() => {
        // Only fetch if no data exists in store
        if (intelligenceData) return

        const fetchData = async () => {
            setLoading(true)
            try {
                const [sRes, lRes, aRes, cRes] = await Promise.all([
                    getRevenueScenarios(),
                    getSalesLeaderboard(),
                    getIntelligenceAnomalies(),
                    getCashFlowForecast()
                ])
                setIntelligenceData({
                    scenarios: sRes || [],
                    leaderboard: lRes || [],
                    anomalies: aRes.alerts || [],
                    cashFlow: cRes
                })
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [intelligenceData, setIntelligenceData])

    const handleSimulate = async () => {
        if (!whatIfQuery) return
        setSimulating(true)
        try {
            const res = await simulateWhatIf(whatIfQuery)
            setWhatIfResult(res)
        } catch (e) {
            console.error(e)
        } finally {
            setSimulating(false)
        }
    }

    if (loading) return <div className="animate-pulse space-y-8 p-8"><div className="h-48 bg-white/5 rounded-3xl" /><div className="h-96 bg-white/5 rounded-3xl" /></div>

    return (
        <div className="space-y-16 pb-24">
            {/* 1. Proactive Anomaly Detection */}
            <section>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tighter">Proactive Intelligence Alerts</h2>
                        <p className="text-[10px] font-black text-[--accent-rose] uppercase tracking-widest mt-2">Unsupervised Anomaly Detection • Isolation Forest Layer</p>
                    </div>
                    <Badge variant="outline" className="border-[--accent-rose]/30 text-[--accent-rose]">
                        <Activity className="w-3 h-3 mr-1" /> Monitoring Active
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {anomalies.length > 0 ? anomalies.map((a, i) => (
                        <Card key={i} variant="bento" className="border-[--accent-rose]/20 bg-[--accent-rose]/5 overflow-hidden group">
                            <div className="flex gap-6 p-1">
                                <div className="p-4 rounded-2xl bg-[--accent-rose]/10 border border-[--accent-rose]/20 h-fit">
                                    <AlertTriangle className="w-6 h-6 text-[--accent-rose]" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant={a.severity === 'CRITICAL' ? 'danger' : 'warning'} className="text-[9px] font-black uppercase tracking-widest">
                                            {a.severity} SIGNAL
                                        </Badge>
                                        <span className="text-[10px] font-bold text-[--text-muted]">{a.date || 'Live Analysis'}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-2">{a.metric} Anomaly</h3>
                                    <p className="text-sm text-white/70 leading-relaxed mb-4">{a.insight}</p>
                                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 flex gap-3 items-center">
                                        <ShieldCheck className="w-4 h-4 text-[--accent-emerald]" />
                                        <div>
                                            <p className="text-[10px] font-black text-[--accent-emerald] uppercase tracking-widest">Neural Recommendation</p>
                                            <p className="text-xs font-bold text-white/50">{a.recommendation}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )) : (
                        <Card variant="glass" className="lg:col-span-2 flex flex-col items-center justify-center p-12 text-center border-dashed border-white/10">
                            <div className="p-6 rounded-full bg-white/5 mb-6">
                                <ShieldCheck className="w-8 h-8 text-[--accent-emerald]" />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight">System Operational Integrity Confirmed</h3>
                            <p className="text-sm text-[--text-muted] mt-2 max-w-sm">No abnormal data drift or margin erosion detected in the last 7 cycles.</p>
                        </Card>
                    )}
                </div>
            </section>

            {/* 2. Conversational What-If Simulator */}
            <section>
                <div className="mb-8">
                    <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase underline decoration-[--accent-cyan] underline-offset-8">Consultative What-If Simulator</h2>
                    <p className="text-[10px] font-black text-[--accent-cyan] uppercase tracking-widest mt-4">Scenario Synthesis • Multi-Variate Impact Mapping</p>
                </div>

                <Card variant="bento" className="relative shadow-2xl shadow-[--accent-cyan]/10 group">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 p-2">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-2xl font-black text-white mb-4">Pose a Strategic Scenario</h3>
                                <p className="text-sm text-[--text-muted] leading-relaxed">Simulate market contractions, customer churn, or expense escalations using the platform's core pricing and revenue engines.</p>
                            </div>
                            <div className="relative group/input">
                                <Input 
                                    placeholder="e.g. 'What if I lose Raj Traders next month?'"
                                    value={whatIfQuery}
                                    onChange={(e) => setWhatIfQuery(e.target.value)}
                                    className="h-16 bg-white/[0.03] border-white/10 px-6 text-lg font-bold rounded-2xl focus:border-[--accent-cyan] transition-all"
                                />
                                <Button 
                                    onClick={handleSimulate}
                                    disabled={simulating || !whatIfQuery}
                                    className="absolute right-2 top-2 h-12 px-8 bg-[--accent-cyan] hover:bg-[--accent-cyan]/80 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
                                >
                                    {simulating ? <Activity className="w-5 h-5 animate-spin" /> : <><PlayCircle className="w-5 h-5 mr-2" /> Simulate</>}
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-4">
                                {['Lose Raj Traders?', 'Expenses rise 15%?', 'Discounting 10%?'].map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => setWhatIfQuery(`What happens if ${tag.toLowerCase().replace('?', '')}`)}
                                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/50 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative min-h-[300px] flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                {simulating ? (
                                    <motion.div 
                                        key="loading"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="flex flex-col items-center gap-6"
                                    >
                                        <div className="w-16 h-16 border-4 border-[--accent-cyan]/20 border-t-[--accent-cyan] rounded-full animate-spin" />
                                        <p className="text-[10px] font-black text-[--accent-cyan] uppercase tracking-[0.3em]">Synthesizing Neural Outcomes...</p>
                                    </motion.div>
                                ) : whatIfResult ? (
                                    <motion.div 
                                        key="result"
                                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                        className="w-full space-y-6"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Badge className="bg-[--accent-cyan] text-black">RESULT READY</Badge>
                                            <Badge variant="outline" className="border-white/20">Confidence: {Math.round(whatIfResult.confidence_interval * 100)}%</Badge>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-1">Projected Monthly Revenue Delta</p>
                                            <div className="flex items-end gap-4">
                                                <p className="text-5xl font-black text-white tracking-tighter">
                                                    {currencySymbol}{Math.round(whatIfResult.hypothetical_revenue).toLocaleString()}
                                                </p>
                                                <p className={`text-xl font-black mb-1 ${whatIfResult.hypothetical_revenue < whatIfResult.baseline_revenue ? 'text-[--accent-rose]' : 'text-[--accent-emerald]'}`}>
                                                    ({whatIfResult.hypothetical_revenue < whatIfResult.baseline_revenue ? '-' : '+'}
                                                    {Math.abs(Math.round(((whatIfResult.hypothetical_revenue - whatIfResult.baseline_revenue) / whatIfResult.baseline_revenue) * 100))}%)
                                                </p>
                                            </div>
                                        </div>
                                        <Card variant="glass" className="bg-white/[0.02] border-white/5 p-6">
                                            <div className="flex gap-4">
                                                <MessageSquare className="w-5 h-5 text-[--accent-cyan] shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-white leading-relaxed mb-4">{whatIfResult.impact_description}</p>
                                                    <div className="pt-4 border-t border-white/5">
                                                        <p className="text-[9px] font-black text-[--accent-amber] uppercase tracking-widest mb-1">Strategic Intervention</p>
                                                        <p className="text-[10px] font-bold text-white/40 italic">{whatIfResult.recommendation}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="placeholder"
                                        className="flex flex-col items-center text-center opacity-20 group-hover:opacity-40 transition-opacity"
                                    >
                                        <Zap className="w-16 h-16 text-white mb-6" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] max-w-[200px]">Waiting for scenario parameters</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </Card>
            </section>

            {/* 3. Cash Flow Forecast - 90D Horizon */}
            <section>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tighter">Liquid Capital Predictor</h2>
                        <p className="text-[10px] font-black text-[--accent-amber] uppercase tracking-widest mt-2">90-Day Forward Forecast • AR/AP Reconciliation Layer</p>
                    </div>
                    {cashFlow && (
                        <Badge variant={cashFlow.risk_assessment === 'STABLE' ? 'success' : 'warning'}>
                            Projected Stability: {cashFlow.risk_assessment}
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <Card className="lg:col-span-1 bg-gradient-to-br from-[--accent-amber]/10 to-transparent border-[--accent-amber]/20 p-8 flex flex-col justify-between overflow-hidden relative">
                        <div>
                            <p className="text-[10px] font-black text-[--accent-amber] uppercase tracking-[0.2em] mb-4">Cash Position</p>
                            <h3 className="text-4xl font-black text-white tracking-tighter">
                                {currencySymbol}{cashFlow?.current_balance?.toLocaleString() || '0'}
                            </h3>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Real-time Bank/Ledger</p>
                        </div>
                        <div className="mt-12 space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black text-white/50 uppercase tracking-widest">
                                <span>Risk Level</span>
                                <span className={cashFlow?.risk_assessment === 'STABLE' ? 'text-[--accent-emerald]' : 'text-[--accent-rose]'}>
                                    {cashFlow?.risk_assessment || 'CALCULATING'}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: cashFlow?.risk_assessment === 'STABLE' ? '100%' : '30%' }}
                                    className={`h-full ${cashFlow?.risk_assessment === 'STABLE' ? 'bg-[--accent-emerald]' : 'bg-[--accent-rose]'}`}
                                />
                            </div>
                        </div>
                        <Activity className="absolute -right-6 -top-6 w-32 h-32 text-white/[0.02] -rotate-12" />
                    </Card>

                    <Card variant="glass" className="lg:col-span-3 p-8">
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Projected Trajectory</h3>
                                <p className="text-xs text-[--text-muted]">Predicting solvency based on payout cycles and average burn rate.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[--accent-amber]" />
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Projected Position</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-48 flex items-end gap-4 w-full px-4">
                            {cashFlow?.forecast_90d?.map((f: any, i: number) => (
                                <div key={i} className="flex-1 flex flex-col items-center group cursor-help">
                                    <div className="relative w-full h-full flex items-end justify-center">
                                        <motion.div 
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.min(100, (f.projected_cash / (cashFlow.current_balance + 100000)) * 100)}%` }}
                                            className={`w-full max-w-[24px] rounded-t-lg transition-colors ${f.is_gap ? 'bg-[--accent-rose]' : 'bg-[--accent-amber]/40 group-hover:bg-[--accent-amber]'}`}
                                        />
                                        {/* Tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black text-[9px] font-black px-2 py-1 rounded-md whitespace-nowrap transition-opacity z-50">
                                            {currencySymbol}{f.projected_cash.toLocaleString()}
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-black text-white/30 uppercase mt-4">{new Date(f.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-12 bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex gap-6 items-center">
                            <TrendingDown className="w-8 h-8 text-[--accent-rose] opacity-50" />
                            <div>
                                <p className="text-xs font-black text-white/80 tracking-tight">Diagnostic Note</p>
                                <p className="text-[11px] font-bold text-[--text-muted] leading-relaxed italic">"{cashFlow?.insight}"</p>
                            </div>
                            <Button variant="outline" size="sm" className="ml-auto border-white/10 text-[10px] font-black uppercase tracking-widest h-10 px-6">Review AR Aging</Button>
                        </div>
                    </Card>
                </div>
            </section>

            {/* 4. Strategic Scenarios (Moved down as these are secondary projections) */}
            <section>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tighter">Strategic Outlooks</h2>
                        <p className="text-[10px] font-black text-[--accent-violet] uppercase tracking-widest mt-2">Macro-Environmental Simulations • Bull/Bear Models</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {scenarios.map((s, i) => (
                        <Card key={i} variant="bento" padding="lg" className={`group relative overflow-hidden ${
                            s.case === 'Bull' ? 'border-[--accent-emerald]/20 bg-[--accent-emerald]/5' : 
                            s.case === 'Bear' ? 'border-[--accent-rose]/20 bg-[--accent-rose]/5' : 
                            'border-[--accent-violet]/20 bg-[--accent-violet]/5'
                        }`}>
                            <div className="relative z-10">
                                <span className={`text-[9px] font-black uppercase tracking-[0.3em] px-2 py-1 rounded-sm ${
                                    s.case === 'Bull' ? 'bg-[--accent-emerald] text-black' : 
                                    s.case === 'Bear' ? 'bg-[--accent-rose] text-white' : 
                                    'bg-[--accent-violet] text-white'
                                }`}>
                                    {s.case} Outlook
                                </span>
                                <div className="mt-6 mb-2">
                                    <p className="text-4xl font-black text-white tracking-tighter">{currencySymbol}{s.revenue.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest">Projected Monthly Volume</p>
                                </div>
                                <p className="text-xs font-medium text-white/70 leading-relaxed mb-6 italic">"{s.desc}"</p>
                                <div className="space-y-2 border-t border-white/5 pt-4">
                                    <p className="text-[9px] font-black uppercase text-[--text-muted] tracking-widest">Key Assumptions:</p>
                                    <p className="text-[10px] font-bold text-white/50">{s.assumptions}</p>
                                </div>
                            </div>
                            <div className={`absolute -right-4 -bottom-4 text-7xl opacity-[0.03] font-black transition-transform group-hover:scale-110 ${
                                 s.case === 'Bull' ? 'text-[--accent-emerald]' : s.case === 'Bear' ? 'text-[--accent-rose]' : 'text-[--accent-violet]'
                            }`}>
                                {s.case === 'Bull' ? '↗' : s.case === 'Bear' ? '↘' : '→'}
                            </div>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    )
}
