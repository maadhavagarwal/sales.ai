"use client"

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    LayoutDashboard, 
    Users, 
    TrendingUp, 
    Plus, 
    Search, 
    Filter, 
    MoreHorizontal,
    AlertCircle,
    CheckCircle2,
    Clock,
    DollarSign,
    Target,
    Activity,
    ShieldAlert
} from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { 
    getDeals, 
    getHealthScores, 
    getAuditLogs, 
    manageDeal, 
    getPredictiveCRMInsights 
} from "@/services/api"

// --- TYPES ---
interface Deal {
    id: string
    deal_name: string
    customer_id: string
    value: number
    stage: string
    probability: number
    expected_close_date: string
    notes?: string
}

interface CustomerHealth {
    customer_id: string
    health_score: number
    status: string
    recency_days: number
    purchase_count: number
    total_revenue: number
}

interface AuditLog {
    id: number
    user_id: string
    action: string
    module: string
    timestamp: string
    details: string
}

const STAGES = ["QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]

export default function CRMPage() {
    const [activeTab, setActiveTab] = useState<"pipeline" | "health" | "audit">("pipeline")
    const [deals, setDeals] = useState<Deal[]>([])
    const [healthScores, setHealthScores] = useState<CustomerHealth[]>([])
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
    const [insights, setInsights] = useState<string>("Initializing neural analysis...")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
        fetchInsights()
    }, [activeTab])

    const fetchInsights = async () => {
        try {
            const data = await getPredictiveCRMInsights()
            if (data && data.insights) {
                setInsights(data.insights)
            }
        } catch (err) {
            console.error("Insights Error:", err)
            setInsights("Neural engine offline. Please check model connectivity.")
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            if (activeTab === "pipeline") {
                const data = await getDeals()
                setDeals(data || [])
            } else if (activeTab === "health") {
                const data = await getHealthScores()
                setHealthScores(data || [])
            } else if (activeTab === "audit") {
                const data = await getAuditLogs()
                setAuditLogs(data || [])
            }
        } catch (err) {
            console.error("Fetch Error:", err)
        }
        setLoading(false)
    }

    const updateDealStage = async (dealId: string, newStage: string) => {
        try {
            await manageDeal("UPDATE", { id: dealId, stage: newStage })
            fetchData()
        } catch (err) {
            console.error("Update Error:", err)
        }
    }

    return (
        <DashboardLayout title="Predictive CRM" subtitle="Neural Intelligence & Sales Operations">
            <div className="page-rhythm bg-transparent text-white selection:bg-cyan-500/30 pb-24">
                {/* Navigation Tabs */}
                <div className="flex p-1 gap-1 bg-white/5 border border-white/10 rounded-full w-fit mb-2 overflow-x-auto">
                    {[
                        { id: "pipeline", label: "Sales Pipeline", icon: LayoutDashboard },
                        { id: "health", label: "Customer Health", icon: Users },
                        { id: "audit", label: "Compliance Audit", icon: ShieldAlert },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                                activeTab === tab.id 
                                ? "bg-white text-black shadow-lg shadow-white/10" 
                                : "text-white/40 hover:text-white/70"
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    {activeTab === "pipeline" && (
                        <motion.div 
                            key="pipeline"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-5"
                        >
                            {STAGES.map((stage) => (
                                <div key={stage} className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase italic">
                                            {stage.replace('_', ' ')}
                                        </h3>
                                        <span className="text-[10px] text-white/20 font-mono">
                                            ({deals.filter(d => d.stage === stage).length})
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-3 min-h-125 p-2 bg-white/2 border border-dashed border-white/5 rounded-3xl">
                                        {deals.filter(d => d.stage === stage).map((deal) => (
                                            <motion.div
                                                key={deal.id}
                                                layoutId={deal.id}
                                                className="p-5 bg-[#0a0a0a] border border-white/10 rounded-2xl hover:border-white/30 transition-all group cursor-pointer"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">{deal.deal_name}</h4>
                                                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all">
                                                        <MoreHorizontal className="w-4 h-4 text-white/40" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span className="text-lg font-black font-mono">${deal.value.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-white/40 font-bold tracking-wider uppercase">
                                                    <div className="flex items-center gap-1.5">
                                                        <Target className="w-3 h-3 text-cyan-400" />
                                                        {Math.round(deal.probability * 100)}% Win
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        {deal.expected_close_date}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {deals.filter(d => d.stage === stage).length === 0 && (
                                            <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                                                <Plus className="w-6 h-6 mb-2" />
                                                <span className="text-[10px] uppercase font-black tracking-widest">Add Deal</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === "health" && (
                        <motion.div 
                            key="health"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden">
                                <div className="overflow-x-auto">
                                <table className="w-full min-w-215 text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-8 py-6 text-[10px] font-black tracking-widest uppercase text-white/40 italic">Customer ID</th>
                                            <th className="px-8 py-6 text-[10px] font-black tracking-widest uppercase text-white/40 italic">Health Score</th>
                                            <th className="px-8 py-6 text-[10px] font-black tracking-widest uppercase text-white/40 italic">Status</th>
                                            <th className="px-8 py-6 text-[10px] font-black tracking-widest uppercase text-white/40 italic">Last Active</th>
                                            <th className="px-8 py-6 text-[10px] font-black tracking-widest uppercase text-white/40 italic">Revenue (LTD)</th>
                                            <th className="px-8 py-6 text-[10px] font-black tracking-widest uppercase text-white/40 italic text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {healthScores.map((h) => (
                                            <tr key={h.customer_id} className="border-b border-white/5 hover:bg-white/2 transition-colors group">
                                                <td className="px-8 py-6 font-mono text-xs font-bold text-white/80">{h.customer_id}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 h-1.5 max-w-25 bg-white/5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-1000 ${
                                                                    h.health_score > 70 ? 'bg-emerald-500' : h.health_score > 40 ? 'bg-yellow-500' : 'bg-rose-500'
                                                                }`} 
                                                                style={{ width: `${h.health_score}%` }} 
                                                            />
                                                        </div>
                                                        <span className="text-xs font-black font-mono">{h.health_score}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${
                                                        h.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                        h.status === 'At Risk' ? 'bg-rose-500/10 text-rose-500' : 
                                                        'bg-white/10 text-white/40'
                                                    }`}>
                                                        {h.status === 'Healthy' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                        {h.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-xs text-white/60 font-medium">
                                                    {h.recency_days} Days Ago
                                                </td>
                                                <td className="px-8 py-6 text-sm font-black font-mono">
                                                    ${h.total_revenue.toLocaleString()}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase hover:bg-white/10 transition-all">
                                                        View Bio
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "audit" && (
                        <motion.div 
                            key="audit"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="page-stack"
                        >
                            {auditLogs.map((log) => (
                                <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-[#0a0a0a] border border-white/10 rounded-3xl group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-2xl ${
                                            log.action.includes('DELETE') ? 'bg-rose-500/10 text-rose-500' : 
                                            log.action.includes('CREATE') ? 'bg-emerald-500/10 text-emerald-500' : 
                                            'bg-cyan-500/10 text-cyan-500'
                                        }`}>
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-sm font-black tracking-tight">{log.action}</span>
                                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-black tracking-widest text-white/30">{log.module}</span>
                                            </div>
                                            <p className="text-xs text-white/40 font-medium font-mono">{log.details}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0 text-right">
                                        <div className="text-[10px] font-black tracking-widest uppercase text-white/40 flex items-center gap-2 justify-end mb-1">
                                            <Users className="w-3 h-3" />
                                            User: {log.user_id}
                                        </div>
                                        <div className="text-[10px] font-mono text-white/20">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* AI Advisor Floating Panel */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-8 sm:w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-4xl p-6 sm:p-8 shadow-2xl overflow-hidden group hover:bg-white/[0.07] transition-all z-100"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl -z-10 group-hover:bg-cyan-500/20 transition-all" />
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-white flex items-center justify-center rounded-2xl rotate-3 shadow-xl">
                            <TrendingUp className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h5 className="text-sm font-black tracking-widest">AI CRM ADVISOR</h5>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black tracking-widest uppercase text-white/30">Active Intelligence</span>
                            </div>
                        </div>
                    </div>
                    <div className="prose prose-invert prose-xs max-h-64 overflow-y-auto custom-scrollbar">
                         <div className="text-xs leading-relaxed text-white/70 font-medium whitespace-pre-wrap">
                            {insights}
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    )
}
