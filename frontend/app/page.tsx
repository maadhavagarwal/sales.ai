"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
import { Button, Card, Container } from "@/components/ui"
import Navbar from "@/components/marketing/Navbar"
import Footer from "@/components/marketing/Footer"

function BentoFeature({
  title,
  description,
  icon,
  className = "",
  delay = 0
}: {
  title: string;
  description: string;
  icon: string;
  className?: string;
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0, 0, 1] }}
      viewport={{ once: true, margin: "-50px" }}
      className={className}
    >
      <div className="h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 hover:border-[--primary]/50 transition-colors group relative overflow-hidden flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-[--primary]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            {icon}
          </div>
          <h3 className="text-2xl font-black mb-4 text-white tracking-tight leading-snug">{title}</h3>
          <p className="text-[--text-secondary] text-sm font-medium leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  )
}

function Metric({ value, label }: { value: string, label: string }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="text-4xl md:text-5xl font-black text-white tracking-tighter" style={{ textShadow: "0 0 40px rgba(255,255,255,0.2)" }}>{value}</div>
            <div className="text-xs font-bold text-[--primary] uppercase tracking-widest">{label}</div>
        </div>
    )
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, 200])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <div className="min-h-screen bg-[--background] selection:bg-[--primary] selection:text-white">
      {/* Abstract Animated Background Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[--primary]/20 blur-[150px] rounded-full mix-blend-screen animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-[--accent-violet]/20 blur-[150px] rounded-full mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-[--secondary]/10 blur-[150px] rounded-full mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-52 pb-32 overflow-hidden z-10">
        <Container>
          <div className="text-center max-w-5xl mx-auto relative px-4 flex flex-col items-center">
            
            <a href="https://github.com/maadhavagarwal/sales.ai" target="_blank" rel="noopener noreferrer">
                <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 mb-12 shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group"
                >
                <span className="flex h-2.5 w-2.5 rounded-full bg-[--accent-cyan] shadow-[0_0_10px_var(--accent-cyan)] animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white">
                    NeuralBI Enterprise 2.4 Released
                </span>
                <span className="text-white/40 group-hover:text-white transition-colors">→</span>
                </motion.div>
            </a>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8, ease: [0.2, 0, 0, 1] }}
              className="text-5xl md:text-7xl lg:text-[5.5rem] font-black mb-8 leading-[1.05] tracking-tight text-white font-jakarta z-20"
            >
              Master Your Capital. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[--primary] via-[--accent-violet] to-[--accent-cyan] pb-2 inline-block">
                Own Your Growth.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.2, 0, 0, 1] }}
              className="text-xl md:text-2xl text-[--text-secondary] mb-14 max-w-3xl mx-auto leading-relaxed font-medium"
            >
              Transform complex financial datasets into actionable board-ready intelligence. NeuralBI fuses predictive analytics with enterprise ERP synchronization.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 justify-center w-full sm:w-auto z-20"
            >
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="pro" size="xl" className="w-full sm:w-auto px-12 py-6 text-lg tracking-wide shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                   Launch Platform
                </Button>
              </Link>
              <Link href="/demo" className="w-full sm:w-auto">
                <Button variant="outline" size="xl" className="w-full sm:w-auto px-12 py-6 text-lg font-bold bg-white/5 border-white/10 hover:bg-white/10 text-white">
                  Book a Demo
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Abstract Dashboard Terminal Impression */}
          <motion.div
            style={{ y, opacity }}
            className="mt-40 max-w-[1200px] mx-auto relative z-10"
          >
            <div className="absolute -inset-10 bg-gradient-to-b from-[--primary]/20 via-[--secondary]/10 to-transparent blur-3xl rounded-[3rem] opacity-50" />
            
            <div className="relative rounded-[2rem] border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-2xl shadow-2xl overflow-hidden p-[1px]">
                {/* Glow Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] z-0" />
                
                <div className="relative z-10 bg-[#050505] rounded-[2rem] overflow-hidden">
                    {/* Fake Mac Toolbar */}
                    <div className="bg-[#111] p-4 border-b border-white/5 flex items-center gap-4">
                        <div className="flex gap-2.5 ml-2">
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-700/50 border border-slate-600/30" />
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-700/50 border border-slate-600/30" />
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-700/50 border border-slate-600/30" />
                        </div>
                        <div className="bg-white/5 py-1.5 px-32 rounded-lg border border-white/5 font-mono text-[10px] text-[--text-muted] mx-auto text-center font-bold tracking-[0.2em] uppercase">
                            neuralbi.enterprise / workspace / stream
                        </div>
                    </div>
                    {/* Simulated Interface */}
                    <div className="p-8 md:p-12 h-[32rem] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-[#050505] to-transparent z-10" />
                        
                        <div className="grid grid-cols-4 gap-8 mb-12">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                    <div className="h-2 w-16 bg-white/20 rounded-full mb-6" />
                                    <div className="text-4xl font-black text-white/80 mb-2">
                                        {i === 1 && "$4.2M"}
                                        {i === 2 && "+12.4%"}
                                        {i === 3 && "$850K"}
                                        {i === 4 && "94.2%"}
                                    </div>
                                    <div className="h-1.5 w-full bg-gradient-to-r from-[--primary]/50 to-transparent rounded-full" />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-10">
                            <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-8 h-64 flex items-end gap-3 justify-between">
                                {[40, 70, 45, 90, 65, 80, 55, 95, 75, 40, 60, 85].map((h, i) => (
                                    <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ delay: i * 0.05 + 0.8, duration: 1, ease: "easeOut" }}
                                    className="w-full bg-gradient-to-t from-[--primary]/20 to-[--primary] rounded-t-sm"
                                    />
                                ))}
                            </div>
                            <div className="w-1/3 bg-white/5 border border-white/5 rounded-2xl p-8 h-64 hidden lg:block">
                                <div className="space-y-6">
                                    <div className="h-4 w-3/4 bg-white/10 rounded-full" />
                                    <div className="h-4 w-1/2 bg-white/10 rounded-full" />
                                    <div className="h-4 w-5/6 bg-white/10 rounded-full" />
                                    <div className="h-4 w-2/3 bg-white/10 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Corporate Proof Section */}
      <section className="py-24 border-y border-white/5 bg-black/40 relative z-10">
        <Container>
            <div className="flex flex-col md:flex-row justify-around items-center gap-12 text-center md:text-left">
                <Metric value="$4.2B+" label="Capital Managed" />
                <div className="w-full h-px md:w-px md:h-16 bg-white/10" />
                <Metric value="99.9%" label="Statutory Accuracy" />
                <div className="w-full h-px md:w-px md:h-16 bg-white/10" />
                <Metric value="< 50ms" label="Inference Latency" />
            </div>
        </Container>
      </section>

      {/* Feature Grid Section (Bento Style) */}
      <section id="platform" className="py-40 relative z-10">
        <Container>
          <div className="mb-24 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-white leading-tight font-jakarta"> 
                Infrastructure for <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[--primary] to-[--accent-cyan]">Unfair Advantages.</span>
            </h2>
            <p className="text-[--text-secondary] text-lg font-medium leading-relaxed">
                We've combined rigorous double-entry ledgers with deep reinforcement learning protocols. This isn't just visualization; it's an algorithmic CFO.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 auto-rows-[300px]">
            <BentoFeature
              className="md:col-span-7 lg:col-span-8"
              title="Statutory AI Engine"
              description="Hierarchical P&L, Balance Sheets, and GST Compliance mapped autonomously from raw unified transactions. Eradicate manual tagging and achieve zero-error statutory closing periods."
              icon="⚖️"
              delay={0.1}
            />
            <BentoFeature
              className="md:col-span-5 lg:col-span-4"
              title="Predictive Inventory"
              description="Deep-Q Network (DQN) driven autonomous burn-rate forecasting and restock quantum recommendations preventing stockouts."
              icon="📦"
              delay={0.2}
            />
            <BentoFeature
              className="md:col-span-5 lg:col-span-4"
              title="Live ERP Sync"
              description="Bi-directional WebSocket streaming integrations parsing Bills, Invoices, Expenses, and Journals directly into the knowledge graph in real-time."
              icon="⚡"
              delay={0.3}
            />
            <BentoFeature
              className="md:col-span-7 lg:col-span-8"
              title="Quantum Strategic Copilot"
              description="A true strategic partner with RAG-enabled memory. Query your enterprise data in natural language, ask for liquidity assessments, and receive complex multi-horizon board directives instantly."
              icon="🧠"
              delay={0.4}
            />
          </div>
        </Container>
      </section>

      {/* Enterprise CTA Section */}
      <section className="py-40 relative overflow-hidden flex items-center z-10 border-t border-white/5">
        <div className="absolute inset-0 bg-[--primary]/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-radial from-[--primary]/20 to-transparent opacity-50 pointer-events-none rounded-full blur-[100px]" />
        
        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto text-center bg-black/40 backdrop-blur-2xl border border-white/10 p-16 md:p-24 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1] text-white font-jakarta">
                Deploy Institutional <br/>Intelligence Today.
            </h2>
            <p className="text-xl text-[--text-secondary] mb-12 max-w-2xl mx-auto font-medium">
                Join high-growth tech firms and modern enterprises consolidating their financial stack onto NeuralBI.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/dashboard">
                <Button size="xl" variant="pro" className="px-14 py-6 text-lg tracking-widest uppercase font-bold w-full sm:w-auto">Start Autonomous Trial</Button>
              </Link>
              <Button size="xl" variant="outline" className="px-14 py-6 text-lg tracking-widest uppercase font-bold bg-white/5 border-white/10 hover:bg-white/10 text-white w-full sm:w-auto">Contact Sales</Button>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}
