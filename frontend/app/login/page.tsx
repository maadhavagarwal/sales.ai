"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button, Input, Card } from "@/components/ui"

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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend"
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
        } catch {
            setError("Cannot connect to server")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-cyan-500/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <Card variant="elevated" padding="lg" className="sm:p-8">
                    {/* Header */}
                    <div className="text-center mb-6 sm:mb-8">
                        <Link href="/" className="inline-block mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/30 mx-auto">
                                N
                            </div>
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mb-2">
                            Welcome back
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Sign in to your NeuralBI account
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            fullWidth
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            fullWidth
                        />

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded bg-slate-800 border border-slate-700 accent-indigo-600"
                                    defaultChecked
                                />
                                <span className="text-slate-400 hover:text-slate-300 transition-colors">
                                    Remember me
                                </span>
                            </label>
                            <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                Forgot password?
                            </a>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={loading}
                            type="submit"
                        >
                            Sign In
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 sm:my-8 flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">OR</span>
                        <div className="flex-1 h-px bg-slate-700" />
                    </div>

                    {/* Social Buttons */}
                    <div className="space-y-3 sm:space-y-4">
                        <Button variant="outline" size="md" fullWidth>
                            <span>🔷</span>
                            Continue with Google
                        </Button>
                        <Button variant="outline" size="md" fullWidth>
                            <span>💼</span>
                            Continue with Microsoft
                        </Button>
                    </div>

                    {/* Footer */}
                    <p className="mt-6 sm:mt-8 text-center text-sm text-slate-400">
                        Don't have an account?{" "}
                        <Link
                            href="/register"
                            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Create one
                        </Link>
                    </p>
                </Card>

                {/* Footer Text */}
                <p className="text-center text-xs text-slate-500 mt-6 sm:mt-8">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </motion.div>
        </div>
    )
}
