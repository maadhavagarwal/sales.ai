"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Float, MeshDistortMaterial } from "@react-three/drei"

import Scene3D from "../components/Scene3D"

const features = [
  { icon: "📊", title: "Smart Data Engineering", desc: "Auto-detect columns, clean unstructured data, and generate analysis pipelines instantly without configuring schemas." },
  { icon: "🤖", title: "AI Universal Copilot", desc: "Ask questions about your data in plain English. The Copilot writes pandas code dynamically to fetch your real answers." },
  { icon: "🔬", title: "Mathematical Simulations", desc: "Run state-of-the-art what-if scenarios for pricing and demand shifts entirely in the background." },
  { icon: "💡", title: "Generative BI Charts", desc: "No more drag and dropping. Request visualizations in English and NeuralBI will dynamically render professional charts." },
  { icon: "🚨", title: "Anomaly Detection", desc: "Our Scikit-Learn integration runs Isolation Forests automatically to flag weird statistical outliers in your business." },
  { icon: "🎯", title: "Time-Series Forecasting", desc: "NeuralBI automatically builds Random Forest models on your upload to project your revenue 30 days into the future." },
]

const pricingTiers = [
  {
    name: "Starter", price: "$49", period: "/mo", desc: "Perfect for small businesses and individuals",
    features: ["Up to 10MB CSV uploads", "Basic Power BI Visualizations", "AI Analyst Reports", "Community Support"],
    buttonLabel: "Start Free Trial", popular: false
  },
  {
    name: "Pro", price: "$149", period: "/mo", desc: "For growing teams needing advanced predictive AI",
    features: ["Up to 500MB CSV or Excel uploads", "Time-Series Forecasting", "Deep Q-Network pricing recommendations", "Saved PDF Exports", "Priority Support"],
    buttonLabel: "Upgrade to Pro", popular: true
  },
  {
    name: "Enterprise", price: "Custom", period: "", desc: "Uncapped data limits and live integrations",
    features: ["Live Database Connections (Postgres, Snowflake)", "On-Premise Deployment options", "Unlimited Multi-User Sessions", "Custom Domain & Branding"],
    buttonLabel: "Contact Sales", popular: false
  }
]

const testimonials = [
  { quote: "This platform replaced our entire legacy BI tool in a single afternoon. The Anomaly Detection saved us $15k on our first upload.", author: "Sarah Jenkins", role: "VP of Data, InnovateCorp" },
  { quote: "The ability to just ask a question in the Copilot and have it run Pandas code over 50,000 rows is literally magic.", author: "David Chen", role: "Sr. Financial Analyst, FinTech Edge" },
  { quote: "Generative BI isn't just a buzzword anymore. NeuralBI's forecasting directly informed our Q3 revenue strategy.", author: "Elena Rodriguez", role: "CEO, RetailScale" }
]

const faqs = [
  { q: "Is my uploaded data safe?", a: "Yes. All uploaded CSVs are processed dynamically in isolated sessions (UUID) and securely purged from memory after 1 hour." },
  { q: "Do I need to know Python or SQL?", a: "Absolutely not. NeuralBI is a no-code platform. The Autonomous Analyst writes the code and builds the dashboard for you." },
  { q: "Can it handle dirty data?", a: "Yes, our integrated Data Cleaner automatically scrubs NaN, infinite values, and missing gaps before presenting insights." }
]

