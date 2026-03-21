"use client"

import { motion } from "framer-motion"

interface StrategicInsightsProps {
    insights: string[]
    recommendations: string[]
    strategy: string[]
}

export default function StrategicInsightsPanel({ insights, recommendations, strategy }: StrategicInsightsProps) {
    if (!insights?.length && !recommendations?.length && !strategy?.length) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="chart-card"
        >
            <div className="mb-8">
                <h3 className="text-xl font-bold text-[--text-primary]">Strategic AI Roadmap</h3>
                <p className="mt-1 text-sm text-[--text-muted]">Deep-learning derived business strategy and optimizations</p>
            </div>

            <div className="grid gap-7 lg:grid-cols-3">
                {/* Insights Section */}
                <section>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[--radius-xs] bg-[--primary]/10 text-[--primary]">🔍</div>
                        <h4 className="text-sm font-semibold text-[--text-secondary]">Market Insights</h4>
                    </div>
                    <div className="space-y-3">
                        {insights?.map((item, i) => (
                            <div key={i} className="rounded-[--radius-sm] border border-[--border-default] bg-[--surface-1] p-4 text-sm leading-relaxed text-[--text-secondary]">
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Strategy Section */}
                <section>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[--radius-xs] bg-[--secondary]/10 text-[--secondary]">🛡️</div>
                        <h4 className="text-sm font-semibold text-[--text-secondary]">Tactical Strategy</h4>
                    </div>
                    <div className="space-y-3">
                        {strategy?.map((item, i) => (
                            <div key={i} className="rounded-[--radius-sm] border border-[--secondary]/20 bg-[--secondary]/6 p-4 text-sm leading-relaxed text-[--text-secondary]">
                                <span className="mr-2 font-bold uppercase tracking-[0.08em] text-[--secondary]">Step {i + 1}</span>
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recommendations Section */}
                <section>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[--radius-xs] bg-[--accent-emerald]/10 text-[--accent-emerald]">⚡</div>
                        <h4 className="text-sm font-semibold text-[--text-secondary]">Action Items</h4>
                    </div>
                    <div className="space-y-3">
                        {recommendations?.map((item, i) => (
                            <div key={i} className="flex gap-3 rounded-[--radius-sm] border border-[--accent-emerald]/20 bg-[--accent-emerald]/6 p-4 text-sm leading-relaxed text-[--text-secondary]">
                                <div className="mt-0.5 flex h-5 w-5 min-w-5 items-center justify-center rounded-full bg-[--accent-emerald] text-[10px] font-bold text-black">✓</div>
                                {item}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </motion.div>
    )
}
