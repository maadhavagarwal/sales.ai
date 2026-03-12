"use client"

import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { Button, Card, Container } from "@/components/ui"

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors relative group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[--primary] transition-all group-hover:w-full" />
    </Link>
  )
}

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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className={className}
    >
      <Card variant="bento" padding="lg" className="h-full">
        <div className="text-3xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-2 text-gradient">{title}</h3>
        <p className="text-[--text-secondary] text-sm leading-relaxed">{description}</p>
      </Card>
    </motion.div>
  )
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <div className="min-h-screen bg-[--background] selection:bg-[--primary] selection:text-white">
      {/* Dynamic Background Blobs */}
      <div className="blob-container">
        <div className="blob" style={{ top: '10%', left: '10%', background: 'var(--primary)', opacity: 0.15 }} />
        <div className="blob" style={{ bottom: '20%', right: '10%', background: 'var(--accent-violet)', opacity: 0.1, animationDelay: '-5s' }} />
        <div className="blob" style={{ top: '40%', right: '30%', background: 'var(--secondary)', opacity: 0.08, animationDelay: '-10s' }} />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-[--border-subtle] glass-pro">
        <Container>
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[--radius-sm] bg-[--primary] flex items-center justify-center font-black text-white shadow-[--shadow-glow] rotate-3 hover:rotate-0 transition-transform">
                N
              </div>
              <span className="text-xl font-bold tracking-tight text-[--text-primary]">
                Neural<span className="text-[--primary]">BI</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-10">
              <NavItem href="#features">Features</NavItem>
              <NavItem href="#solutions">Solutions</NavItem>
              <NavItem href="#pricing">Pricing</NavItem>
              <NavItem href="#docs">Docs</NavItem>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="pro" size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </Container>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-44 pb-32 overflow-hidden">
        <Container>
          <div className="text-center max-w-5xl mx-auto relative z-10 w-full px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[--surface-1] border border-[--border-strong] mb-10 shadow-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-[--accent-emerald] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[--text-secondary]">
                The Future of Sales Intelligence
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8, ease: [0.2, 0, 0, 1] }}
              className="text-4xl md:text-6xl font-extrabold mb-8 leading-[1.15] tracking-tight text-white"
            >
              Master Your Capital. <br />
              <span className="text-gradient-primary">Own Your Statutory Growth.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-lg md:text-xl text-[--text-secondary] mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              NeuralBI transforms complex financial datasets into board-ready statutory intelligence.
              From predictive logistics to autonomous BRS, built for teams who demand zero-error accounting.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-5 justify-center"
            >
              <Link href="/dashboard">
                <Button variant="primary" size="lg" className="px-10 py-5 text-lg">
                  Launch Platform
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-10 py-5 text-lg">
                View Enterprise Demo
              </Button>
            </motion.div>
          </div>

          {/* Abstract Dashboard Preview */}
          <motion.div
            style={{ y, opacity }}
            className="mt-32 max-w-6xl mx-auto relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-[--primary] to-[--secondary] opacity-10 blur-3xl rounded-full" />
            <Card variant="glass" padding="none" className="border-[--border-strong] shadow-2xl relative">
              <div className="bg-[--surface-0]/40 p-4 border-b border-[--border-subtle] flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[--text-muted] font-bold">platform.neural-bi.analytics</div>
                <div className="w-10" />
              </div>
              <div className="p-8 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-3">
                      <div className="h-2 w-16 bg-[--surface-3] rounded-full" />
                      <div className="h-8 w-24 bg-[--text-primary] rounded-lg opacity-10" />
                      <div className="h-1.5 w-full bg-[--surface-3] rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="h-64 bg-gradient-to-t from-[--surface-2] to-transparent rounded-2xl border border-[--border-subtle] flex items-center justify-center">
                  <div className="flex gap-4 items-end h-32">
                    {[40, 70, 45, 90, 65, 80, 55, 95, 75].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.1 + 0.5, duration: 1 }}
                        className="w-8 bg-[--primary]/20 border-t-2 border-[--primary] rounded-t-sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </Container>
      </section>

      {/* Feature Grid Section (Bento Style) */}
      <section id="features" className="py-32 relative">
        <Container>
          <div className="mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight"> Engineered for <br /><span className="text-[--primary]">Performance.</span></h2>
            <p className="text-[--text-secondary] max-w-xl">Our specialized AI engine processes millions of data points to deliver crystal-clear insights in milliseconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[240px]">
            <BentoFeature
              className="md:col-span-8"
              title="Statutory AI Engine"
              description="Hierarchical P&L, Balance Sheets, and GST Compliance mapped autonomously from your transactions. No manual categorization required."
              icon="⚖️"
              delay={0.1}
            />
            <BentoFeature
              className="md:col-span-4"
              title="Predictive Logistics"
              description="Autonomous burn-rate forecasting and restock quantum recommendations."
              icon="🚛"
              delay={0.2}
            />
            <BentoFeature
              className="md:col-span-4"
              title="Autonomous BRS"
              description="Neural matching of bank statements to statutory ledgers."
              icon="🏦"
              delay={0.3}
            />
            <BentoFeature
              className="md:col-span-8"
              title="Recursive AI Copilot"
              description="A true strategic partner. Our Copilot understands your tax liability, operational overheads, and inventory risks deeply."
              icon="🧠"
              delay={0.4}
            />
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-[--surface-1] border-y border-[--border-subtle] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <Container className="relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-10 leading-tight">Ready to elevate your <br /> sales strategy?</h2>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Button size="xl" variant="primary">Start Free Trial</Button>
              <Button size="xl" variant="outline">Schedule Consultation</Button>
            </div>
            <p className="mt-8 text-[--text-muted] text-sm font-medium uppercase tracking-[0.2em]">Trusted by 500+ global enterprises</p>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-[--border-subtle] relative overflow-hidden">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-[--radius-xs] bg-[--primary] flex items-center justify-center font-black text-white">N</div>
                <span className="text-lg font-bold">NeuralBI</span>
              </Link>
              <p className="text-[--text-secondary] text-sm max-w-xs leading-relaxed">
                Empowering businesses with AI-driven financial intelligence and autonomous sales optimization software.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-[--text-muted]">Product</h4>
              <ul className="space-y-4 text-sm text-[--text-secondary]">
                <li><NavItem href="#">Analytics</NavItem></li>
                <li><NavItem href="#">Simulation</NavItem></li>
                <li><NavItem href="#">Integration</NavItem></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-[--text-muted]">Company</h4>
              <ul className="space-y-4 text-sm text-[--text-secondary]">
                <li><NavItem href="#">About Us</NavItem></li>
                <li><NavItem href="#">Careers</NavItem></li>
                <li><NavItem href="#">Privacy</NavItem></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-[--text-muted]">Social</h4>
              <ul className="space-y-4 text-sm text-[--text-secondary]">
                <li><NavItem href="#">Twitter</NavItem></li>
                <li><NavItem href="#">LinkedIn</NavItem></li>
                <li><NavItem href="#">GitHub</NavItem></li>
              </ul>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-[--border-subtle] flex flex-col md:flex-row justify-between items-center gap-5">
            <p className="text-[--text-muted] text-xs font-mono">© 2026 NeuralBI. SYSTEM STATUS: OPERATIONAL</p>
            <div className="flex gap-8">
              <span className="text-[--text-muted] text-xs uppercase font-bold tracking-widest hover:text-[--primary] cursor-pointer transition-colors">v2.4.0-Stable</span>
              <span className="text-[--text-muted] text-xs uppercase font-bold tracking-widest hover:text-[--primary] cursor-pointer transition-colors">Region: Global</span>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  )
}
