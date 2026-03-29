"use client"

import { motion } from "framer-motion"
import { Card, Badge } from "@/components/ui"

interface Anomaly {
    type: string
    severity: string
    date: string
    entity: string
    value: number | string
    expected: number | string
    insight: string
    root_cause?: string
    action?: string
}

export default function AnomalyPanel({ anomalies }: { anomalies: Anomaly[] }) {
    if (!anomalies || anomalies.length === 0) return null

    return (
        <Card variant="glass" padding="lg" className="border-red-500/20 bg-red-500/2">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[--border-subtle]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-xl animate-pulse">🚨</div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[--text-primary]">System Anomalies Detected</h3>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-1">Autonomous Neural Audit Results</p>
                    </div>
                </div>
                <Badge variant="pro" className="bg-red-500/20 text-red-400 border-red-500/30">
                    {anomalies.length} Critical Issues
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {anomalies.map((anomaly, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-2xl bg-[--surface-1] border border-[--border-subtle] hover:border-red-500/30 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <Badge variant={anomaly.severity === "CRITICAL" ? "danger" : "warning"} size="xs" className="tracking-tighter">
                                {anomaly.type}
                            </Badge>
                            <span className="text-[10px] font-black text-[--text-dim] uppercase tracking-[0.2em]">{anomaly.date}</span>
                        </div>
                        
                        <h4 className="text-lg font-black text-[--text-primary] tracking-tight mb-2 group-hover:text-red-400">{anomaly.entity}</h4>
                        <p className="text-sm text-[--text-secondary] font-medium mb-4">{anomaly.insight}</p>
                        
                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-[--border-subtle] mb-4">
                            <div>
                                <p className="text-[8px] font-black text-[--text-dim] uppercase tracking-widest mb-1">Detected Val</p>
                                <p className="text-xs font-black text-red-400">{typeof anomaly.value === 'number' ? anomaly.value.toFixed(2) : anomaly.value}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-[--text-dim] uppercase tracking-widest mb-1">Statistical Exp</p>
                                <p className="text-xs font-black text-[--accent-emerald]">{typeof anomaly.expected === 'number' ? anomaly.expected.toFixed(2) : anomaly.expected}</p>
                            </div>
                        </div>

                        {anomaly.root_cause && (
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">Cause</span>
                                    <p className="text-[10px] font-bold text-[--text-secondary]">{anomaly.root_cause}</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[10px] bg-[--accent-emerald]/10 text-[--accent-emerald] px-2 py-0.5 rounded font-black uppercase tracking-widest">Mitigate</span>
                                    <p className="text-[10px] font-bold text-[--text-secondary]">{anomaly.action}</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </Card>
    )
}
