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
  getLedger,
  getLeadScoring,
  getChurnRisk,
  getFraudAlerts,
  getInventoryDemandForecast
} from "@/services/api"

interface UserMetric {
  label: string
  value: string | number
  icon: string
  trend?: 'up' | 'down'
  color: string
}

interface QuickAction {
  id: string
  title: string
  icon: string
  path: string
  badge?: string | number
  description: string
  color: string
  priority: 'urgent' | 'high' | 'normal'
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

      const [kpis, invoices, customers, inventory, ledger, leads, churn, fraud, forecast] = await Promise.allSettled([
        getLiveKPIs(),
        getInvoices(),
        getCustomers(),
        getInventory(),
        getLedger(),
        getLeadScoring(),
        getChurnRisk(),
        getFraudAlerts(),
        getInventoryDemandForecast()
      ])

      // Extract data
      const invoiceData = invoices.status === 'fulfilled' ? invoices.value : []
      const leadData = leads.status === 'fulfilled' ? leads.value : []
      const churnData = churn.status === 'fulfilled' ? churn.value : []
      const fraudData = fraud.status === 'fulfilled' ? fraud.value : []
      const forecastData = forecast.status === 'fulfilled' ? forecast.value : []

      const pendingInvoices = invoiceData?.filter((inv: any) => inv.status === 'pending').length || 0
      const lowStockItems = forecastData?.filter((f: any) => f.days_to_stockout <= 7).length || 0

      // User-focused quick metrics
      const userMetrics: UserMetric[] = [
        {
          label: "Pending Invoices",
          value: pendingInvoices,
          icon: "📤",
          trend: pendingInvoices > 5 ? 'up' : 'down',
          color: "text-blue-400"
        },
        {
          label: "New Leads",
          value: leadData?.length || 0,
          icon: "🎯",
          trend: 'up',
          color: "text-green-400"
        },
        {
          label: "At-Risk Customers",
          value: churnData?.length || 0,
          icon: "⚠️",
          trend: 'down',
          color: "text-red-400"
        },
        {
          label: "Low Stock Items",
          value: lowStockItems,
          icon: "📦",
          trend: lowStockItems > 3 ? 'up' : 'down',
          color: "text-orange-400"
        }
      ]

      // Quick action shortcuts
      const quickActions: QuickAction[] = [
        {
          id: 'create_invoice',
          title: 'Create Invoice',
          icon: '📝',
          path: '/workspace',
          description: 'Generate new invoice quickly',
          color: 'from-blue-500/10 to-transparent border-blue-500/20',
          priority: 'high',
          badge: pendingInvoices > 0 ? pendingInvoices : undefined
        },
        {
          id: 'manage_leads',
          title: 'Sales Pipeline',
          icon: '🎯',
          path: '/crm',
          description: 'Manage and follow up on leads',
          color: 'from-green-500/10 to-transparent border-green-500/20',
          priority: leadData?.length > 0 ? 'urgent' : 'normal',
          badge: leadData?.length > 0 ? leadData.length : undefined
        },
        {
          id: 'inventory_check',
          title: 'Stock Check',
          icon: '📦',
          path: '/workspace',
          description: 'Review low-stock alerts',
          color: 'from-orange-500/10 to-transparent border-orange-500/20',
          priority: lowStockItems > 0 ? 'urgent' : 'normal',
          badge: lowStockItems > 0 ? lowStockItems : undefined
        },
        {
          id: 'customer_health',
          title: 'Customer Health',
          icon: '❤️',
          path: '/crm',
          description: 'Check churn risks and customers at risk',
          color: 'from-red-500/10 to-transparent border-red-500/20',
          priority: churnData?.length > 0 ? 'urgent' : 'normal',
          badge: churnData?.length > 0 ? churnData.length : undefined
        },
        {
          id: 'view_reports',
          title: 'Reports',
          icon: '📊',
          path: '/analytics',
          description: 'Access business intelligence & analytics',
          color: 'from-purple-500/10 to-transparent border-purple-500/20',
          priority: 'normal'
        },
        {
          id: 'ai_copilot',
          title: 'AI Assistant',
          icon: '🤖',
          path: '/copilot',
          description: 'Ask questions and get insights',
          color: 'from-indigo-500/10 to-transparent border-indigo-500/20',
          priority: 'normal'
        },
        {
          id: 'upload_data',
          title: 'Upload Data',
          icon: '📤',
          path: '/onboarding',
          description: 'Import CSV files & datasets',
          color: 'from-cyan-500/10 to-transparent border-cyan-500/20',
          priority: 'normal'
        },
        {
          id: 'forecast',
          title: 'Forecasts',
          icon: '📈',
          path: '/analytics',
          description: 'View AI predictions & forecasts',
          color: 'from-pink-500/10 to-transparent border-pink-500/20',
          priority: 'normal'
        }
      ]

