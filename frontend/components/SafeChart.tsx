"use client"

import React from "react"
import dynamic from "next/dynamic"

// Core dynamic component to handle ECharts with SSR disabled
const EChartsWrapper = dynamic(() => import("echarts-for-react"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-black/5 rounded-xl border border-dashed border-white/5">
            <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-[--primary] border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Initializing Engine...</span>
            </div>
        </div>
    )
})

interface SafeChartProps {
    option: any
    style?: React.CSSProperties
    className?: string
    onEvents?: Record<string, Function>
    notMerge?: boolean
    lazyUpdate?: boolean
    theme?: string | object
}

export default function SafeChart(props: SafeChartProps) {
    return <EChartsWrapper {...props} />
}
