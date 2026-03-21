"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import SafeChart from "@/components/SafeChart"
import { Card, Badge, Button } from "@/components/ui"
import { getDerivativesSnapshot } from "@/services/api"

export default function GreeksPanel() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<any>(null)
    const [params, setParams] = useState({
        underlying: "USD/INR",
        expiry: "",
        portfolio_value: 10000000,
        portfolio_beta: 0.95,
        hedge_ratio_target: 1,
    })

    const loadData = async (overrides?: Partial<typeof params>) => {
        const nextParams = { ...params, ...overrides }
        setLoading(true)
        setError(null)
        try {
            const res = await getDerivativesSnapshot(nextParams)
            if (!res || typeof res !== 'object') {
                throw new Error("Invalid response from derivatives API")
            }
            setData(res)
            setError(null)
            setParams((prev) => ({
                ...prev,
                ...overrides,
                underlying: res.selected_underlying || nextParams.underlying,
                expiry: res.selected_expiry || nextParams.expiry,
            }))
        } catch (e: any) {
            const errorMsg = e?.response?.data?.detail || e?.message || "Failed to load derivatives data"
            console.error("Derivatives analytics failed:", errorMsg)
            setError(errorMsg)
            setData(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
        // Initial panel hydration only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const radarOption = useMemo(() => {
        if (!data?.factor_cards) return null
        return {
            backgroundColor: "transparent",
            radar: {
                indicator: data.factor_cards.map((card: any) => ({
                    name: card.name,
                    max: card.name.includes("Carry") ? 30 : card.name.includes("Vol") ? 40 : 1.5,
                })),
                shape: "circle",
                splitNumber: 4,
                axisName: { color: "#94a3b8", fontSize: 9, fontWeight: "bold" },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
                splitArea: { show: false },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
            },
            series: [{
                type: "radar",
                data: [{
                    value: data.factor_cards.map((card: any) => Math.abs(Number(card.value))),
                    name: "Risk Profile",
                    itemStyle: { color: "var(--primary)" },
                    areaStyle: { color: "rgba(var(--primary-rgb), 0.22)" },
                }],
            }],
        }
    }, [data])

    const priceOption = useMemo(() => {
        if (!data?.price_series) return null
        return {
            backgroundColor: "transparent",
            grid: { left: 30, right: 10, top: 20, bottom: 25 },
            xAxis: {
                type: "category",
                data: data.price_series.map((point: any) => point.date),
                axisLabel: { color: "#64748b", showMaxLabel: false, showMinLabel: false },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
            },
            yAxis: {
                type: "value",
                axisLabel: { color: "#64748b" },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
            },
            series: [{
                data: data.price_series.map((point: any) => point.close),
                type: "line",
                smooth: true,
                showSymbol: false,
                lineStyle: { color: "#22d3ee", width: 2 },
                areaStyle: { color: "rgba(34, 211, 238, 0.12)" },
            }],
            tooltip: { trigger: "axis" },
        }
    }, [data])

    if (!data) {
        return (
            <Card variant="glass" padding="lg" className="min-h-[360px] flex flex-col items-center justify-center gap-4">
                {error ? (
                    <>
                        <p className="text-sm font-bold text-[--accent-rose] uppercase tracking-[0.3em]">
                            Error Loading Derivatives Data
                        </p>
                        <p className="text-xs text-white/50 text-center max-w-md">{error}</p>
                        <button 
                            onClick={() => loadData()}
                            className="mt-4 px-4 py-2 bg-[--primary] text-white text-xs font-black rounded hover:opacity-80 transition-opacity"
                        >
                            Retry
                        </button>
                    </>
                ) : (
                    <p className="text-sm font-bold text-white/60 uppercase tracking-[0.3em]">
                        {loading ? "Loading derivatives analytics..." : "Initializing derivatives analytics..."}
                    </p>
                )}
            </Card>
        )
    }

    const indicators = data.technical_indicators || {}
    const optionChain = data.option_chain || []
    const market = data.market_snapshot || {}
    const hedge = data.portfolio_hedge || {}

    return (
        <div className="space-y-8 p-1">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Treasury Risk & Hedge Matrix</h3>
                    <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.4em] mt-1">Contract Ladder, Technical Risk Indicators, & Treasury Sensitivity</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full xl:w-auto">
                    <select
                        value={params.underlying}
                        onChange={(e) => loadData({ underlying: e.target.value, expiry: "" })}
                        className="input-pro text-xs font-black"
                    >
                        {(data.underlyings || []).map((underlying: string) => (
                            <option key={underlying} value={underlying}>{underlying}</option>
                        ))}
                    </select>
                    <select
                        value={params.expiry}
                        onChange={(e) => loadData({ expiry: e.target.value })}
                        className="input-pro text-xs font-black"
                    >
                        {(data.available_expiries || []).map((expiry: string) => (
                            <option key={expiry} value={expiry}>{expiry}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        value={params.portfolio_value}
                        onChange={(e) => setParams((prev) => ({ ...prev, portfolio_value: parseFloat(e.target.value) || 0 }))}
                        className="input-pro text-xs font-black"
                        placeholder="Asset Exposure"
                    />
                    <input
                        type="number"
                        step="0.01"
                        value={params.portfolio_beta}
                        onChange={(e) => setParams((prev) => ({ ...prev, portfolio_beta: parseFloat(e.target.value) || 0 }))}
                        className="input-pro text-xs font-black"
                        placeholder="Sensitivity (Beta)"
                    />
                    <Button variant="pro" size="sm" onClick={() => loadData()} loading={loading} className="shadow-[--shadow-glow]">
                        Recalculate
                    </Button>
                </div>
            </div>

            <Card variant="bento" padding="md" className="bg-[--primary]/5 border-[--primary]/20">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.3em] mb-3">Corporate Treasury Use Case</p>
                        <p className="text-sm font-bold text-white/80 leading-relaxed">
                            These analytics provide institutional-grade hedge calibration for currency (FX), commodity (Input Costs), and revenue volatility. Price feeds and sensitivity factors are computed through the neural risk engine to optimize treasury coverage.
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <Badge variant="pro" pulse>{market.trend_bias || "Neutral"} Bias</Badge>
                        <Badge variant="outline">Spot: {market.spot}</Badge>
                        <Badge variant="outline">IV: {market.realized_vol}%</Badge>
                        <Badge variant="outline">DTE: {market.days_to_expiry}</Badge>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                {(data.factor_cards || []).map((factor: any, i: number) => (
                    <motion.div
                        key={factor.name}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Card variant="glass" padding="md" className="group hover:border-[--primary]/40 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{factor.name}</p>
                                <span className="text-[8px] font-bold text-[--primary]">{factor.description}</span>
                            </div>
                            <p className="text-4xl font-black italic tracking-tighter mb-2 text-white">{factor.value}</p>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{factor.description}</p>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card variant="bento" padding="lg" className="lg:col-span-8 bg-black/40 border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-widest">Underlying Trend & Technical Stack</h4>
                            <p className="text-[9px] font-bold text-white/40 uppercase mt-1">Price feed with RSI, MACD, Bollinger Bands, SMA, EMA</p>
                        </div>
                        <Badge variant="outline">{data.selected_underlying} | {data.selected_expiry}</Badge>
                    </div>
                    <div className="h-[260px]">
                        {priceOption && <SafeChart option={priceOption} style={{ height: "100%" }} />}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        {[
                            ["RSI 14", indicators.rsi_14],
                            ["MACD", indicators.macd],
                            ["Signal", indicators.macd_signal],
                            ["MACD Hist", indicators.macd_histogram],
                            ["SMA 20", indicators.sma_20],
                            ["SMA 50", indicators.sma_50],
                            ["EMA 12", indicators.ema_12],
                            ["EMA 26", indicators.ema_26],
                            ["BB Upper", indicators.bollinger_upper],
                            ["BB Mid", indicators.bollinger_mid],
                            ["BB Lower", indicators.bollinger_lower],
                            ["Beta Signal", indicators.beta_signal],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{label}</p>
                                <p className="text-lg font-black text-white mt-2">{value}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <div className="lg:col-span-4 space-y-6">
                    <Card variant="glass" padding="lg" className="h-[320px]">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Risk Surface Radar</h4>
                        <div className="h-[240px]">
                            {radarOption && <SafeChart option={radarOption} style={{ height: "100%" }} />}
                        </div>
                    </Card>

                    <Card variant="bento" padding="lg" className="bg-[--primary]/5 border-[--primary]/20">
                        <p className="text-[10px] font-black text-[--primary] uppercase tracking-widest mb-4">Portfolio-Level Hedge Optimizer</p>
                        <div className="space-y-3 text-sm font-bold text-white/80">
                            <div className="flex justify-between gap-4">
                                <span>Recommended Structure</span>
                                <span className="text-right text-white">{hedge.recommended_structure}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span>Contracts Required</span>
                                <span>{hedge.contracts_required}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span>Delta Offset</span>
                                <span>{hedge.estimated_delta_offset}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span>Notional Hedged</span>
                                <span>{hedge.notional_hedged}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span>Risk Window</span>
                                <span>{hedge.risk_window_days} days</span>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-white/60 italic leading-relaxed mt-5">
                            {hedge.treasury_commentary}
                        </p>
                    </Card>
                </div>
            </div>

            <Card variant="glass" padding="lg" className="overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Hedge Structure Ladder</h4>
                        <p className="text-[9px] font-bold text-white/40 uppercase mt-1">Dynamic strike ladder with Open Interest, Implied Volatility, and Carry Analysis</p>
                    </div>
                    <Badge variant="outline">Lot Size: {market.lot_size}</Badge>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[9px] font-black uppercase tracking-widest text-white/20 border-b border-white/5">
                                <th className="py-3 text-center text-[#11d3d3]">Call OI</th>
                                <th className="py-3 text-center">Call IV</th>
                                <th className="py-3 text-center">Call LTP</th>
                                <th className="py-3 text-center">Strike</th>
                                <th className="py-3 text-center">Put LTP</th>
                                <th className="py-3 text-center">Put IV</th>
                                <th className="py-3 text-center text-[#f43f5e]">Put OI</th>
                                <th className="py-3 text-center">Greeks / Hedge Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {optionChain.map((row: any) => (
                                <tr key={row.strike} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4 text-center text-xs font-black text-[#11d3d3]/70">{row.call_oi.toLocaleString()}</td>
                                    <td className="py-4 text-center text-xs font-bold text-white/70">{row.call_iv}%</td>
                                    <td className="py-4 text-center text-xs font-bold text-white/70">{row.call_ltp}</td>
                                    <td className="py-4 text-center text-sm font-black text-white bg-white/[0.02] border-x border-white/5">{row.strike}</td>
                                    <td className="py-4 text-center text-xs font-bold text-white/70">{row.put_ltp}</td>
                                    <td className="py-4 text-center text-xs font-bold text-white/70">{row.put_iv}%</td>
                                    <td className="py-4 text-center text-xs font-black text-[#f43f5e]/70">{row.put_oi.toLocaleString()}</td>
                                    <td className="py-4 text-center">
                                        <p className="text-[10px] font-black text-white/80">
                                            Δ {row.put_greeks.delta} | Γ {row.put_greeks.gamma} | Θ {row.put_greeks.theta}
                                        </p>
                                        <p className="text-[9px] font-bold text-white/35 uppercase tracking-wide mt-1">{row.hedge_note}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
