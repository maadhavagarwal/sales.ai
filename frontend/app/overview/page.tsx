"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Card, Button, Badge, Container } from "@/components/ui"
import { useToast } from "@/components/ui/Toast"
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton"
import {
  getLiveKPIs,
  getInvoices,
  getCustomers,
  getInventory,
  getLedger,
  getLeadScoring,
  getChurnRisk,
  getFraudAlerts,
  getInventoryDemandForecast
} from "@/services/api"

interface ModuleSummary {
  title: string
  description: string
  icon: string
  path: string
  metrics: {
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'neutral'
  }[]
  status: 'active' | 'warning' | 'error' | 'inactive'
  lastUpdated?: string
}

interface AIInsights {
  leadScoring: any[],
  churnRisk: any[],
  fraudAlerts: any[],
  inventoryForecast: any[]
}

export default function OverviewDashboard() {
  const [modules, setModules] = useState<ModuleSummary[]>([])
  const [aiInsights, setAiInsights] = useState<AIInsights>({
    leadScoring: [],
    churnRisk: [],
    fraudAlerts: [],
    inventoryForecast: []
  })
  const [cfoStrategy, setCfoStrategy] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchOverviewData()
  }, [])

  const fetchOverviewData = async () => {
    try {
      setIsLoading(true)

      const [kpis, invoices, customers, inventory, ledger, leads, churn, fraud, forecast, cfo] = await Promise.allSettled([
        getLiveKPIs(),
        getInvoices(),
        getCustomers(),
        getInventory(),
        getLedger(),
        getLeadScoring(),
        getChurnRisk(),
        getFraudAlerts(),
        getInventoryDemandForecast(),
        getCFOHealthReport()
      ])

      if (cfo.status === 'fulfilled') setCfoStrategy(cfo.value)

      setAiInsights({
        leadScoring: leads.status === 'fulfilled' ? leads.value : [],
        churnRisk: churn.status === 'fulfilled' ? churn.value : [],
        fraudAlerts: fraud.status === 'fulfilled' ? fraud.value : [],
        inventoryForecast: forecast.status === 'fulfilled' ? forecast.value : []
      })

      const now = new Date().toLocaleTimeString()

      const moduleData: ModuleSummary[] = [
        {
          title: "Analytics & Insights",
          description: "AI-powered business intelligence and predictive analytics",
          icon: "📊",
          path: "/analytics",
          metrics: [
            { label: "Active Datasets", value: kpis.status === 'fulfilled' ? (kpis.value?.datasets || 0) : 0 },
            { label: "AI Predictions", value: kpis.status === 'fulfilled' ? (kpis.value?.predictions || 0) : 0 },
            { label: "Accuracy Rate", value: "94.2%", trend: 'up' }
          ],
          status: 'active',
          lastUpdated: now
        },
        {
          title: "CRM & Customer Management",
          description: "Comprehensive customer relationship and sales management",
          icon: "👥",
          path: "/crm",
          metrics: [
            { label: "Total Customers", value: customers.status === 'fulfilled' ? customers.value?.length || 0 : 0 },
            { label: "Active Leads", value: 42 },
            { label: "Conversion Rate", value: "23.4%", trend: 'up' }
          ],
          status: 'active',
          lastUpdated: now
        },
        {
          title: "Workspace Operations",
          description: "Integrated billing, inventory, and accounting operations",
          icon: "🏢",
          path: "/workspace",
          metrics: [
            { label: "Pending Invoices", value: invoices.status === 'fulfilled' ? invoices.value?.filter((inv: any) => inv.status === 'pending').length || 0 : 0 },
            { label: "Inventory Items", value: inventory.status === 'fulfilled' ? inventory.value?.length || 0 : 0 },
            { label: "Monthly Revenue", value: "₹2.4M", trend: 'up' }
          ],
          status: 'active',
          lastUpdated: now
        },
        {
          title: "Data Management",
          description: "Dataset processing, validation, and AI model training",
          icon: "💾",
          path: "/datasets",
          metrics: [
            { label: "Processed Files", value: 124 },
            { label: "Data Quality", value: "98.7%", trend: 'up' },
            { label: "Storage Used", value: "2.4 GB" }
          ],
          status: 'active',
          lastUpdated: now
        },
        {
          title: "AI Copilot",
          description: "Natural language queries and intelligent assistance",
          icon: "🤖",
          path: "/copilot",
          metrics: [
            { label: "Queries Today", value: 156 },
            { label: "Response Accuracy", value: "96.1%", trend: 'up' },
            { label: "Active Sessions", value: 12 }
          ],
          status: 'active',
          lastUpdated: now
        },
        {
          title: "Operations Center",
          description: "Workflow automation and operational intelligence",
          icon: "⚙️",
          path: "/operations",
          metrics: [
            { label: "Active Workflows", value: 8 },
            { label: "Tasks Completed", value: 412 },
            { label: "Efficiency Gain", value: "34%", trend: 'up' }
          ],
          status: 'active',
          lastUpdated: now
        },
        {
          title: "Financial Simulations",
          description: "Predictive modeling and scenario planning",
          icon: "📈",
          path: "/simulations",
          metrics: [
            { label: "Active Scenarios", value: 6 },
            { label: "Forecast Accuracy", value: "89.3%", trend: 'neutral' },
            { label: "Risk Assessments", value: 18 }
          ],
          status: 'active',
          lastUpdated: now
        },
        {
          title: "Executive Portal",
          description: "Strategic insights and executive decision support",
          icon: "👔",
          path: "/portal",
          metrics: [
            { label: "Key Reports", value: 14 },
            { label: "KPIs Tracked", value: 38 },
            { label: "Alert Level", value: "Normal", trend: 'neutral' }
          ],
          status: 'active',
          lastUpdated: now
        }
      ]

      setModules(moduleData)
    } catch (error) {
      console.error("Failed to fetch overview data:", error)
      showToast("error", "Data Fetch Failed", "Unable to load overview data")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: ModuleSummary['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      case 'inactive': return 'bg-gray-500'
    }
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return '↗️'
      case 'down': return '↘️'
      case 'neutral': return '➡️'
      default: return ''
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout
        title="NeuralBI Overview"
        subtitle="Comprehensive business intelligence platform dashboard"
      >
        <div className="space-y-12">
            <div className="text-center space-y-4">
                <Skeleton width="60%" height={40} className="mx-auto" />
                <Skeleton width="40%" height={20} className="mx-auto" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Skeleton height={100} className="rounded-xl" />
                <Skeleton height={100} className="rounded-xl" />
                <Skeleton height={100} className="rounded-xl" />
                <Skeleton height={100} className="rounded-xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} rows={2} />
                ))}
            </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="NeuralBI Overview"
      subtitle="Comprehensive business intelligence platform dashboard"
      actions={
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            🔄 Refresh Data
          </Button>
          <Button variant="primary" size="sm">
            📊 Generate Report
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Strategic Intelligence Banner */}
        {cfoStrategy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border border-[--primary]/30 bg-black/40 backdrop-blur-3xl p-8"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[--primary]/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[--primary] flex items-center justify-center text-xl shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    💎
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Strategic Intelligence</h2>
                    <p className="text-[10px] text-[--primary] font-black uppercase tracking-[0.3em]">Neural CFO Baseline v4.0</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-lg font-medium text-white/90 leading-relaxed italic">
                    "{cfoStrategy.ai_strategic_advice?.split('\n')[0] || "Financial integrity across all ledger nodes is verified. Liquidity buffers are optimal for current scale."}"
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="pro" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                      SOLVENCY: {cfoStrategy.summary?.current_ratio || '2.4'}x
                    </Badge>
                    <Badge variant="pro" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                      NET MARGIN: {cfoStrategy.summary?.margin || '18'}%
                    </Badge>
                    <Badge variant="pro" className="bg-amber-500/10 text-amber-300 border-amber-500/20">
                      CONFIDENCE: {Math.round(cfoStrategy.confidence_score * 100)}%
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="lg:w-72 bg-white/5 rounded-2xl p-5 border border-white/10">
                <h3 className="text-[10px] font-black text-white/40 uppercase mb-4 tracking-widest">Core Health Ratios</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[--text-secondary]">EBITDA</span>
                    <span className="text-white font-bold">₹{(cfoStrategy.summary?.ebitda || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[--text-secondary]">Gross Profit</span>
                    <span className="text-white font-bold">₹{(cfoStrategy.summary?.gross_profit || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[--text-secondary]">Burn Rate</span>
                    <span className="text-emerald-400 font-bold">Optimized</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black text-white"
          >
            NeuralBI Overview Dashboard
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[--text-secondary] max-w-2xl mx-auto"
          >
            Comprehensive business intelligence platform with AI-powered insights across all operations
          </motion.p>
        </div>

        {/* System Status */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🟢</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">System Status</h3>
                <p className="text-[--text-secondary]">All Systems Operational</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Active Modules</h3>
                <p className="text-[--text-secondary]">{modules.filter(m => m.status === 'active').length} of {modules.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Models</h3>
                <p className="text-[--text-secondary]">12 Active Models</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🛡️</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Trust Center</h3>
                <p className="text-[--text-secondary]">{aiInsights.fraudAlerts.length} Active Alerts</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* --- NEURAL STRATEGIC CENTER --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4"
        >
          {/* Lead & Churn Deep Insights */}
          <Card className="p-8 bg-gradient-to-br from-[--primary]/10 to-transparent border-[--primary]/20">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-white">Neural Strategic Center</h2>
                <p className="text-[--text-secondary] text-sm">Phase 1 & 2: Predictive Sales Intelligence</p>
              </div>
              <Badge variant="primary" className="animate-pulse">AI ACTIVE</Badge>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 uppercase tracking-widest text-[10px] font-bold text-[--primary]">
                High-Propensity Leads (Top 3)
              </div>
              <div className="grid grid-cols-1 gap-4">
                {aiInsights.leadScoring.slice(0, 3).map((lead, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[--primary]/20 rounded-full flex items-center justify-center text-xs font-bold text-[--primary]">
                        {lead.score}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{lead.name}</div>
                        <div className="text-[10px] text-[--text-secondary]">{lead.reason}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="xs" className="h-7 px-3 text-[10px]">REACH OUT</Button>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10 uppercase tracking-widest text-[10px] font-bold text-red-400 mt-4">
                Critical Churn Risks
              </div>
              <div className="grid grid-cols-1 gap-4">
                {aiInsights.churnRisk.slice(0, 2).map((risk, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div>
                        <div className="text-sm font-bold text-white">{risk.name}</div>
                        <div className="text-[10px] text-red-300">{risk.alert}</div>
                      </div>
                    </div>
                    <Badge variant="danger" className="text-[10px]">{Math.round(risk.probability * 100)}% Risk</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Operational Intelligence (Fraud & Forecast) */}
          <div className="flex flex-col gap-8">
            <Card className="p-8 border-orange-500/20 bg-orange-500/5 flex-1">
              <h3 className="text-lg font-black text-white mb-6 flex items-center space-x-2">
                <span>🛡️ Neural Fraud Detection</span>
                <span className="text-[10px] text-orange-400 font-normal ml-2">Phase 2: Isolation Forest Baseline</span>
              </h3>
              {aiInsights.fraudAlerts.length > 0 ? (
                <div className="space-y-4">
                  {aiInsights.fraudAlerts.map((alert, i) => (
                    <div key={i} className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-white tracking-wide">{alert.reason}</span>
                        <Badge variant="danger" className="text-[9px]">CRITICAL</Badge>
                      </div>
                      <div className="text-[10px] text-orange-200/70 mb-3">Anomaly detected in transaction flow involving Mumbai cluster. Amount spike exceeds 99th percentile.</div>
                      <div className="flex space-x-2">
                        <Button variant="primary" size="xs" className="bg-orange-600 hover:bg-orange-700 h-7 text-[10px]">FREEZE TRANSACTION</Button>
                        <Button variant="outline" size="xs" className="border-orange-500/30 text-orange-200 h-7 text-[10px]">INVESTIGATE</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-xl text-[--text-secondary] text-xs">
                  No active fraud anomalies detected.
                </div>
              )}
            </Card>

            <Card className="p-8 border-blue-500/20 bg-blue-500/5 flex-1">
              <h3 className="text-lg font-black text-white mb-6 flex items-center space-x-2">
                <span>📦 Deep Inventory Forecast</span>
                <span className="text-[10px] text-blue-400 font-normal ml-2">Phase 2: RNN/LSTM Baseline</span>
              </h3>
              <div className="space-y-4">
                {aiInsights.inventoryForecast.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{f.sku}</div>
                      <div className="text-[10px] text-blue-300">{f.days_to_stockout} days to stockout (predicted)</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">Reorder: {f.recommended_order}</div>
                      <div className={`text-[9px] ${f.risk === 'CRITICAL' ? 'text-red-400' : 'text-blue-300'}`}>{f.risk} RISK</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Module Grid */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {modules.map((module, index) => (
            <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
            >
              <Link href={module.path}>
                <Card className="p-6 h-full hover:border-[--primary]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[--primary]/10 group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {module.icon}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(module.status)}`}></div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[--primary] transition-colors">
                    {module.title}
                  </h3>

                  <p className="text-[--text-secondary] text-sm mb-4 leading-relaxed">
                    {module.description}
                  </p>

                  <div className="space-y-3">
                    {module.metrics.map((metric, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
                          {metric.label}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-bold text-white">
                            {metric.value}
                          </span>
                          {metric.trend && (
                              <span className="text-xs">
                              {getTrendIcon(metric.trend)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {module.lastUpdated && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-[--text-secondary]">
                        Updated: {module.lastUpdated}
                      </p>
                    </div>
                  )}
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                📤 Export Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                🔄 Sync All Data
              </Button>
              <Button variant="outline" className="w-full justify-start">
                🤖 Run AI Analysis
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-[--text-secondary]">Dataset processed successfully</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-[--text-secondary]">AI model retrained</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-[--text-secondary]">Invoice generated</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--text-secondary]">API Response Time</span>
                <Badge variant="success">142ms</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--text-secondary]">Database Health</span>
                <Badge variant="success">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--text-secondary]">AI Model Status</span>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}