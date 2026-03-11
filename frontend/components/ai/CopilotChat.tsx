"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { askCopilot, askCopilotAgent } from "@/services/api"
import { useStore } from "@/store/useStore"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface Message {
    role: "user" | "ai"
    text: string
    reasoning?: any[]
    suggestions?: string[]
    timestamp: Date
}

function formatTime(d: Date) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function CopilotChat() {
    const [question, setQuestion] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [isAgentMode, setIsAgentMode] = useState(false)
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const { results, datasetId } = useStore()

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [])

    useEffect(scrollToBottom, [messages, scrollToBottom])

    const suggestions = results
        ? [
            "Summarize the data",
            results.analytics?.top_products ? "What are the top 5 products?" : "Show all totals",
            results.analytics?.region_sales ? "Which region performs best?" : "Compare categories",
            "Show average revenue",
            results.columns?.includes("date") ? "Show trend over time" : "Count by category",
        ]
        : []

    const copyToClipboard = (text: string, idx: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIdx(idx)
            setTimeout(() => setCopiedIdx(null), 2000)
        })
    }

    const ask = async (q?: string) => {
        const query = q || question.trim()
        if (!query || loading) return

        if (!datasetId) {
            setMessages((prev) => [...prev, { role: "user", text: query, timestamp: new Date() }, {
                role: "ai",
                text: "⚠️ No dataset loaded. Please upload a CSV or Excel file from the Dashboard first.",
                timestamp: new Date(),
            }])
            setQuestion("")
            return
        }

        const userMsg: Message = { role: "user", text: query, timestamp: new Date() }
        setMessages((prev) => [...prev, userMsg])
        setQuestion("")
        setLoading(true)

        try {
            const res = isAgentMode
                ? await askCopilotAgent(datasetId, query)
                : await askCopilot(datasetId, query)

            const aiMsg: Message = {
                role: "ai",
                text: res.answer || res.response || res.answer?.answer || res.error || "No response received.",
                reasoning: res.agent_outputs || res.answer?.agent_outputs || null,
                suggestions: res.suggested_questions || [],
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, aiMsg])
        } catch (err: any) {
            const errorText = err?.response?.data?.error || err?.message || "Unknown error"
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: `⚠️ ${errorText}\n\nMake sure the backend server is running on port 8000.`,
                    timestamp: new Date(),
                },
            ])
        } finally {
            setLoading(false)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            ask()
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
            {/* Header */}
            <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.15)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: datasetId ? "#10b981" : "#6b7280", boxShadow: datasetId ? "0 0 8px #10b981" : "none" }} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        Neural RAG Engine v4.0 <span style={{ color: "var(--border-subtle)" }}>|</span> {datasetId ? <span style={{ color: "#10b981", display: "flex", gap: "4px", alignItems: "center" }}><span className="pulse-dot" style={{ background: "#10b981" }}></span> ChromaDB Memory Active</span> : <span style={{ color: "#6b7280" }}>Memory Offline</span>}
                    </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {messages.length > 0 && (
                        <button
                            onClick={() => setMessages([])}
                            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", color: "var(--accent-rose)", cursor: "pointer", fontWeight: 600 }}
                        >
                            Clear Chat
                        </button>
                    )}
                    <div
                        onClick={() => setIsAgentMode(!isAgentMode)}
                        style={{
                            display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer",
                            padding: "0.35rem 0.75rem", borderRadius: "999px",
                            background: isAgentMode ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isAgentMode ? "var(--primary-500)" : "var(--border-subtle)"}`,
                            transition: "all 250ms ease"
                        }}
                        title={isAgentMode ? "Switch to Fast Mode" : "Switch to Agent Mode"}
                    >
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isAgentMode ? "var(--primary-400)" : "var(--text-muted)" }}>
                            {isAgentMode ? "🧠 AGENT" : "⚡ FAST"}
                        </span>
                        <div style={{ width: "28px", height: "14px", background: isAgentMode ? "var(--primary-500)" : "rgba(255,255,255,0.1)", borderRadius: "10px", position: "relative", transition: "background 250ms" }}>
                            <motion.div
                                animate={{ x: isAgentMode ? 14 : 2 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                style={{ width: "10px", height: "10px", background: "#fff", borderRadius: "50%", position: "absolute", top: "2px" }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {messages.length === 0 && (
                    <div style={{ margin: "auto", textAlign: "center", maxWidth: "480px", padding: "2rem 0" }}>
                        <div style={{ width: "72px", height: "72px", borderRadius: "var(--radius-xl)", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", boxShadow: "var(--shadow-glow)", margin: "0 auto 1.5rem" }}>
                            {isAgentMode ? "🧠" : "🤖"}
                        </div>
                        <h3 style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                            {isAgentMode ? "Autonomous Agent Supervisor" : "Enterprise RAG Data Copilot"}
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                            {isAgentMode
                                ? "Data autonomous mode active. Capable of executing multi-step python reasoning chains directly on your datasets."
                                : "I am connected directly to your dataset via ChromaDB Vector Memory. Ask me anything about your current data shape, margins, or historical trends."}
                        </p>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "2rem" }}>
                            {isAgentMode
                                ? "Orchestrates specialized AI agents (Data, ML, Strategy, Viz) for deep analysis."
                                : "Ask anything about your uploaded data — totals, trends, top products, comparisons."}
                        </p>

                        {!datasetId && (
                            <div style={{ marginBottom: "1.5rem", padding: "0.875rem 1rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", color: "var(--accent-amber)", lineHeight: 1.5 }}>
                                ⚠️ No dataset loaded. <Link href="/dashboard" style={{ color: "white", fontWeight: 700, textDecoration: "none" }}>Go to Dashboard →</Link> to upload a file first.
                            </div>
                        )}

                        {suggestions.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                                {suggestions.map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => ask(q as string)}
                                        style={{ cursor: "pointer", padding: "0.4rem 0.875rem", borderRadius: "999px", border: "1px solid var(--border-default)", background: "rgba(255,255,255,0.03)", fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "inherit", transition: "all 150ms" }}
                                        onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "var(--primary-500)"; (e.target as HTMLButtonElement).style.color = "var(--primary-400)" }}
                                        onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "var(--border-default)"; (e.target as HTMLButtonElement).style.color = "var(--text-secondary)" }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "1.25rem" }}
                        >
                            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                                {msg.role === "ai" && (
                                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", flexShrink: 0 }}>🤖</div>
                                )}
                                <div
                                    className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
                                    style={{ whiteSpace: "pre-wrap", maxWidth: "82%", fontSize: "0.875rem", lineHeight: 1.65, position: "relative" }}
                                >
                                    {msg.text}
                                    {msg.role === "ai" && (
                                        <button
                                            onClick={() => copyToClipboard(msg.text, i)}
                                            title="Copy response"
                                            style={{ position: "absolute", top: "6px", right: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: "var(--text-muted)", opacity: 0.6 }}
                                        >
                                            {copiedIdx === i ? "✓" : "⎘"}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px", paddingLeft: msg.role === "ai" ? "36px" : "0" }}>
                                {formatTime(msg.timestamp)}
                            </span>

                            {msg.reasoning && msg.reasoning.length > 0 && (
                                <motion.details initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: "0.5rem", maxWidth: "600px", width: "100%" }}>
                                    <summary style={{ fontSize: "0.72rem", color: "var(--primary-400)", cursor: "pointer", fontWeight: 700, padding: "0.25rem 0" }}>View Agent Reasoning</summary>
                                    <div style={{ marginTop: "0.5rem", padding: "0.875rem", background: "rgba(0,0,0,0.25)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        {msg.reasoning.map((step, idx) => (
                                            <div key={idx} style={{ fontSize: "0.78rem", color: "var(--text-secondary)", borderLeft: "2px solid var(--primary-700)", paddingLeft: "0.75rem" }}>
                                                {typeof step === "string" ? step : JSON.stringify(step)}
                                            </div>
                                        ))}
                                    </div>
                                </motion.details>
                            )}

                            {msg.role === "ai" && msg.suggestions && msg.suggestions.length > 0 && (
                                <div style={{ marginTop: "0.6rem", display: "flex", flexWrap: "wrap", gap: "0.4rem", maxWidth: "600px" }}>
                                    {msg.suggestions.map((suggestion) => (
                                        <button
                                            key={`${i}-${suggestion}`}
                                            onClick={() => ask(suggestion)}
                                            style={{ cursor: "pointer", padding: "0.35rem 0.75rem", borderRadius: "999px", border: "1px solid var(--border-default)", background: "rgba(255,255,255,0.03)", fontSize: "0.72rem", color: "var(--text-secondary)" }}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", flexShrink: 0 }}>🤖</div>
                        <div className="chat-bubble chat-bubble-ai" style={{ display: "flex", gap: "6px", alignItems: "center", padding: "0.875rem 1.25rem" }}>
                            {[0, 1, 2].map(dot => (
                                <motion.div key={dot} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary-400)" }}
                                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                                    transition={{ duration: 1, delay: dot * 0.18, repeat: Infinity }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{ padding: "1rem 1.5rem", background: "rgba(3,7,18,0.6)", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "0.625rem", alignItems: "center", flexShrink: 0 }}>
                <input
                    ref={inputRef}
                    className="input-field"
                    placeholder={!datasetId ? "Upload a dataset first..." : isAgentMode ? "Ask a complex question..." : "Ask me anything about your data..."}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    style={{ height: "46px", background: "rgba(0,0,0,0.3)", flex: 1 }}
                />
                <button
                    className="btn-primary"
                    onClick={() => ask()}
                    disabled={loading || !question.trim()}
                    style={{ height: "46px", padding: "0 1.25rem", minWidth: "52px", fontSize: "1rem", opacity: (loading || !question.trim()) ? 0.5 : 1, transition: "all 200ms" }}
                >
                    {loading ? "…" : "→"}
                </button>
            </div>
        </div>
    )
}
