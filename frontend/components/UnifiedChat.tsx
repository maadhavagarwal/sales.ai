"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import Link from "next/link"
import SafeChart from "@/components/SafeChart"

interface Message {
    id: string
    role: "user" | "ai"
    text: string
    type: "text" | "chart"
    chart?: any
    confidence?: number
    timestamp: Date
}

function formatTime(d: Date): string {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function UnifiedChatComponent() {
    const [question, setQuestion] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const { results, datasetId } = useStore()

    // Memoize suggestions to reduce re-renders
    const suggestions = useMemo(() => {
        if (!results) return []
        return [
            "Summarize the data",
            results.analytics?.top_products ? "Top 5 products?" : "Show totals",
            results.analytics?.region_sales ? "Which region performs best?" : "Categories",
            "Show average revenue",
            "Generate a chart visualization"
        ]
    }, [results])

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    const copyToClipboard = (text: string, idx: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIdx(idx)
            setTimeout(() => setCopiedIdx(null), 2000)
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            ask()
        }
    }

    const ask = async (q?: string) => {
        const query = q || question.trim()
        if (!query || loading) return

        if (!datasetId) {
            const errorMsg: Message = {
                id: Math.random().toString(),
                role: "ai",
                text: "⚠️ No dataset loaded. Upload a CSV from the Dashboard first.",
                type: "text",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setQuestion("")
            return
        }

        // Add user message
        const userMsg: Message = {
            id: Math.random().toString(),
            role: "user",
            text: query,
            type: "text",
            timestamp: new Date()
        }
        setMessages(prev => [...prev, userMsg])
        setQuestion("")
        setLoading(true)

        try {
            // Lightweight fetch with timeout
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

            const response = await fetch("/api/backend/copilot-chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: query,
                    dataset_id: datasetId,
                }),
                signal: controller.signal
            })

            clearTimeout(timeout)

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error("Too many requests. Please wait a moment.")
                }
                throw new Error(`API error: ${response.status}`)
            }

            const data = await response.json()

            const aiMsg: Message = {
                id: Math.random().toString(),
                role: "ai",
                text: data.answer || "I've analyzed the data for you.",
                type: data.type || "text",
                chart: data.chart,
                confidence: data.confidence,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMsg])

        } catch (err: any) {
            const errorMsg: Message = {
                id: Math.random().toString(),
                role: "ai",
                text: err.message?.includes("429")
                    ? "⏳ Rate limited. Try again in a moment."
                    : "❌ Error processing query. Try a simpler question.",
                type: "text",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setLoading(false)
        }
    }

    const getChartOption = (chartData: any) => {
        if (!chartData?.data) return null

        const xKey = chartData.x || "x"
        const yKey = chartData.y || "y"
        const chartType = chartData.chart || "bar"

        return {
            backgroundColor: "transparent",
            grid: { top: 20, right: 15, bottom: 30, left: 50 },
            xAxis: { type: "category", data: chartData.data.map((d: any) => d[xKey]) },
            yAxis: { type: "value" },
            series: [
                {
                    data: chartData.data.map((d: any) => d[yKey]),
                    type: chartType,
                    smooth: true,
                    itemStyle: { color: "var(--primary-500)" }
                }
            ],
            tooltip: { trigger: "axis" }
        }
    }

    return (
        <div className="unified-chat-container" style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: "rgba(10, 10, 15, 0.8)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            overflow: "hidden"
        }}>
            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
            }}>
                {messages.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            textAlign: "center",
                            color: "var(--text-muted)",
                            gap: "1rem"
                        }}
                    >
                        <div style={{ fontSize: "2.5rem" }}>💬</div>
                        <div>
                            <p style={{ fontSize: "1rem", fontWeight: 600 }}>Start a conversation</p>
                            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Ask about your data, generate charts, or get insights</p>
                        </div>

                        {suggestions.length > 0 && (
                            <div style={{ marginTop: "1.5rem", width: "100%" }}>
                                <p style={{ fontSize: "0.75rem", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>Try asking:</p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                                    {suggestions.slice(0, 3).map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => ask(s)}
                                            style={{
                                                fontSize: "0.75rem",
                                                padding: "0.4rem 0.8rem",
                                                borderRadius: "9999px",
                                                border: "1px solid var(--border-default)",
                                                background: "rgba(255,255,255,0.03)",
                                                color: "var(--text-muted)",
                                                cursor: "pointer",
                                                transition: "all 150ms"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = "var(--primary-500)"
                                                e.currentTarget.style.color = "var(--primary-400)"
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = "var(--border-default)"
                                                e.currentTarget.style.color = "var(--text-muted)"
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    display: "flex",
                                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                    marginBottom: "0.5rem"
                                }}
                            >
                                <div style={{
                                    maxWidth: "85%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: msg.role === "user" ? "flex-end" : "flex-start"
                                }}>
                                    {msg.type === "chart" && msg.chart ? (
                                        <div style={{
                                            background: "rgba(0,0,0,0.3)",
                                            borderRadius: "var(--radius-md)",
                                            padding: "1rem",
                                            marginBottom: "0.5rem",
                                            width: "100%",
                                            minHeight: "300px"
                                        }}>
                                            <SafeChart option={getChartOption(msg.chart)} style={{ height: "300px" }} />
                                        </div>
                                    ) : null}

                                    <div
                                        style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "var(--radius-md)",
                                            background: msg.role === "user"
                                                ? "var(--primary-600)"
                                                : "rgba(255,255,255,0.08)",
                                            color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                                            wordBreak: "break-word",
                                            lineHeight: 1.5,
                                            fontSize: "0.9rem",
                                            position: "relative",
                                            whiteSpace: "pre-wrap"
                                        }}
                                    >
                                        {msg.text}
                                        {msg.role === "ai" && (
                                            <button
                                                onClick={() => copyToClipboard(msg.text, i)}
                                                style={{
                                                    position: "absolute",
                                                    top: "8px",
                                                    right: "8px",
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    fontSize: "0.7rem",
                                                    color: "var(--text-muted)",
                                                    opacity: 0.6,
                                                    transition: "opacity 200ms"
                                                }}
                                                title="Copy"
                                            >
                                                {copiedIdx === i ? "✓" : "⎘"}
                                            </button>
                                        )}
                                    </div>

                                    <div style={{
                                        fontSize: "0.7rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.25rem",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.5rem",
                                        width: "100%"
                                    }}>
                                        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                                            <span>{formatTime(msg.timestamp)}</span>
                                            {msg.confidence && msg.role === "ai" && (
                                                <span style={{
                                                    background: msg.confidence > 0.9 ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.15)",
                                                    color: msg.confidence > 0.9 ? "#4ade80" : "#fb923c",
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    fontSize: "0.65rem",
                                                    fontWeight: 600,
                                                    border: `1px solid ${msg.confidence > 0.9 ? "rgba(34,197,94,0.2)" : "rgba(249,115,22,0.2)"}`
                                                }}>
                                                    {Math.round(msg.confidence * 100)}% Confidence
                                                </span>
                                            )}
                                        </div>

                                        {msg.role === "ai" && (msg as any).explainability?.length > 0 && (
                                            <div style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: "0.4rem",
                                                marginTop: "0.2rem"
                                            }}>
                                                {(msg as any).explainability.map((driver: any, idx: number) => (
                                                    <span key={idx} style={{
                                                        fontSize: "0.6rem",
                                                        padding: "2px 8px",
                                                        background: "rgba(255,255,255,0.05)",
                                                        border: "1px solid rgba(255,255,255,0.1)",
                                                        borderRadius: "4px",
                                                        color: "var(--text-secondary)"
                                                    }}>
                                                        🔍 {driver.factor || driver}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ display: "flex", gap: "0.3rem", paddingLeft: "1rem" }}
                            >
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                        transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                                        style={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            background: "var(--primary-500)"
                                        }}
                                    />
                                ))}
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div style={{
                borderTop: "1px solid var(--border-default)",
                padding: "1rem",
                background: "rgba(10,10,15,0.9)"
            }}>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={!datasetId ? "Upload a dataset first..." : "Ask anything about your data..."}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading || !datasetId}
                        style={{
                            flex: 1,
                            padding: "0.75rem 1rem",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--text-primary)",
                            fontSize: "0.9rem",
                            outline: "none",
                            transition: "all 200ms"
                        }}
                    />
                    <button
                        onClick={() => ask()}
                        disabled={loading || !question.trim() || !datasetId}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "var(--primary-600)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            cursor: loading || !question.trim() || !datasetId ? "not-allowed" : "pointer",
                            opacity: loading || !question.trim() || !datasetId ? 0.5 : 1,
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            transition: "all 200ms"
                        }}
                    >
                        {loading ? "..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    )
}
