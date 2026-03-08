"use client"

import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { useState, useEffect, useRef } from "react"

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9])
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="landing-container" style={{ minHeight: "100vh", background: "#020617", color: "white", overflowX: "hidden", fontFamily: "inherit" }}>
      {/* Ultra-Premium Glass Background Elements */}
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: "70vw", height: "70vw", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-10%", width: "80vw", height: "80vw", background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "40%", left: "50%", transform: "translateX(-50%)", width: "100vw", height: "100vh", background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 60%)", zIndex: 0, pointerEvents: "none" }} />

      {/* Cinematic Navigation */}
      <nav style={{
        position: "fixed", top: 0, width: "100%", zIndex: 1000,
        padding: scrolled ? "1rem 6rem" : "2rem 6rem",
        background: scrolled ? "rgba(2,6,23,0.8)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,1)" : "1px solid transparent",
        transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "12px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: "1rem", boxShadow: "0 0 30px rgba(99,102,241,0.4)"
          }}>N</div>
          <span style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.04em" }}>NeuralBI<span style={{ color: "#6366f1" }}>.</span></span>
        </motion.div>

        <div style={{ display: "flex", alignItems: "center", gap: "3.5rem" }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: "2.5rem", fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
            <span style={{ cursor: "pointer", transition: "color 0.3s" }} className="hover-glow">Neural Engine</span>
            <span style={{ cursor: "pointer", transition: "color 0.3s" }} className="hover-glow">Workplace</span>
            <span style={{ cursor: "pointer", transition: "color 0.3s" }} className="hover-glow">Compliance</span>
          </motion.div>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "0.8rem 2.2rem", borderRadius: "100px", fontSize: "0.9rem", fontWeight: 800,
                background: "white", color: "#020617", border: "none", cursor: "pointer",
                boxShadow: "0 10px 20px rgba(255,255,255,0.1)"
              }}
            >
              Log In
            </motion.button>
          </Link>
        </div>
      </nav>

      {/* Cinematic Hero */}
      <section ref={targetRef} style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 2rem" }}>
        <motion.div style={{ opacity, scale, y }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: "100px",
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
              fontSize: "0.8rem", fontWeight: 800, color: "#818cf8",
              letterSpacing: "0.15em", marginBottom: "2.5rem", textTransform: "uppercase"
            }}
          >
            Modern Operational Intelligence
          </motion.div>

          <h1 style={{
            fontSize: "clamp(3.5rem, 9vw, 6.5rem)", fontWeight: 950,
            lineHeight: 0.95, letterSpacing: "-0.06em",
            background: "linear-gradient(to bottom, #ffffff 40%, rgba(255,255,255,0.6) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: "2rem"
          }}>
            Synthesized Growth.<br />
            Professional Control.
          </h1>

          <p style={{
            fontSize: "1.4rem", color: "rgba(255,255,255,0.6)",
            maxWidth: "800px", margin: "0 auto 4rem",
            lineHeight: 1.5, fontWeight: 400
          }}>
            The unified business workstation for Deep-RL simulation,
            statutory Indian billing, and synchronized multi-channel acquisition.
          </p>

          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <motion.button
                whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(99,102,241,0.5)" }}
                style={{
                  padding: "1.25rem 3.5rem", borderRadius: "16px", fontSize: "1.1rem", fontWeight: 900,
                  background: "#6366f1", color: "white", border: "none", cursor: "pointer"
                }}
              >
                Start Your Sessions
              </motion.button>
            </Link>
            <Link href="/workspace" style={{ textDecoration: "none" }}>
              <motion.button
                whileHover={{ background: "rgba(255,255,255,0.08)", y: -5 }}
                style={{
                  padding: "1.25rem 3.5rem", borderRadius: "16px", fontSize: "1.1rem", fontWeight: 900,
                  background: "rgba(255,255,255,0.03)", color: "white",
                  border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer"
                }}
              >
                Explore Workplace
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Floating UI Elements Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 50 }}
          transition={{ delay: 0.6, duration: 1 }}
          style={{
            width: "100%", maxWidth: "1200px", marginTop: "4rem",
            padding: "1rem", borderRadius: "32px", background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(40px)",
            boxShadow: "0 100px 200px rgba(0,0,0,0.6)", position: "relative"
          }}
        >
          <div style={{ width: "100%", aspectRatio: "16/9", background: "#030712", borderRadius: "24px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ padding: "2rem", height: "100%", display: "flex", flexFlow: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f56" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27c93f" }} />
                </div>
                <div style={{ width: "200px", height: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "100px" }} />
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2rem" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "20px" }} />
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "20px" }} />
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "20px" }} />
              </div>
            </div>
          </div>
          {/* Floating Glows */}
          <div style={{ position: "absolute", top: "-50px", right: "10%", width: "200px", height: "200px", background: "#6366f1", borderRadius: "50%", filter: "blur(120px)", opacity: 0.3, zIndex: -1 }} />
        </motion.div>
      </section>

      {/* Feature Innovation Deck */}
      <section style={{ position: "relative", zIndex: 10, padding: "12rem 2rem", maxWidth: "1300px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "6rem" }}>
          <h2 style={{ fontSize: "3rem", fontWeight: 900, marginBottom: "1.5rem" }}>Operational Synthesis.</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>Fragmentation is the enemy of enterprise. NeuralBI is the cure.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem" }}>
          <InnovationCard
            icon="🧬"
            title="Deep-RL Simulations"
            tags={["Autonomous", "Neural"]}
            description="Our neural engine simulates thousands of business actions per second to identify absolute revenue optimality and margin stability."
            accent="#6366f1"
          />
          <InnovationCard
            icon="📜"
            title="Statutory Precision"
            tags={["GST", "HSN/SAC"]}
            description="The only platform designed for Indian statutory excellence. Automated CGST/SGST/IGST breakdown with audit-ready ledgers."
            accent="#10b981"
          />
          <InnovationCard
            icon="📈"
            title="Growth Hub"
            tags={["ROAS", "Attribution"]}
            description="Synchronize your marketing spend across every leading platform. Track real-time ROI against your core financial dataset."
            accent="#06b6d4"
          />
        </div>
      </section>

      {/* Trust Section */}
      <section style={{ position: "relative", zIndex: 10, padding: "8rem 2rem", textAlign: "center", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "4rem" }}>Global Enterprise Standards</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "6rem", opacity: 0.4, flexWrap: "wrap", filter: "grayscale(1)" }}>
          {["ACME CORP", "SYNERGY", "LUMINA", "VERTEX", "NEXUS"].map(n => <span key={n} style={{ fontSize: "1.5rem", fontWeight: 900 }}>{n}</span>)}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ position: "relative", zIndex: 10, padding: "12rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 950, marginBottom: "2.5rem" }}>Elevate your business logic.</h2>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            style={{
              padding: "1.5rem 4.5rem", borderRadius: "20px", fontSize: "1.2rem", fontWeight: 900,
              background: "white", color: "black", border: "none"
            }}
          >
            Initialize Platform
          </motion.button>
        </Link>
      </section>

      {/* Cinematic Footer */}
      <footer style={{ position: "relative", zIndex: 10, padding: "8rem 6rem 4rem", borderTop: "1px solid rgba(255,255,255,0.05)", background: "#01040f" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: "6rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>N</div>
              <span style={{ fontSize: "1.4rem", fontWeight: 900 }}>NeuralBI<span style={{ color: "#6366f1" }}>.</span></span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.6, maxWidth: "350px" }}>
              Redefining business operations for the computational age. From data upload to statutory audit.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 800, marginBottom: "2rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Product</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
              <span>Simulators</span>
              <span>Statutory Billing</span>
              <span>Marketing Hub</span>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 800, marginBottom: "2rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Legal</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
              <span>Terms</span>
              <span>Privacy</span>
              <span>Compliance</span>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 800, marginBottom: "2rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Connect</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
              <span>Executive Support</span>
              <span>Documentation</span>
              <span>System Status</span>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: "1400px", margin: "8rem auto 0", textAlign: "center", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          © 2026 NeuralBI Enterprise Suite. Built for Statutory Excellence.
        </div>
      </footer>
    </div>
  )
}

function InnovationCard({ icon, title, tags, description, accent }: any) {
  return (
    <motion.div
      whileHover={{ y: -12, background: "rgba(255,255,255,0.03)", borderColor: accent + "40" }}
      style={{
        padding: "4rem", borderRadius: "36px",
        background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)",
        transition: "all 0.5s cubic-bezier(0.19, 1, 0.22, 1)", textAlign: "left"
      }}
    >
      <div style={{
        width: "70px", height: "70px", borderRadius: "20px",
        background: accent + "15", border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "2.5rem", marginBottom: "2.5rem"
      }}>
        {icon}
      </div>

      <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1.5rem" }}>
        {tags.map((t: string) => (
          <span key={t} style={{ fontSize: "0.7rem", fontWeight: 800, color: accent, background: accent + "10", padding: "0.4rem 0.9rem", borderRadius: "100px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{t}</span>
        ))}
      </div>

      <h3 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: "1.5rem" }}>{title}</h3>
      <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{description}</p>
    </motion.div>
  )
}