"use client"

import { useState, useRef, useEffect } from "react"
import { askCopilot, askCopilotAgent } from "@/services/api"
import { useStore } from "@/store/useStore"
import { motion, AnimatePresence } from "framer-motion"

interface Message {
    role: "user" | "ai"
    text: string
    reasoning?: any[]
    timestamp: Date
}

export default function CopilotChat() {
    const [question, setQuestion] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [isAgentMode, setIsAgentMode] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const { results, datasetId } = useStore()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(scrollToBottom, [messages])

    const suggestions = results
        ? [
            "Summarize the data",
            results.analytics?.top_products ? "What are the top 5 products?" : "Show all totals",
            results.analytics?.region_sales ? "Which region performs best?" : "Compare categories",
            "Show average revenue",
            results.columns?.includes("date") ? "Show trend over time" : "Count by category",
            "What columns are available?",
        ].filter(Boolean)
        : [
            "Summarize the data",
            "What are the top products?",
            "Which region performs best?",
            "Show revenue trends",
        ]

    const ask = async (q?: string) => {
        const query = q || question.trim()
        if (!query || loading) return

        const userMsg: Message = { role: "user", text: query, timestamp: new Date() }
        setMessages((prev) => [...prev, userMsg])
        setQuestion("")
        setLoading(true)

        try {
            if (!datasetId) {
                throw new Error("No dataset uploaded.")
            }

            const res = isAgentMode
                ? await askCopilotAgent(datasetId, query)
                : await askCopilot(datasetId, query)

            const aiMsg: Message = {
                role: "ai",
                text: res.answer || res.answer?.answer || res.error || "No response received.",
                reasoning: res.agent_outputs || res.answer?.agent_outputs || null,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, aiMsg])
        } catch (err: any) {
            const errorText = err?.response?.data?.error || err?.message || "Unknown error"
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: `Sorry, I couldn't process that. ${errorText}\n\nMake sure a dataset is uploaded first.`,
                    timestamp: new Date(),
                },
            ])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            ask()
        }
    }

    return (
        <div className="chat-container" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
            {/* Header / Mode Toggle */}
            <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.1)", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                        Neural Engine v4.0
                    </span>
                </div>
                <div
                    onClick={() => setIsAgentMode(!isAgentMode)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        cursor: "pointer",
                        padding: "0.4rem 0.875rem",
                        borderRadius: "999px",
                        background: isAgentMode ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isAgentMode ? "var(--primary-500)" : "var(--border-subtle)"}`,
                        transition: "all 300ms ease"
                    }}
                >
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isAgentMode ? "var(--primary-400)" : "var(--text-muted)" }}>
                        {isAgentMode ? "🤖 AGENT ORCHESTRATOR" : "⚡ FAST MODE"}
                    </span>
                    <div style={{
                        width: "32px",
                        height: "16px",
                        background: isAgentMode ? "var(--primary-500)" : "rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        position: "relative"
                    }}>
                        <motion.div
                            animate={{ x: isAgentMode ? 16 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            style={{ width: "12px", height: "12px", background: "#fff", borderRadius: "50%", position: "absolute", top: "2px" }}
                        />
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="chat-messages" style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column" }}>
                {messages.length === 0 && (
                    <div style={{ margin: "auto", textAlign: "center", maxWidth: "450px" }}>
                        <div style={{ width: "64px", height: "64px", borderRadius: "var(--radius-xl)", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", boxShadow: "var(--shadow-glow)", margin: "0 auto 1.5rem" }}>
                            {isAgentMode ? "🧠" : "🤖"}
                        </div>
                        <h3 style={{ fontWeight: 800, color: "var(--text-secondary)", fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                            {isAgentMode ? "Autonomous Agent Supervisor" : "AI Business Copilot"}
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "2rem" }}>
                            {isAgentMode
                                ? "In Agent Mode, I supervise a team of specialized AI agents (Data, ML, Strategy, Viz) to solve complex data requests. This is slower but much more thorough."
                                : "In Fast Mode, I use optimized pandas heuristics to give you instant answers about sums, trends, and comparisons."
                            }
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                            {suggestions.map((q) => (
                                <button key={q} onClick={() => ask(q as string)} className="badge" style={{ cursor: "pointer", border: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.03)" }}>
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
                                style={{ whiteSpace: "pre-wrap", maxWidth: "85%", fontSize: "0.95rem", lineHeight: 1.6 }}
                            >
                                {msg.text}
                            </motion.div>

                            {msg.reasoning && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "600px", border: "1px solid var(--border-subtle)" }}>
                                    <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--primary-400)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                                        Agent Execution Reasoning
                                    </p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        {msg.reasoning.map((step, idx) => (
                                            <div key={idx} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", borderLeft: "2px solid rgba(255,255,255,0.1)", paddingLeft: "1rem" }}>
                                                {typeof step === 'string' ? step : JSON.stringify(step)}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chat-bubble chat-bubble-ai" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <div className="spinner" />
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {isAgentMode ? "Supervisor coordinating agent team..." : "Analyzing data..."}
                        </span>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="chat-input-bar" style={{ padding: "1.25rem 2rem", background: "rgba(0,0,0,0.2)", borderTop: "1px solid var(--border-subtle)" }}>
                <input
                    ref={inputRef}
                    className="input-field"
                    placeholder={isAgentMode ? "Ask a complex question..." : "Ask me anything..."}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    style={{ background: "rgba(0,0,0,0.3)", height: "50px" }}
                />
                <button
                    className="btn-primary"
                    onClick={() => ask()}
                    disabled={loading || !question.trim()}
                    style={{ height: "50px", padding: "0 1.5rem" }}
                >
                    {loading ? "..." : "→"}
                </button>
            </div>
        </div>
    )
}