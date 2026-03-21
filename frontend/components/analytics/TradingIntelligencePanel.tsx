"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"

interface TradingIntelligenceProps {
    marketIntelligence: {
        pcr: {
            pcr_oi: number
            pcr_vol: number
            sentiment: string
        }
        indicators: any[]
    }
    report: string
}

export default function TradingIntelligencePanel({ marketIntelligence, report }: TradingIntelligenceProps) {
    const { pcr = { pcr_oi: 0, pcr_vol: 0, sentiment: "Neutral" }, indicators = [] } = marketIntelligence || {}

    const latestIndicator = useMemo(() => {
        if (!indicators || !Array.isArray(indicators) || indicators.length === 0) return null
        return indicators[indicators.length - 1]
    }, [indicators])

    const sentimentResult = pcr?.sentiment || "Neutral"
    const sentimentTone = sentimentResult.includes("Bullish")
        ? "text-[--accent-emerald] bg-[--accent-emerald]/10 border-[--accent-emerald]/25"
        : sentimentResult.includes("Bearish")
            ? "text-[--accent-rose] bg-[--accent-rose]/10 border-[--accent-rose]/25"
            : "text-[--accent-amber] bg-[--accent-amber]/10 border-[--accent-amber]/25"

    const rsiValue = latestIndicator?.rsi || 50
    const rsiTone = rsiValue > 70
        ? "text-[--accent-rose]"
        : rsiValue < 30
            ? "text-[--accent-emerald]"
            : "text-[--secondary]"
    const rsiBarClass = rsiValue > 70
        ? "bg-[--accent-rose]"
        : rsiValue < 30
            ? "bg-[--accent-emerald]"
            : "bg-[--secondary]"

    return (
        <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
                {/* Sentiment & PCR Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="chart-card"
                >
                    <h3 className="mb-4 text-base font-bold text-[--text-primary]">
                        Market Sentiment (PCR)
                    </h3>

                    <div className="mb-2 flex items-end gap-2">
                        <span className={`text-4xl font-black ${sentimentTone.split(' ')[0]}`}>
                            {typeof pcr?.pcr_oi === 'number' ? pcr.pcr_oi.toFixed(2) : "0.00"}
                        </span>
                        <span className="pb-1 text-sm font-semibold text-[--text-muted]">Put-Call Ratio (OI)</span>
                    </div>

                    <div className={`mb-6 inline-flex rounded-[--radius-sm] border px-3 py-2 text-sm font-bold ${sentimentTone}`}>
                        {pcr?.sentiment || "Neutral Sentiment"}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[--text-muted]">Volume PCR</p>
                            <p className="mt-1 text-lg font-bold text-[--text-primary]">
                                {typeof pcr?.pcr_vol === 'number' ? pcr.pcr_vol.toFixed(2) : "0.00"}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[--text-muted]">Flow Status</p>
                            <p className="mt-1 text-lg font-bold text-[--text-primary]">{(pcr?.pcr_oi || 0) > 1 ? "Put Heavy" : "Call Heavy"}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Technical Indicators Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="chart-card"
                    transition={{ delay: 0.1 }}
                >
                    <h3 className="mb-4 text-base font-bold text-[--text-primary]">
                        Tactical Indicators
                    </h3>

                    {latestIndicator ? (
                        <>
                            <div className="mb-4 flex items-end gap-2">
                                <span className={`text-4xl font-black ${rsiTone}`}>{latestIndicator.rsi.toFixed(1)}</span>
                                <span className="pb-1 text-sm font-semibold text-[--text-muted]">RSI (14)</span>
                            </div>

                            <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-[--surface-2]">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${latestIndicator.rsi}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full ${rsiBarClass}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[--text-muted]">BB Upper</p>
                                    <p className="mt-1 text-lg font-bold text-[--text-primary]">{latestIndicator.bb_upper?.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[--text-muted]">BB Lower</p>
                                    <p className="mt-1 text-lg font-bold text-[--text-primary]">{latestIndicator.bb_lower?.toFixed(2)}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-[--text-muted]">No technical data available.</p>
                    )}
                </motion.div>
            </div>

            {/* Strategic Brief & Greeks */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="chart-card"
                transition={{ delay: 0.2 }}
            >
                <div className="mb-6 border-b border-[--border-default] pb-4">
                    <div>
                        <h3 className="text-base font-bold text-[--text-primary]">Quantitative Strategy Brief</h3>
                        <p className="text-xs text-[--text-muted]">AI-synthesized market directives</p>
                    </div>
                </div>

                <div
                    className="mb-6 max-h-75 overflow-y-auto rounded-[--radius-md] border border-[--border-default] bg-[--surface-1] p-5 text-[15px] leading-relaxed text-[--text-secondary]"
                    dangerouslySetInnerHTML={{ 
                        __html: report
                            .replace(/\n/g, '<br/>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    }}
                />

                <div className="border-t border-[--border-default] pt-6">
                    <h3 className="mb-4 text-base font-bold text-[--text-primary]">
                        Greek Risk Analysis
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="greek-box">
                            <span className="greek-label">Delta (Δ)</span>
                            <span className="greek-value text-[--secondary]">{latestIndicator?.delta?.toFixed(3) || "0.500"}</span>
                        </div>
                        <div className="greek-box">
                            <span className="greek-label">Gamma (Γ)</span>
                            <span className="greek-value text-[--accent-rose]">{latestIndicator?.gamma?.toFixed(4) || "0.0240"}</span>
                        </div>
                        <div className="greek-box">
                            <span className="greek-label">Vega (ν)</span>
                            <span className="greek-value text-[--accent-cyan]">{latestIndicator?.vega?.toFixed(2) || "0.15"}</span>
                        </div>
                        <div className="greek-box">
                            <span className="greek-label">Theta (Θ)</span>
                            <span className="greek-value text-[--accent-rose]">{latestIndicator?.theta?.toFixed(3) || "-0.08"}</span>
                        </div>
                        <div className="greek-box">
                            <span className="greek-label">Rho (ρ)</span>
                            <span className="greek-value text-[--accent-emerald]">{latestIndicator?.rho?.toFixed(3) || "0.015"}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

        </div>
    )
}
