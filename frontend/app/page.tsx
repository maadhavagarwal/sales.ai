"use client"

import Link from "next/link"
import { Button, Card, Container } from "@/components/ui"
import Navbar from "@/components/marketing/Navbar"
import Footer from "@/components/marketing/Footer"
import { ArrowRight, Brain, Shield, Zap, BarChart3, Bot, Globe, Database, TrendingUp, Code2, Cpu, Sparkles, CheckCircle2, Gauge, Lock, Play } from "lucide-react"
import { useState, useEffect } from "react"

const features = [
  {
    title: "Neural Data Orchestration",
    description: "Unified ERP backbone with real-time ML streaming. Multi-tenant architecture supporting 1000+ organizations.",
    icon: <Database className="w-7 h-7" />,
    gradient: "from-cyan-500/30 to-blue-500/20",
    iconColor: "text-cyan-400",
    badge: "Real-time"
  },
  {
    title: "Predictive ML Engine",
    description: "ARIMA + Prophet forecasting. Anomaly detection with 94% accuracy. Churn prediction at scale.",
    icon: <TrendingUp className="w-7 h-7" />,
    gradient: "from-emerald-500/30 to-teal-500/20",
    iconColor: "text-emerald-400",
    badge: "ML-Powered"
  },
  {
    title: "Autonomous AI Copilot",
    description: "Text-to-SQL NLBI engine. RAG-powered context retrieval. Generates insights in milliseconds.",
    icon: <Bot className="w-7 h-7" />,
    gradient: "from-violet-500/30 to-purple-500/20",
    iconColor: "text-violet-400",
    badge: "AI-Native"
  },
  {
    title: "Zero-Trust Compliance",
    description: "GST auto-journalization. E-invoicing with IRN generation. Immutable audit trails with blockchain linkage.",
    icon: <Lock className="w-7 h-7" />,
    gradient: "from-rose-500/30 to-orange-500/20",
    iconColor: "text-rose-400",
    badge: "Gov-Ready"
  },
]

const stats = [
  { value: "94%", label: "ML Accuracy", icon: <Cpu size={20} /> },
  { value: "< 200ms", label: "Query Latency", icon: <Zap size={20} /> },
  { value: "32 Tables", label: "Enterprise Schema", icon: <Database size={20} /> },
]

const capabilities = [
  "Text-to-SQL NLBI",
  "Predictive Forecasting",
  "Anomaly Detection",
  "GST Compliance",
  "E-Invoice Generation",
  "Churn Prediction",
  "RFM Segmentation",
  "Auto-Journalization",
  "Real-time KPIs",
  "Multi-tenant",
  "Zero-trust Security",
  "Audit Immutability",
]

