"use client"

import React, { useRef, useEffect, useMemo } from "react"
import * as echarts from "echarts"

interface SafeChartProps {
    option: any
    style?: React.CSSProperties
    className?: string
    theme?: string | object
    notMerge?: boolean
}

export default function SafeChart({ option, style, theme = "dark", notMerge = true }: SafeChartProps) {
    const chartRef = useRef<HTMLDivElement>(null)
    const chartInstance = useRef<echarts.ECharts | null>(null)

    const finalStyle = useMemo(() => ({
        height: "350px",
        width: "100%",
        ...style
    }), [style])

    // Option hash to prevent unnecessary setOption calls if the object content is the same
    const optionStr = useMemo(() => JSON.stringify(option), [option])

    useEffect(() => {
        if (!chartRef.current) return
        
        const initChart = () => {
            if (!chartRef.current) return;
            try {
                if (!chartInstance.current) {
                    chartInstance.current = echarts.init(chartRef.current, theme)
                }
                if (option) {
                    chartInstance.current.setOption(option, notMerge)
                }
                chartInstance.current.resize()
            } catch (err) {
                console.error("SafeChart Init Error:", err)
            }
        };

        // MutationObserver/ResizeObserver is more reliable than timeout
        const resizeObserver = new ResizeObserver(() => {
            if (chartInstance.current) {
                chartInstance.current.resize()
            } else {
                initChart()
            }
        })

        resizeObserver.observe(chartRef.current)

        return () => {
            resizeObserver.disconnect()
        }
    }, [optionStr, theme, notMerge])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (chartInstance.current) {
                chartInstance.current.dispose()
                chartInstance.current = null
            }
        }
    }, [])

    if (!option) return (
        <div className="flex items-center justify-center w-full h-[300px] border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
            <span className="text-[10px] uppercase tracking-widest text-white/20 font-black">Waiting for Data Pipeline...</span>
        </div>
    )

    return (
        <div 
            ref={chartRef} 
            style={{ ...finalStyle, position: 'relative', zIndex: 1 }} 
            className="echarts-safe-canvas w-full h-full"
        />
    )
}

