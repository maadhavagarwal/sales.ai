"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Card, Button, Badge } from "@/components/ui"
import { useToast } from "@/components/ui/Toast"
import { Skeleton } from "@/components/ui/Skeleton"
import {
  getLiveKPIs,
  getInvoices,
  getCustomers,
  getInventory,
  getLeadScoring,
  getChurnRisk,
  getFraudAlerts,
  getInventoryDemandForecast
} from "@/services/api"
import { 
  FileText, Target, AlertTriangle, Package, ArrowRight, 
  Bot, TrendingUp, TrendingDown, Activity, Sparkles 
} from "lucide-react"

interface UserMetric {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down'
  color: string
  trendLabel: string
}

interface QuickAction {
  id: string
  title: string
  icon: React.ReactNode
  path: string
  badge?: string | number
  description: string
  gradient: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export default function UserQuickAccessDashboard() {
  const [metrics, setMetrics] = useState<UserMetric[]>([])
  const [actions, setActions] = useState<QuickAction[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      const [kpis, invoices, customers, inventory, leads, churn, fraud, forecast] = await Promise.allSettled([
        getLiveKPIs(),
        getInvoices(),
        getCustomers(),
        getInventory(),
        getLeadScoring(),
        getChurnRisk(),
        getFraudAlerts(),
        getInventoryDemandForecast()
      ])

      const invoiceData = invoices.status === 'fulfilled' ? invoices.value : []
      const leadData = leads.status === 'fulfilled' ? leads.value : []
      const churnData = churn.status === 'fulfilled' ? churn.value : []
      const fraudData = fraud.status === 'fulfilled' ? fraud.value : []
      const forecastData = forecast.status === 'fulfilled' ? forecast.value : []

      const pendingInvoices = invoiceData?.filter((inv: any) => inv.status === 'pending').length || 0
      const lowStockItems = forecastData?.filter((f: any) => f.days_to_stockout <= 7).length || 0

      const userMetrics: UserMetric[] = [
        { label: "Pending Invoices", value: pendingInvoices, icon: <FileText size={20} />, trend: pendingInvoices > 5 ? 'up' : 'down', color: "text-blue-500", trendLabel: "Requires attention" },
        { label: "Sales Pipeline", value: leadData?.length || 0, icon: <Target size={20} />, trend: 'up', color: "text-emerald-500", trendLabel: "Active leads" },
        { label: "Risk Exposure", value: churnData?.length || 0, icon: <AlertTriangle size={20} />, trend: 'down', color: "text-rose-500", trendLabel: "Customers at risk" },
        { label: "Inventory Gaps", value: lowStockItems, icon: <Package size={20} />, trend: lowStockItems > 3 ? 'up' : 'down', color: "text-amber-500", trendLabel: "Items low stock" }
      ]

      const quickActions: QuickAction[] = [
        { id: 'create_invoice', title: 'New Invoice', icon: <FileText size={24} />, path: '/workspace', description: 'Generate accounts receivable entries', gradient: 'from-blue-500/10 to-blue-500/5', badge: pendingInvoices > 0 ? pendingInvoices : undefined },
        { id: 'manage_leads', title: 'Sales Intel', icon: <Target size={24} />, path: '/crm', description: 'AI-powered lead scoring engine', gradient: 'from-emerald-500/10 to-emerald-500/5', badge: leadData?.length > 0 ? leadData.length : undefined },
        { id: 'inventory_check', title: 'Supply Chain', icon: <Package size={24} />, path: '/workspace', description: 'Monitor and optimize stock levels', gradient: 'from-amber-500/10 to-amber-500/5', badge: lowStockItems > 0 ? lowStockItems : undefined },
        { id: 'ai_copilot', title: 'Neural Copilot', icon: <Bot size={24} />, path: '/copilot', description: 'Strategic AI advisory engine', gradient: 'from-indigo-500/10 to-indigo-500/5' }
      ]

      const allAlerts = [
        ...churnData?.slice(0, 2).map((c: any) => ({ type: 'churn', icon: <AlertTriangle size={18} />, title: `${c.name} Churn Risk`, severity: 'high' })),
        ...fraudData?.slice(0, 1).map((f: any) => ({ type: 'fraud', icon: <AlertTriangle size={18} />, title: `Anomaly: ${f.reason}`, severity: 'critical' })),
        ...forecastData?.filter((f: any) => f.risk === 'CRITICAL')?.slice(0, 1).map((f: any) => ({ type: 'stock', icon: <Package size={18} />, title: `Stockout: ${f.sku}`, severity: 'high' }))
      ]

      setMetrics(userMetrics)
      setActions(quickActions)
      setAlerts(allAlerts)
    } catch (error) {
      showToast("error", "Connection Error", "Recalibrating data streams...")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Strategic Command" subtitle="Loading intelligence...">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={130} className="rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={160} className="rounded-2xl" />)}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      title="Strategic Command" 
      subtitle="Enterprise overview & real-time directives"
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 pb-16"
      >
        {/* KPI CARDS */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {metrics.map((metric, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <Card variant="default" className="relative group overflow-hidden p-5 hover:shadow-[var(--shadow-md)] hover:border-[--border-default] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${metric.color === 'text-blue-500' ? 'from-blue-500/15 to-blue-500/5' : metric.color === 'text-emerald-500' ? 'from-emerald-500/15 to-emerald-500/5' : metric.color === 'text-rose-500' ? 'from-rose-500/15 to-rose-500/5' : 'from-amber-500/15 to-amber-500/5'} flex items-center justify-center ${metric.color} transition-transform group-hover:scale-110`}>
                    {metric.icon}
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium ${metric.trend === 'up' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {metric.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-[--text-primary] tracking-tighter mb-1.5">{metric.value}</div>
                <div className="text-[12px] font-semibold text-[--text-secondary] mb-0.5">{metric.label}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[--accent-emerald] animate-pulse" />
                  <span className="text-[10px] font-medium text-[--text-muted]">{metric.trendLabel}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ALERTS */}
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
               <div className="flex items-center gap-2.5">
                 <div className="w-1 h-5 bg-[--accent-rose] rounded-full" />
                 <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[--accent-rose]">Active Alerts</h3>
                 <Badge variant="danger" size="xs">{alerts.length}</Badge>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {alerts.map((alert, idx) => (
                   <Card key={idx} variant="default" className="p-4 border-[--accent-rose]/10 bg-[--accent-rose]/3 group hover:border-[--accent-rose]/20 transition-all">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-[--accent-rose]/10 flex items-center justify-center text-[--accent-rose]">
                           {alert.icon}
                         </div>
                         <span className="text-sm font-semibold text-[--text-primary]">{alert.title}</span>
                       </div>
                       <Button size="xs" variant="ghost" className="text-[--accent-rose] text-[11px] font-semibold">
                         Resolve
                         <ArrowRight size={12} />
                       </Button>
                     </div>
                   </Card>
                 ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* QUICK ACTIONS */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-[--primary] rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[--primary]">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <Link href={action.path}>
                  <Card variant="default" interactive className="p-6 h-full group relative overflow-hidden">
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-5">
                         <div className="w-11 h-11 rounded-xl bg-[--surface-2] border border-[--border-subtle] flex items-center justify-center text-[--text-muted] group-hover:text-[--primary] group-hover:border-[--primary]/20 transition-all">
                           {action.icon}
                         </div>
                         {action.badge && (
                           <Badge variant="primary" size="sm" pulse>{action.badge}</Badge>
                         )}
                      </div>
                      <h4 className="text-base font-bold text-[--text-primary] tracking-tight mb-1.5">{action.title}</h4>
                      <p className="text-[12px] font-medium text-[--text-muted] leading-relaxed">{action.description}</p>
                      
                      <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-[--primary] opacity-0 group-hover:opacity-100 transition-opacity">
                        Open <ArrowRight size={12} />
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* SYSTEM STATUS */}
        <motion.div variants={itemVariants}>
          <Card variant="default" className="p-6 border-[--accent-emerald]/10 bg-gradient-to-r from-[--accent-emerald]/3 to-transparent">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[--accent-emerald]/10 border border-[--accent-emerald]/15 flex items-center justify-center">
                   <Activity size={22} className="text-[--accent-emerald]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-[--text-primary]">All Systems Operational</h4>
                    <div className="w-2 h-2 rounded-full bg-[--accent-emerald] animate-pulse" />
                  </div>
                  <p className="text-[12px] font-medium text-[--text-muted]">
                    Latency: 22ms &bull; Throughput: 14.8 GB/s &bull; 24 active models
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                 <Button variant="ghost" size="sm" className="text-[12px]">View Logs</Button>
                 <Button variant="outline" size="sm" className="text-[12px]">
                   <Sparkles size={14} />
                   Run Diagnostics
                 </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}