const processSteps = [
  { step: "01", title: "Upload Data", desc: "CSV, Excel, or API integration" },
  { step: "02", title: "Auto-Learn", desc: "ML pipeline processes in seconds" },
  { step: "03", title: "Query Naturally", desc: "Ask questions in plain English" },
  { step: "04", title: "Act Instantly", desc: "Auto-journalize and export results" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-slate-50 relative overflow-hidden">
      <style>{`
        @keyframes float-orb-1 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(50px) translateX(30px); }
          50% { transform: translateY(0px) translateX(0px); }
          75% { transform: translateY(-50px) translateX(-30px); }
        }
        
        @keyframes float-orb-2 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-50px) translateX(-30px); }
          50% { transform: translateY(0px) translateX(0px); }
          75% { transform: translateY(50px) translateX(30px); }
        }
        
        @keyframes float-orb-3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(40px); }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes progress-slide {
          0% { width: 0%; }
          100% { width: 72%; }
        }
        
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .orb-1 { animation: float-orb-1 8s ease-in-out infinite; }
        .orb-2 { animation: float-orb-2 10s ease-in-out infinite; animation-delay: 1s; }
        .orb-3 { animation: float-orb-3 12s ease-in-out infinite; animation-delay: 2s; }
        
        .fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
        .fade-in-up:nth-child(2) { animation-delay: 0.1s; }
        .fade-in-up:nth-child(3) { animation-delay: 0.2s; }
        .fade-in-up:nth-child(4) { animation-delay: 0.3s; }
        .fade-in-up:nth-child(5) { animation-delay: 0.4s; }
        .fade-in-up:nth-child(6) { animation-delay: 0.5s; }
        
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        .progress-bar { animation: progress-slide 2s ease-out forwards 0.5s; }
        .scale-in { animation: scale-in 0.6s ease-out forwards; }
      `}</style>

      {/* Subtle background - minimal approach */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-700/5 rounded-full blur-3xl" />
      </div>

      <Navbar />

      {/* Hero Section - Interactive & Dynamic */}
      <section className="relative pt-32 sm:pt-48 pb-40 sm:pb-56 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-900" />
        
        {/* Animated Floating Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animation: "float 6s ease-in-out infinite", animationDelay: "0s" }} />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" style={{ animation: "float 8s ease-in-out infinite", animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animation: "float 7s ease-in-out infinite", animationDelay: "2s" }} />

        <Container>
          <div className="max-w-5xl mx-auto text-center relative z-10">
            {/* Glassmorphism Badge */}
            <div className="inline-block mb-6 fade-in-up" style={{ animationDelay: "0s" }}>
              <div className="px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">🚀 Enterprise AI Platform</span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-tight fade-in-up" style={{ animationDelay: "0.1s" }}>
              <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-violet-300 bg-clip-text text-transparent">
                Finance That
              </span>
              <br />
              <span className="text-white">Thinks Ahead</span>
            </h1>

            {/* Subtitle with Enhanced Styling */}
            <p className="text-lg sm:text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed fade-in-up" style={{ animationDelay: "0.2s" }}>
              AI-powered multi-tenant ERP that auto-journals, forecasts, and detects anomalies in real-time. Enterprise compliance, startup speed.
            </p>

            {/* Interactive CTA Cards */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Link href="/dashboard">
                <div className="group relative px-8 py-4 bg-white text-black font-semibold rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity" />
                  <span className="relative">Get Started Free</span>
                </div>
              </Link>
              <button className="group px-8 py-4 text-base font-semibold border-2 border-slate-600 text-slate-300 rounded-xl hover:border-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/5 transition-all duration-300 backdrop-blur-sm">
                Schedule Demo
              </button>
            </div>

            {/* Floating Stats Cards - Glassmorphism */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-in-up" style={{ animationDelay: "0.4s" }}>
              {/* Stat 1 */}
              <div className="group relative p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-4xl sm:text-5xl font-black text-cyan-300 mb-2">94%</div>
                  <div className="text-sm text-slate-400 font-semibold">ML Accuracy</div>
                  <div className="text-xs text-slate-500 mt-2">Real-time anomaly detection</div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="group relative p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl hover:border-emerald-500/50 hover:bg-slate-900/60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1" style={{ animationDelay: "0.1s" }}>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-4xl sm:text-5xl font-black text-emerald-300 mb-2">2.4M+</div>
                  <div className="text-sm text-slate-400 font-semibold">Txns/Month</div>
                  <div className="text-xs text-slate-500 mt-2">Auto-journalized daily</div>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="group relative p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl hover:border-violet-500/50 hover:bg-slate-900/60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1" style={{ animationDelay: "0.2s" }}>
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-4xl sm:text-5xl font-black text-violet-300 mb-2">&lt;200ms</div>
                  <div className="text-sm text-slate-400 font-semibold">Query Speed</div>
                  <div className="text-xs text-slate-500 mt-2">Lightning-fast insights</div>
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* CSS for floating animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-40px); }
          }
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
          }
        `}</style>
      </section>

      {/* System Architecture Section */}
      <section className="relative py-20 sm:py-32 bg-gradient-to-b from-slate-900 to-black">
        <Container>
          <div className="max-w-6xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-16 fade-in-up">
              <h2 className="text-4xl sm:text-5xl font-black mb-4">Enterprise Architecture</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">Multi-layered intelligence platform built for scale, security, and real-time insights</p>
            </div>

            {/* Architecture Diagram */}
            <div className="relative fade-in-up" style={{ animationDelay: "0.1s" }}>
              {/* Layer 1: User Layer */}
              <div className="mb-12 p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur">
                <div className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">User Layer</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center hover:border-cyan-500/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">Web Dashboard</div>
                    <div className="text-xs text-slate-500 mt-1">Next.js 15 + React</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center hover:border-cyan-500/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">Mobile App</div>
                    <div className="text-xs text-slate-500 mt-1">iOS/Android</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center hover:border-cyan-500/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">API Consumers</div>
                    <div className="text-xs text-slate-500 mt-1">Third-party integrations</div>
                  </div>
                </div>
                {/* Arrow Down */}
                <div className="flex justify-center mt-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-transparent"></div>
                </div>
              </div>

              {/* Layer 2: API Gateway */}
              <div className="mb-12 p-6 rounded-2xl border border-slate-700 bg-gradient-to-r from-cyan-500/10 to-slate-900/50 backdrop-blur">
                <div className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">API Gateway</div>
                <div className="p-4 rounded-lg bg-slate-800/70 border border-cyan-500/30 text-center">
                  <div className="text-sm font-bold text-slate-200">FastAPI with Rate Limiting • JWT Auth • Security</div>
                  <div className="text-xs text-slate-400 mt-2">Prompt Injection Detection • Request Validation</div>
                </div>
                {/* Arrow Down */}
                <div className="flex justify-center mt-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-transparent"></div>
                </div>
              </div>

              {/* Layer 3: Intelligence Layer */}
              <div className="mb-12 p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur">
                <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4">Intelligence Layer</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">NLBI Engine</div>
                    <div className="text-xs text-slate-500 mt-1">Text-to-SQL</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">RAG Framework</div>
                    <div className="text-xs text-slate-500 mt-1">Dense + Sparse</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">Ledger Sync</div>
                    <div className="text-xs text-slate-500 mt-1">Auto-Journal</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">ML Analysis</div>
                    <div className="text-xs text-slate-500 mt-1">Forecasting • Anomaly</div>
                  </div>
                </div>
                {/* Arrow Down */}
                <div className="flex justify-center mt-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-transparent"></div>
                </div>
              </div>

              {/* Layer 4: Data Layer */}
              <div className="mb-12 p-6 rounded-2xl border border-slate-700 bg-gradient-to-r from-violet-500/10 to-slate-900/50 backdrop-blur">
                <div className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Data Layer</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-slate-800/70 border border-violet-500/30 text-center hover:border-violet-400/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">SQLite</div>
                    <div className="text-xs text-slate-500 mt-1">Multi-Tenant • 34 Tables</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/70 border border-violet-500/30 text-center hover:border-violet-400/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">ChromaDB/FAISS</div>
                    <div className="text-xs text-slate-500 mt-1">Vector Embeddings</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/70 border border-violet-500/30 text-center hover:border-violet-400/50 transition-colors">
                    <div className="text-sm font-bold text-slate-300">Redis Cache</div>
                    <div className="text-xs text-slate-500 mt-1">Real-time KPIs</div>
                  </div>
                </div>
                {/* Arrow Down */}
                <div className="flex justify-center mt-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-violet-500 to-transparent"></div>
                </div>
              </div>

              {/* Layer 5: External Integrations */}
              <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur">
                <div className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-4">External Integrations</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-rose-500/50 transition-colors text-center">
                    <div className="text-sm font-bold text-slate-300">Razorpay</div>
                    <div className="text-xs text-slate-500 mt-1">Payment Links</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-rose-500/50 transition-colors text-center">
                    <div className="text-sm font-bold text-slate-300">WhatsApp</div>
                    <div className="text-xs text-slate-500 mt-1">Notifications</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-rose-500/50 transition-colors text-center">
                    <div className="text-sm font-bold text-slate-300">E-Invoicing</div>
                    <div className="text-xs text-slate-500 mt-1">IRN/GST Portal</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-rose-500/50 transition-colors text-center">
                    <div className="text-sm font-bold text-slate-300">Tally/Zoho</div>
                    <div className="text-xs text-slate-500 mt-1">ERP Sync</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="relative py-20 sm:py-32">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 fade-in-up">Enterprise at Core</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto fade-in-up">
              Purpose-built for scale. Every feature engineered for performance, security, and compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative fade-in-up"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-slate-500/0 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className={`relative p-8 rounded-2xl border border-slate-700 bg-gradient-to-br ${feature.gradient} backdrop-blur-xl group-hover:border-cyan-500/50 transition-colors`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 flex items-center justify-center mb-6 ${feature.iconColor} group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {feature.badge}
                  </div>
                  <h3 className="text-xl font-black mb-3 text-slate-50">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Capabilities Grid */}
      <section className="relative py-20 sm:py-32 border-t border-slate-800/50">
        <Container>
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-16 fade-in-up">Complete Feature Set</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {capabilities.map((capability, i) => (
              <div
                key={capability}
                className="group p-4 rounded-xl border border-slate-800 hover:border-cyan-500/50 bg-slate-900/50 hover:bg-slate-900 transition-all cursor-pointer fade-in-up"
                style={{ animationDelay: `${0.03 * i}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 group-hover:scale-150 transition-transform" />
                  <span className="text-sm font-bold text-slate-300 group-hover:text-cyan-300 transition-colors">{capability}</span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Premium CTA Section */}
      <section className="relative py-32 sm:py-48">
        <Container>
          <div className="fade-in-up">
            <div className="relative mx-auto max-w-4xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-violet-500/20 to-emerald-500/30 rounded-3xl blur-2xl" />

              <div className="relative p-12 sm:p-20 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900/85 backdrop-blur-2xl">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/40 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-cyan-500/20">
                  <Brain size={40} className="text-cyan-300" />
                </div>

                <h2 className="text-4xl sm:text-5xl font-black text-center mb-6 tracking-tight">
                  Ready to Transform<br />
                  <span className="block bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                    Your Finance?
                  </span>
                </h2>

                <p className="text-center text-lg text-slate-300 max-w-2xl mx-auto mb-10">
                  Join 500+ enterprises already using NeuralBI. Start with a free tier, no commitment required.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Link href="/dashboard">
                    <Button className="px-12 py-7 text-base font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/40">
                      Get Started Free <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </Link>
                  <button className="px-12 py-7 text-base font-bold rounded-xl border border-slate-600 hover:border-cyan-500/50 hover:bg-slate-900/50 transition-all">
                    Schedule Demo
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 border-t border-slate-700/50 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    No credit card required
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    60 seconds to setup
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Cancel anytime
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}
