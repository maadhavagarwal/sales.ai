"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Login() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()
            if (res.ok) {
                localStorage.setItem("token", data.token)
                router.push("/dashboard")
            } else {
                setError(data.error || "Login failed")
            }
        } catch (err) {
            setError("Cannot connect to server")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-0)",
            position: "relative",
            padding: "2rem"
        }}>
            {/* Background Mesh */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: "var(--gradient-mesh)",
                opacity: 0.6,
                pointerEvents: "none"
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{
                    width: "100%",
                    maxWidth: "400px",
                    padding: "3rem 2.5rem",
                    position: "relative",
                    zIndex: 10,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}
            >
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <div style={{
                        width: "48px",
                        height: "48px",
                        background: "var(--gradient-primary)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "1.2rem",
                        margin: "0 auto 1.5rem",
                        boxShadow: "var(--shadow-glow)"
                    }}>
                        AI
                    </div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Welcome back</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Sign in to your NeuralBI workspace</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid #ef4444",
                            color: "#fca5a5",
                            padding: "0.75rem",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            marginBottom: "1.5rem",
                            textAlign: "center"
                        }}>
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            style={{
                                width: "100%",
                                padding: "0.875rem 1rem",
                                background: "rgba(0,0,0,0.2)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-md)",
                                color: "white",
                                fontSize: "0.95rem",
                                outline: "none"
                            }}
                        />
                    </div>

                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Password</label>
                            <a href="#" style={{ fontSize: "0.8rem", color: "var(--primary-400)", textDecoration: "none" }}>Forgot?</a>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: "100%",
                                padding: "0.875rem 1rem",
                                background: "rgba(0,0,0,0.2)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-md)",
                                color: "white",
                                fontSize: "0.95rem",
                                outline: "none"
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{
                            marginTop: "1rem",
                            padding: "0.875rem",
                            fontSize: "1rem",
                            width: "100%",
                            opacity: loading ? 0.7 : 1
                        }}
                        disabled={loading}
                    >
                        {loading ? "Authenticating..." : "Sign in to Dashboard"}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Don't have an account? <Link href="/register" style={{ color: "white", fontWeight: 600, textDecoration: "none" }}>Register now</Link>
                </p>
            </motion.div>
        </div>
    )
}
