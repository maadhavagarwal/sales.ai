"use client"

import { motion } from "framer-motion"

export default function StrategyPanel({ strategy }: { strategy: string[] }) {
    if (!strategy || strategy.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="chart-card"
            >
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-[--text-primary]">AI Strategy Recommendations</h3>
                        <p className="mt-0.5 text-xs text-[--text-muted]">
                            Loading strategy recommendations...
                        </p>
                    </div>
                </div>
                <div className="flex h-50 items-center justify-center text-[--text-muted]">
                    <div className="animate-pulse">Analyzing dataset...</div>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="chart-card"
        >
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold tracking-tight text-[--text-primary]">
                        AI Strategy Recommendations
                    </h3>
                    <p className="mt-0.5 text-xs text-[--text-muted]">
                        {strategy.length} recommendations generated
                    </p>
                </div>
                <span className="badge badge-success">AI Generated</span>
            </div>

            <div className="space-y-3">
                {strategy.map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="flex items-start gap-3 rounded-[--radius-md] border border-[--border-default] bg-[--surface-1] px-4 py-3 transition-colors hover:border-[--border-accent] hover:bg-[--surface-2]"
                    >
                        <div className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[--primary] text-[10px] font-bold text-white">
                            {i + 1}
                        </div>
                        <p className="text-sm leading-relaxed text-[--text-secondary]">
                            {s}
                        </p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}