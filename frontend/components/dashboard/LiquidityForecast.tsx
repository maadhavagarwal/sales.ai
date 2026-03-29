"use client"

import { motion } from "framer-motion"
import { Card, Badge } from "@/components/ui"
import { useStore } from "@/store/useStore"

interface LiquidityData {
    current_cash: number
    projected_90d: number
    receivables_pipeline: number
    payables_pipeline: number
    gap_detected: boolean
    risk_level: string
    insights: string[]
    recommendation?: string
}

export default function LiquidityForecast({ data }: { data: LiquidityData }) {
    const { currencySymbol } = useStore()
    if (!data) return null

    const formatCurrency = (val: number) => {
        return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const isHealthy = data.risk_level === "HEALTHY"

    return (
        <Card variant="glass" padding="lg" className={`overflow-hidden relative ${!isHealthy ? 'border-amber-500/20' : 'border-[--accent-emerald]/20'}`}>
            <div className="absolute top-0 right-0 w-32 h-32/10 rotate-45 translate-x-16 -translate-y-16" />
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 relative z-10">
                <div>
                    <Badge variant={isHealthy ? "pro" : "warning"} className="mb-4 tracking-[0.2em] font-black">
                        90-DAY LIQUIDITY CORRIDOR
                    </Badge>
                    <h3 className="text-3xl font-black text-[--text-primary] tracking-tighter leading-none mb-3">
                        {isHealthy ? "Neural Liquidity Surplus" : "Liquidity Risk Detected"}
                    </h3>
                    <p className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest opacity-60">
                        Predictive Cash Flow Simulation based on Ledger Velocity
                    </p>
                </div>
                
                <div className="text-right">
                    <p className="text-[10px] font-black text-[--text-dim] uppercase tracking-[0.3em] mb-2">Projected 90D Balance</p>
                    <p className={`text-4xl font-black tracking-tighter ${isHealthy ? 'text-[--accent-emerald]' : 'text-amber-400'} drop-shadow-lg`}>
                        {formatCurrency(data.projected_90d)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
                <div className="p-6 rounded-2xl bg-[--surface-1] border border-[--border-subtle]">
                    <p className="text-[9px] font-black text-[--text-dim] uppercase tracking-[0.3em] mb-4">Current Reserves</p>
                    <p className="text-xl font-black text-[--text-primary] tracking-tight">{formatCurrency(data.current_cash)}</p>
                    <div className="mt-4 h-1.5 w-full bg-[--surface-3] rounded-full overflow-hidden">
                        <div className="h-full bg-[--primary]" style={{ width: '100%' }} />
                    </div>
                </div>
                
                <div className="p-6 rounded-2xl bg-[--surface-1] border border-[--border-subtle]">
                    <p className="text-[9px] font-black text-[--accent-emerald] uppercase tracking-[0.3em] mb-4">Projected Inflow</p>
                    <p className="text-xl font-black text-[--text-primary] tracking-tight">{formatCurrency(data.receivables_pipeline)}</p>
                    <div className="mt-4 h-1.5 w-full bg-[--surface-3] rounded-full overflow-hidden">
                        <div className="h-full bg-[--accent-emerald]" style={{ width: '85%' }} />
                    </div>
                    <p className="text-[8px] font-black text-[--accent-emerald]/60 uppercase tracking-widest mt-2">85% Collection Reliability</p>
                </div>

                <div className="p-6 rounded-2xl bg-[--surface-1] border border-[--border-subtle]">
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-[0.3em] mb-4">Projected Outflow</p>
                    <p className="text-xl font-black text-[--text-primary] tracking-tight">{formatCurrency(data.payables_pipeline)}</p>
                    <div className="mt-4 h-1.5 w-full bg-[--surface-3] rounded-full overflow-hidden">
                        <div className="h-full bg-red-400" style={{ width: `${Math.min(100, (data.payables_pipeline / (data.receivables_pipeline + 1)) * 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-4 py-4 px-6 rounded-2xl bg-[--surface-2] border border-[--border-subtle]">
                    <div className="w-8 h-8 rounded-lg bg-[--primary]/10 flex items-center justify-center text-lg">💡</div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.2em] mb-1">AI Recommendation</p>
                        <p className="text-xs font-bold text-[--text-secondary]">{data.recommendation || "Maintain current collection velocity."}</p>
                    </div>
                </div>
            </div>
        </Card>
    )
}
