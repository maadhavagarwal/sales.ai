
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, Button, Badge } from "@/components/ui"
import { getFinanceSummary, getBudgets } from "@/services/api"
import { useStore } from "@/store/useStore"
import { Wallet, PieChart, TrendingUp, ShieldAlert, CreditCard, Banknote } from "lucide-react"

export default function WorkspaceFinance() {
    const { datasetId, currencySymbol } = useStore()
    const [summary, setSummary] = useState<any>(null)
    const [budgets, setBudgets] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchFinanceData()
    }, [datasetId])

    const fetchFinanceData = async () => {
        setLoading(true)
        try {
            const [sData, bData] = await Promise.all([
                getFinanceSummary(datasetId || undefined), 
                getBudgets()
            ])
            setSummary(sData)
            setBudgets(bData)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-12 text-center animate-pulse">Loading Financial Intelligence...</div>

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Top Row: Financial Pulse */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FinanceMetric 
                        label="EBITDA" 
                        value={`${currencySymbol}${summary?.ebitda?.toLocaleString()}`} 
                        trend="+12.4% vs prev sync" 
                        icon={<Wallet className="w-5 h-5 text-emerald-400" />}
                    />
                    <FinanceMetric 
                        label="Net Profit (Est)" 
                        value={`${currencySymbol}${summary?.net_profit?.toLocaleString()}`} 
                        trend="After 25% Prov" 
                        icon={<Banknote className="w-5 h-5 text-blue-400" />}
                    />
                    <FinanceMetric 
                        label="Working Capital" 
                        value={`${currencySymbol}${summary?.working_capital?.toLocaleString()}`} 
                        trend={`Ratio: ${summary?.current_ratio?.toFixed(2)}`} 
                        icon={<PieChart className="w-5 h-5 text-purple-400" />}
                    />
                    <FinanceMetric 
                        label="Receivables (AR)" 
                        value={`${currencySymbol}${summary?.receivables?.toLocaleString()}`} 
                        trend="Outstanding Sync" 
                        icon={<ShieldAlert className="w-5 h-5 text-amber-400" />}
                    />
                </div>

                <Card variant="bento" className="p-8 border-[--primary]/20 bg-gradient-to-br from-[--primary]/10 to-transparent relative overflow-hidden h-full flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white mb-2">Treasury Controls</h3>
                        <p className="text-sm text-white/50 mb-8 leading-relaxed">Centralized liquidity management and credit line oversight for {datasetId || 'Enterprise'}.</p>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                        <Button className="w-full bg-white text-black hover:bg-white/90 font-black tracking-widest text-[10px] uppercase h-12">
                            Initialize Fund Transfer
                        </Button>
                        <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 font-black tracking-widest text-[10px] uppercase h-12">
                            Generate Tax Compliance PDF
                        </Button>
                    </div>
                    <Banknote className="absolute -right-8 -bottom-8 w-48 h-48 text-white/[0.02] rotate-12" />
                </Card>
            </div>

            {/* Middle Row: Budget Allocation */}
            <section>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">Budgetary Authorization Matrix</h2>
                        <p className="text-[10px] font-black text-[--text-muted] tracking-[0.3em] uppercase mt-2">Departmental Allocation • Real-time Burn Tracking</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {budgets && Object.entries(budgets).map(([dept, amount]: [any, any]) => (
                        <Card key={dept} variant="glass" className="p-6 border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{dept}</span>
                                <CreditCard className="w-4 h-4 text-white/20" />
                            </div>
                            <p className="text-2xl font-black text-white tracking-tighter mb-1">{currencySymbol}{amount.toLocaleString()}</p>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-4">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: "65%" }} 
                                    className="h-full bg-[--primary]" 
                                />
                            </div>
                            <p className="text-[9px] font-bold text-white/30 mt-2 uppercase tracking-tight">65% Authorized Burn Used</p>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    )
}

function FinanceMetric({ label, value, trend, icon }: { label: string, value: string, trend: string, icon: any }) {
    return (
        <Card variant="glass" className="p-6 border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">{icon}</div>
                <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{trend}</Badge>
            </div>
            <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
            </div>
        </Card>
    )
}