      // Combine all alerts for alert list
      const allAlerts = [
        ...churnData?.slice(0, 2).map((c: any) => ({
          type: 'churn',
          icon: '⚠️',
          title: `${c.name} at churn risk`,
          severity: 'high',
          action: 'Review customer'
        })) || [],
        ...fraudData?.slice(0, 2).map((f: any) => ({
          type: 'fraud',
          icon: '🛡️',
          title: `Fraud detected: ${f.reason}`,
          severity: 'critical',
          action: 'Investigate now'
        })) || [],
        ...forecastData?.filter((f: any) => f.risk === 'CRITICAL')?.slice(0, 2).map((f: any) => ({
          type: 'stock',
          icon: '📦',
          title: `${f.sku} out of stock in ${f.days_to_stockout} days`,
          severity: 'high',
          action: 'Reorder now'
        })) || []
      ]

      setMetrics(userMetrics)
      setActions(quickActions)
      setAlerts(allAlerts)
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      showToast("error", "Data Fetch Failed", "Could not load your dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'from-red-500/20 border-red-500/30'
      case 'high': return 'from-orange-500/20 border-orange-500/30'
      default: return 'from-gray-500/20 border-gray-500/30'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">CRITICAL</Badge>
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">WARNING</Badge>
      default:
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">INFO</Badge>
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout
        title="Your Dashboard"
        subtitle="Quick access to your business operations"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={100} className="rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={150} className="rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Your Dashboard"
      subtitle="Quick access to your business operations"
    >
      <div className="space-y-8 pb-20">
        {/* KEY METRICS - What You Need to Know Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {metrics.map((metric, idx) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-300" />
                
                <div className="relative z-10">
                  <div className="text-3xl mb-2">{metric.icon}</div>
                  <div className={`text-3xl font-black ${metric.color} mb-1`}>
                    {metric.value}
                  </div>
                  <div className="text-xs text-white/60 font-medium">
                    {metric.label}
                  </div>
                  {metric.trend && (
                    <div className="mt-2 text-[10px] font-bold">
                      {metric.trend === 'up' ? (
                        <span className="text-red-400">↑ Needs attention</span>
                      ) : (
                        <span className="text-green-400">↓ On track</span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* CRITICAL ALERTS */}
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-black text-red-400">🚨 Active Alerts</span>
                <Badge className="bg-red-500/20 text-red-300">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</Badge>
              </div>
              
              {alerts.map((alert, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`p-4 bg-gradient-to-r ${getPriorityColor(alert.severity)} border`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-xl mt-1">{alert.icon}</span>
                        <div>
                          <div className="font-bold text-white text-sm">{alert.title}</div>
                          <div className="text-xs text-white/70 mt-1">Action required: {alert.action}</div>
                        </div>
                      </div>
                      <Button size="xs" variant="primary" className="whitespace-nowrap ml-2">
                        Review
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* QUICK ACTION BUTTONS - What You Can Do */}
        <div>
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            ⚡ Quick Actions
            <span className="text-xs font-normal text-white/50">Get things done fast</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, idx) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={action.path}>
                  <Card 
                    className={`p-6 h-full bg-gradient-to-br ${action.color} hover:border-white/40 hover:shadow-lg hover:shadow-white/5 transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-20 transition-opacity">
                      <span className="text-6xl">{action.icon}</span>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-3xl">{action.icon}</div>
                        {action.badge ? (
                          <Badge className={`${action.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white'} animate-pulse`}>
                            {action.badge}
                          </Badge>
                        ) : null}
                      </div>
                      
                      <h3 className="font-bold text-white mb-1 text-sm">{action.title}</h3>
                      <p className="text-[12px] text-white/60 leading-relaxed">{action.description}</p>
                      
                      <div className="mt-3 flex items-center text-[10px] text-white/40 group-hover:text-white/60 transition-colors">
                        Open → 
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* TIPS & SHORTCUTS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">💡</span>
            <div>
              <h3 className="font-black text-white mb-2">Pro Tips</h3>
              <ul className="text-sm text-white/70 space-y-1">
                <li>✓ Use <span className="text-indigo-300 font-semibold">AI Assistant</span> to ask questions about your data</li>
                <li>✓ Go to <span className="text-indigo-300 font-semibold">Customer Health</span> weekly to prevent churn</li>
                <li>✓ Check <span className="text-indigo-300 font-semibold">Stock Check</span> before inventory runs low</li>
                <li>✓ Upload new data via <span className="text-indigo-300 font-semibold">Data Nexus</span> to keep systems synced</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}