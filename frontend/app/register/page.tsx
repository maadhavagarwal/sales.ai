"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Register() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setLoading(true)
        setError("")
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend"

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()
            if (res.ok) {
                setSuccess(true)
                setTimeout(() => {
                    router.push("/login")
                }, 2000)
            } else {
                setError(data.error || "Registration failed")
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
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Create Account</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Start your NeuralBI journey today</p>
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

                {success && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid #10b981",
                            color: "#a7f3d0",
                            padding: "0.75rem",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            marginBottom: "1.5rem",
                            textAlign: "center"
                        }}>
                        Registration successful! Redirecting to login...
                    </motion.div>
                )}

                <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Password</label>
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

                    <div>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Confirm Password</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        {loading ? "Creating Account..." : "Register Now"}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Already have an account? <Link href="/login" style={{ color: "white", fontWeight: 600, textDecoration: "none" }}>Sign In</Link>
                </p>
            </motion.div>
        </div>
    )
}
