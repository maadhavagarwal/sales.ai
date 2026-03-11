"use client"

import { motion } from "framer-motion"
import { Card, Badge, Button } from "@/components/ui"
import ReactECharts from "echarts-for-react"

export default function GreeksPanel() {
    const factors = [
        { name: "Delta", val: "0.642", desc: "Directional hedge exposure", color: "#11d3d3", trend: "+0.02" },
        { name: "Gamma", val: "0.124", desc: "Convexity and re-hedge risk", color: "#a855f7", trend: "Stable" },
        { name: "Theta", val: "-14.24", desc: "Time carry cost", color: "#f43f5e", trend: "-2.1" },
        { name: "Vega", val: "22.50", desc: "Volatility sensitivity", color: "#f59e0b", trend: "+1.4" },
        { name: "Beta", val: "0.91", desc: "Portfolio market sensitivity", color: "#3b82f6", trend: "Controlled" },
        { name: "Alpha", val: "1.7%", desc: "Excess return vs benchmark", color: "#22c55e", trend: "Neutral" },
    ]

    const strategyOption = {
        backgroundColor: "transparent",
        radar: {
            indicator: [
                { name: "Delta", max: 1 },
                { name: "Gamma", max: 1 },
                { name: "Theta", max: 50 },
                { name: "Vega", max: 100 },
                { name: "Beta", max: 2 },
                { name: "Alpha", max: 5 },
            ],
            shape: "circle",
            splitNumber: 4,
            axisName: { color: "#666", fontSize: 9, fontWeight: "bold" },
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
            splitArea: { show: false },
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
        },
        series: [{
            type: "radar",
            data: [{
                value: [0.64, 0.12, 14.2, 22.5, 0.91, 1.7],
                name: "Risk Profile",
                itemStyle: { color: "var(--primary)" },
                areaStyle: { color: "rgba(var(--primary-rgb), 0.2)" },
            }],
        }],
    }

    return (
        <div className="space-y-8 p-1">
            <div className="flex justify-between items-end border-b border-white/5 pb-8">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Enterprise Risk & Derivatives</h3>
                    <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.4em] mt-1">Hedged Position Analysis, Greeks & Exposure Control</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" size="sm" className="bg-black/40">Portfolio Hedge: 64.2%</Button>
                    <Badge variant="pro" pulse>Risk Desk Sync Active</Badge>
                </div>
            </div>

            <Card variant="bento" padding="md" className="bg-[--primary]/5 border-[--primary]/20">
                <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.3em] mb-3">Institutional Use Case</p>
                <p className="text-sm font-bold text-white/80 leading-relaxed">
                    Option-chain analysis and technical indicators are shown here for hedge design, exposure balancing, and enterprise risk management. This module is intended for treasury control and protective overlays, not speculative prompting.
                </p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                {factors.map((factor, i) => (
                    <motion.div
                        key={factor.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <Card variant="glass" padding="md" className="group hover:border-[--primary]/40 transition-all cursor-crosshair">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{factor.name}</p>
                                <span className="text-[8px] font-bold text-[--primary]">{factor.trend}</span>
                            </div>
                            <p className="text-4xl font-black italic tracking-tighter mb-2" style={{ color: factor.color }}>{factor.val}</p>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{factor.desc}</p>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card variant="bento" padding="lg" className="lg:col-span-8 bg-black/40 border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-7xl opacity-5">RISK</div>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-widest">Interactive Option Chain</h4>
                            <p className="text-[9px] font-bold text-white/40 uppercase mt-1">Near-Month Expiry Core Matrix for Hedge Calibration</p>
                        </div>
                        <Badge variant="outline">Expiry: 26-MAR-2026</Badge>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase tracking-widest text-white/20 border-b border-white/5">
                                    <th className="pb-4 text-center text-[#11d3d3]">Calls OI</th>
                                    <th className="pb-4 text-center">Strike</th>
                                    <th className="pb-4 text-center text-[#f43f5e]">Puts OI</th>
                                    <th className="pb-4 text-center">Hedge Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { strike: 14500, callOi: "54.2k", putOi: "61.3k", note: "Protective support" },
                                    { strike: 14600, callOi: "48.6k", putOi: "58.1k", note: "Put hedge layering" },
                                    { strike: 14700, callOi: "62.4k", putOi: "52.7k", note: "Preferred downside collar" },
                                    { strike: 14800, callOi: "70.1k", putOi: "46.8k", note: "Gamma watch zone" },
                                    { strike: 14900, callOi: "77.8k", putOi: "39.4k", note: "Upside overwrite band" },
                                    { strike: 15000, callOi: "82.5k", putOi: "33.6k", note: "Call wall / cap zone" },
                                ].map((row) => (
                                    <tr key={row.strike} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                                        <td className="py-4 text-center text-xs font-black text-[#11d3d3]/60">{row.callOi}</td>
                                        <td className="py-4 text-center text-sm font-black text-white bg-white/[0.02] border-x border-white/5">{row.strike}</td>
                                        <td className="py-4 text-center text-xs font-black text-[#f43f5e]/60">{row.putOi}</td>
                                        <td className="py-4 text-center text-[10px] font-bold text-white/50 uppercase tracking-wide">{row.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="lg:col-span-4 space-y-6">
                    <Card variant="glass" padding="lg" className="h-[280px]">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Risk Surface Radar</h4>
                        <div className="h-44">
                            <ReactECharts option={strategyOption} style={{ height: "100%" }} />
                        </div>
                    </Card>

                    <Card variant="bento" padding="lg" className="bg-[--primary]/5 border-[--primary]/20">
                        <p className="text-[10px] font-black text-[--primary] uppercase tracking-widest mb-4">AI Hedge Recommendation</p>
                        <p className="text-xs font-bold text-white/80 italic leading-relaxed">
                            Current Delta exposure of <span className="text-[--primary]">0.64</span> is above treasury thresholds. Recommended action: review an OTM protective put spread at 14700/14500 to offset downside variance while preserving carry efficiency.
                        </p>
                        <Button variant="pro" size="xs" className="mt-6 w-full shadow-[--shadow-glow]">Review Hedge Structure</Button>
                    </Card>
                </div>
            </div>
        </div>
    )
}