export default function Home() {
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <main style={{ minHeight: "100vh", background: "var(--surface-0)", position: "relative", overflowX: "hidden" }}>
      {/* Background mesh gradient */}
      <div style={{ position: "fixed", inset: 0, background: "var(--gradient-mesh)", pointerEvents: "none", zIndex: 0 }} />

      {/* Navigation */}
      <nav style={{
        position: "fixed", top: 0, width: "100%", zIndex: 100,
        padding: "1rem 3rem", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: navScrolled ? "rgba(10, 10, 10, 0.85)" : "transparent",
        backdropFilter: navScrolled ? "blur(12px)" : "none",
        borderBottom: navScrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
        transition: "all 0.3s ease"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 800 }}>
          <div style={{ width: "32px", height: "32px", background: "var(--gradient-primary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "white" }}>
            AI
          </div>
          NeuralBI
        </div>
        <div style={{ display: "none", gap: "2rem", fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }} className="desktop-links">
          <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>Features</a>
          <a href="#how-it-works" style={{ color: "inherit", textDecoration: "none" }}>How it Works</a>
          <a href="#testimonials" style={{ color: "inherit", textDecoration: "none" }}>Customers</a>
          <a href="#pricing" style={{ color: "inherit", textDecoration: "none" }}>Pricing</a>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/login"><button className="btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>Login</button></Link>
          <Link href="/login"><button className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>Get Started</button></Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", zIndex: 1, padding: "8rem 3rem 4rem" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            <Scene3D />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.5} />
          </Canvas>
          {/* Subtle vignette gradient to make text pop and blend bottom seam */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 0%, rgba(3,7,18,0.8) 100%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "150px", background: "linear-gradient(to top, var(--surface-0), transparent)", pointerEvents: "none" }} />
        </div>
        <div style={{ position: "relative", zIndex: 10, maxWidth: "900px", margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span className="badge badge-success" style={{ marginBottom: "2rem", display: "inline-block", padding: "0.5rem 1rem", fontSize: "0.85rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>🚀 Enterprise v2.0 Now Live</span>
            <h1 style={{ fontSize: "clamp(3.5rem, 8vw, 6rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1.05, marginBottom: "1.5rem", textShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
              The Intelligence <br />
              <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 20px rgba(99,102,241,0.3))" }}>
                Engine.
              </span>
            </h1>
            <p style={{ fontSize: "1.25rem", color: "var(--text-secondary)", maxWidth: "650px", lineHeight: 1.6, marginBottom: "3rem", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
              Upload your raw dataset. NeuralBI instantly cleans it, runs isolation forests, predicts future revenue using machine learning, and builds an editable Next.js Power BI dashboard natively in the browser.
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Link href="/login"><button className="btn-primary" style={{ padding: "1.1rem 2.8rem", fontSize: "1.1rem", borderRadius: "30px", boxShadow: "0 10px 25px rgba(99,102,241,0.3)" }}>Start Free Trial</button></Link>
              <Link href="#how-it-works"><button className="btn-secondary" style={{ padding: "1.1rem 2.8rem", fontSize: "1.1rem", borderRadius: "30px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}>Explore Pipeline</button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.2)", padding: "2.5rem 0", position: "relative", zIndex: 1, textAlign: "center" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "1.5rem" }}>Trusted by modern enterprises worldwide</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "4rem", opacity: 0.5, flexWrap: "wrap", filter: "grayscale(100%)" }}>
          {["ACME Corp", "Stark Industries", "Wayne Enterprises", "Initech", "Massive Dynamic"].map(logo => (
            <span key={logo} style={{ fontSize: "1.25rem", fontWeight: 900 }}>{logo}</span>
          ))}
        </div>
      </section>

      {/* Product Preview Section */}
      <section style={{ position: "relative", zIndex: 1, padding: "4rem 3rem", overflow: "hidden" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="glass-card"
            style={{
              width: "100%",
              aspectRatio: "16/9",
              background: "rgba(10, 10, 10, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "24px",
              padding: "1rem",
              boxShadow: "0 0 80px rgba(99, 102, 241, 0.15)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Mock Dashboard UI Header */}
            <div style={{ height: "40px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "1rem", padding: "0 1rem" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff5f56" }} />
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ffbd2e" }} />
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#27c93f" }} />
              </div>
              <div style={{ height: "16px", width: "120px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }} />
            </div>

            {/* Mock Sidebar & Content Grid */}
            <div style={{ display: "flex", height: "calc(100% - 40px)" }}>
              <div style={{ width: "180px", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "1.5rem" }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ height: "12px", width: "100%", background: i === 1 ? "var(--gradient-primary)" : "rgba(255,255,255,0.05)", borderRadius: "3px", marginBottom: "1rem" }} />
                ))}
              </div>
              <div style={{ flex: 1, padding: "2rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: "1.5rem" }}>
                <div style={{ gridColumn: "span 3", display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ height: "24px", width: "200px", background: "rgba(255,255,255,0.1)", borderRadius: "6px" }} />
                  <div style={{ height: "36px", width: "120px", background: "var(--gradient-primary)", borderRadius: "8px" }} />
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }} />
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }} />
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }} />
                <div style={{ gridColumn: "span 2", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-end", padding: "1.5rem", gap: "0.5rem" }}>
                  {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ delay: i * 0.1 + 1, duration: 1 }}
                      style={{ flex: 1, background: "var(--gradient-primary)", borderRadius: "4px 4px 0 0", opacity: 0.8 }}
                    />
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }} />
              </div>
            </div>

            {/* Floating Info Overlay */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              style={{
                position: "absolute", bottom: "10%", right: "5%",
                background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)",
                padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--primary-500)",
                maxWidth: "280px", boxShadow: "var(--shadow-glow)"
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem" }}>✓</div>
                <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>AI Analysis Complete</p>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Found 3 revenue anomalies in East Region. Forecasted 12% growth for Q3.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ position: "relative", zIndex: 1, padding: "8rem 3rem", maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
        <span className="badge badge-primary" style={{ marginBottom: "1rem", display: "inline-flex" }}>The Pipeline</span>
        <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: "4rem" }}>From raw CSV to boardroom-ready in seconds.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "2rem" }}>
          {[
            { step: "1", title: "Upload Data", desc: "Drop any messy CSV file. Our schema-mapper auto-identifies what column is revenue, item, or date." },
            { step: "2", title: "AI Analysis", desc: "Scikit-Learn predicts future metrics and detects anomalies while deep learning generates pricing tweaks." },
            { step: "3", title: "Export Dashboard", desc: "Drag and drop your generated charts. Export precisely what you need into a static PDF report instantly." }
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }} className="glass-card" style={{ padding: "2.5rem" }}>
              <div style={{ width: "60px", height: "60px", background: "var(--gradient-primary)", borderRadius: "50%", margin: "0 auto 1.5rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 900 }}>{s.step}</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>{s.title}</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ position: "relative", zIndex: 1, padding: "6rem 3rem", background: "rgba(0,0,0,0.15)", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <span className="badge badge-primary" style={{ marginBottom: "1rem", display: "inline-flex" }}>Engine Capabilities</span>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800 }}>Powered by Deep Learning</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-card" style={{ padding: "2rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>{f.title}</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ position: "relative", zIndex: 1, padding: "8rem 3rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, textAlign: "center", marginBottom: "4rem" }}>Loved by Data Leaders</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          {testimonials.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }} className="glass-card" style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <p style={{ fontSize: "1rem", lineHeight: 1.6, fontStyle: "italic", marginBottom: "2rem" }}>"{t.quote}"</p>
              <div>
                <p style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--primary-400)" }}>{t.author}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ position: "relative", zIndex: 1, padding: "6rem 3rem", background: "rgba(0,0,0,0.15)", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <span className="badge badge-success" style={{ marginBottom: "1rem", display: "inline-flex" }}>Pricing</span>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800 }}>Simple, transparent pricing</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", alignItems: "center" }}>
            {pricingTiers.map((tier, i) => (
              <motion.div key={tier.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-card" style={{ padding: "2.5rem 2rem", position: "relative", border: tier.popular ? "2px solid var(--primary-500)" : "1px solid var(--border-subtle)", transform: tier.popular ? "scale(1.05)" : "scale(1)", zIndex: tier.popular ? 10 : 1 }}>
                {tier.popular && <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "var(--gradient-primary)", padding: "4px 16px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "white", textTransform: "uppercase" }}>Most Popular</div>}
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "white" }}>{tier.name}</h3>
                <div style={{ marginBottom: "1rem" }}><span style={{ fontSize: "2.5rem", fontWeight: 800 }}>{tier.price}</span><span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>{tier.period}</span></div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "2rem", minHeight: "2.5rem" }}>{tier.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2.5rem 0", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  {tier.features.map(f => <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}><span style={{ color: "var(--accent-emerald)" }}>✓</span> {f}</li>)}
                </ul>
                <Link href="/login" style={{ display: "block" }}>
                  <button className={tier.popular ? "btn-primary" : "btn-secondary"} style={{ width: "100%", padding: "0.875rem", fontSize: "0.9rem" }}>{tier.buttonLabel}</button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ position: "relative", zIndex: 1, padding: "8rem 3rem", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(2rem, 3.5vw, 2.5rem)", fontWeight: 800, textAlign: "center", marginBottom: "3rem" }}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{f.q}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Massive CTA */}
      <section style={{ position: "relative", zIndex: 1, padding: "6rem 3rem", textAlign: "center", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ position: "absolute", inset: 0, background: "var(--gradient-primary)", opacity: 0.1, zIndex: 0 }} />
        <h2 style={{ fontSize: "clamp(2rem, 3vw, 2.75rem)", fontWeight: 900, marginBottom: "1.5rem", position: "relative", zIndex: 1 }}>Ready to harness your data?</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: "2rem", position: "relative", zIndex: 1 }}>Join 1,000+ forward-thinking startups utilizing NeuralBI today.</p>
        <Link href="/login" style={{ position: "relative", zIndex: 1 }}>
          <button className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.1rem" }}>Create your workspace</button>
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: "#050505", borderTop: "1px solid var(--border-subtle)", padding: "4rem 3rem 2rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "3rem", marginBottom: "4rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800, marginBottom: "1rem", color: "white" }}>
              <div style={{ width: "24px", height: "24px", background: "var(--gradient-primary)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "white" }}>AI</div>
              NeuralBI
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>Building the ultimate Generative Business Intelligence platform. Upload your data, and let AI do the rest.</p>
          </div>
          <div>
            <h4 style={{ color: "white", fontWeight: 700, marginBottom: "1rem", fontSize: "0.95rem" }}>Product</h4>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>AI Copilot</a></li>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Predictive ML</a></li>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Anomaly Detection</a></li>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Enterprise Security</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: "white", fontWeight: 700, marginBottom: "1rem", fontSize: "0.95rem" }}>Company</h4>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>About Us</a></li>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Careers</a></li>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Blog</a></li>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Contact Sales</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: "white", fontWeight: 700, marginBottom: "1rem", fontSize: "0.95rem" }}>Legal</h4>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Privacy Policy</a></li>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Terms of Service</a></li>
              <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Security Whitepaper</a></li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "2rem" }}>
          © {new Date().getFullYear()} NeuralBI Platform. All rights reserved. Built with Next.js and FastAPI.
        </div>
      </footer>
    </main>
  )
}