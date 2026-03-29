"use client"

import { useState } from "react"
import { useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button, Input, Card } from "@/components/ui"
import { useStore } from "@/store/useStore"
import { ORG_ID_KEY, setAuthToken } from "@/lib/session"
import { acceptOrganizationInviteByToken } from "@/services/api"
import { Chrome, BriefcaseBusiness, Sparkles, Brain, Shield, Zap } from "lucide-react"

export default function Login() {
    const router = useRouter()
    const { setUser, setOnboardingComplete, setEntitlements, setResults, setDatasetId, setFileName } = useStore()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        const token = new URLSearchParams(window.location.search).get("invite_token")
        if (!token) return
        setPendingInviteToken(token)
        localStorage.setItem("pending_invite_token", token)
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        const API_URL = "/api/backend"
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()
            if (res.ok) {
                const sessionToken = data?.token || data?.access_token
                if (!sessionToken) {
                    setError("Login succeeded but no session token was returned")
                    return
                }
                setAuthToken(sessionToken)
                if (data.company_id) {
                    localStorage.setItem(ORG_ID_KEY, String(data.company_id))
                }
                localStorage.setItem("user", JSON.stringify({
                    name: email.split("@")[0] || "User",
                    email,
                    role: data.role || "ADMIN",
                }))
                setUser(email, data.role || "ADMIN")
                setOnboardingComplete(true)

                const inviteToken = pendingInviteToken || localStorage.getItem("pending_invite_token")
                if (inviteToken) {
                    try {
                        await acceptOrganizationInviteByToken(inviteToken)
                        localStorage.removeItem("pending_invite_token")
                    } catch {
                        // invite acceptance is non-blocking for login
                    }
                }

                try {
                    const entRes = await fetch(`${API_URL}/api/v1/system/entitlements`, {
                        headers: { Authorization: `Bearer ${sessionToken}` },
                    })
                    if (entRes.ok) {
                        const ent = await entRes.json()
                        setEntitlements({
                            plan: ent.plan,
                            status: ent.status,
                            features: ent.features,
                        })
                    } else if (data.metadata?.plan) {
                        setEntitlements({
                            plan: data.metadata.plan,
                            status: data.metadata.status || "ACTIVE",
                        })
                    }
                } catch {
                    if (data.metadata?.plan) {
                        setEntitlements({
                            plan: data.metadata.plan,
                            status: data.metadata.status || "ACTIVE",
                        })
                    }
                }
                try {
                    const syncRes = await fetch(`${API_URL}/api/v1/workspace/sync-to-dashboard`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${sessionToken}` },
                    })
                    if (syncRes.ok) {
                        const syncData = await syncRes.json()
                        if (syncData && typeof syncData === "object") {
                            setResults(syncData)
                            if (syncData.dataset_id) setDatasetId(syncData.dataset_id)
                            setFileName("Enterprise Dataset")
                        }
                    }
                } catch {
                    // non-blocking: dashboard can still trigger sync
                }
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

    const featureHighlights = [
        { icon: <Brain size={18} />, label: "AI-Powered Analytics" },
        { icon: <Shield size={18} />, label: "Enterprise Security" },
        { icon: <Zap size={18} />, label: "Real-time Insights" },
    ]

    return (
        <div className="min-h-screen bg-[--background] text-[--text-primary] flex relative overflow-hidden">
            {/* Left Side — Brand Panel */}
            <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[--primary]/5 via-[--accent-violet]/5 to-[--background] items-center justify-center p-12">
                {/* Background orbs */}
                <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-[--primary]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-[--accent-violet]/8 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Link href="/" className="flex items-center gap-3 mb-10">
                            <div className="w-12 h-12 rounded-xl bg-[--gradient-primary] flex items-center justify-center font-black text-white text-xl shadow-[0_8px_24px_rgba(var(--primary-rgb),0.35)]">
                                N
                            </div>
                            <span className="text-2xl font-extrabold tracking-tighter">
                                Neural<span className="text-[--primary]">BI</span>
                            </span>
                        </Link>

                        <h2 className="text-3xl font-extrabold tracking-tight leading-tight mb-4">
                            Enterprise Decision Intelligence Platform
                        </h2>

                        <p className="text-[--text-secondary] text-sm leading-relaxed mb-10">
                            Unified AI analytics, predictive forecasting, and autonomous business insights — all in one platform.
                        </p>

                        <div className="space-y-4">
                            {featureHighlights.map((f, i) => (
                                <motion.div
                                    key={f.label}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-[--surface-1]/80 border border-[--border-subtle] backdrop-blur-sm"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-[--primary]/10 flex items-center justify-center text-[--primary]">
                                        {f.icon}
                                    </div>
                                    <span className="text-sm font-semibold text-[--text-primary]">{f.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Side — Login Form */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-md"
                >
                    {/* Mobile logo */}
                    <div className="text-center mb-8 lg:hidden">
                        <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[--gradient-primary] flex items-center justify-center font-black text-white shadow-[0_4px_16px_rgba(var(--primary-rgb),0.3)]">
                                N
                            </div>
                            <span className="text-xl font-extrabold tracking-tighter">
                                Neural<span className="text-[--primary]">BI</span>
                            </span>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[--text-primary] tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-[--text-muted] text-sm mt-2">
                            Sign in to access your NeuralBI workspace
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-5 p-3.5 rounded-xl bg-[--accent-rose]/8 border border-[--accent-rose]/15 text-[--accent-rose] text-sm font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
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
                                    className="w-4 h-4 rounded-md border border-[--border-default] accent-[--primary]"
                                    defaultChecked
                                />
                                <span className="text-[--text-muted] text-[13px]">
                                    Remember me
                                </span>
                            </label>
                            <a href="#" className="text-[--primary] text-[13px] font-medium hover:opacity-80 transition-opacity">
                                Forgot password?
                            </a>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={loading}
                            type="submit"
                            className="py-3.5"
                        >
                            Sign In
                        </Button>
                    </form>

                    <div className="my-7 flex items-center gap-3">
                        <div className="flex-1 h-px bg-[--border-subtle]" />
                        <span className="text-[11px] font-semibold text-[--text-dim] uppercase tracking-widest">or continue with</span>
                        <div className="flex-1 h-px bg-[--border-subtle]" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" size="md" fullWidth className="py-3">
                            <Chrome className="h-4 w-4" />
                            Google
                        </Button>
                        <Button variant="outline" size="md" fullWidth className="py-3">
                            <BriefcaseBusiness className="h-4 w-4" />
                            Microsoft
                        </Button>
                    </div>

                    <p className="mt-8 text-center text-sm text-[--text-muted]">
                        Don't have an account?{" "}
                        <Link
                            href="/register"
                            className="font-semibold text-[--primary] hover:opacity-80 transition-opacity"
                        >
                            Create one
                        </Link>
                    </p>

                    <p className="text-center text-[11px] text-[--text-dim] mt-4">
                        By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
