import axios from "axios"
import { 
  isDemoMode, 
  getDemoCustomers, 
  getDemoInvoices, 
  getDemoInventory, 
  getDemoKPIs,
  demoIntelligence 
} from './demoData'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend"

const buildApiUrl = (path: string) => {
  if (path.startsWith("/")) {
    return `${API_URL}${path}`
  }
  return `${API_URL}/${path}`
}

const api = axios.create({
  baseURL: API_URL,
})

// Request Interceptor for Auth
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Types
export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  status: string
}

export interface Invoice {
  id: string
  customer_id: string
  customer_name: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  date: string
  due_date: string
}

// API Functions
export const getCustomers = async () => {
  if (isDemoMode()) return getDemoCustomers()
  const res = await api.get('/workspace/customers')
  return res.data
}

export const addCustomer = async (data: any) => {
  const res = await api.post('/workspace/customers', data)
  return res.data
}

export const updateCustomer = async (customerId: number, data: any) => {
  const res = await api.put(`/workspace/customers/${customerId}`, data)
  return res.data
}

export const deleteCustomer = async (customerId: number) => {
  const res = await api.delete(`/workspace/customers/${customerId}`)
  return res.data
}

export const getInvoices = async () => {
    if (isDemoMode()) return getDemoInvoices()
  const res = await api.get('/workspace/invoices')
  return res.data
}

export const getInventory = async () => {
    if (isDemoMode()) return getDemoInventory()
  const res = await api.get('/workspace/inventory')
  return res.data
}

export const getLedger = async () => {
  const res = await api.get('/workspace/ledger')
  return res.data
}

export const uploadCSV = async (file: File, onProgress?: (progress: number) => void) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(progressEvent.loaded / progressEvent.total)
      }
    },
  })
  return res.data
}

export const uploadBulkFiles = async (files: File[], onProgress?: (progress: number) => void) => {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  const res = await api.post('/workspace/universal-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(progressEvent.loaded / progressEvent.total)
      }
    },
  })
  return res.data
}

export const getWorkspaceIntegrity = async () => {
    const res = await api.get('/api/workspace/integrity')
    return res.data
}

export const getUserState = async () => {
    const res = await api.get('/api/user/state')
    return res.data
}

export const saveUserState = async (state: any) => {
    const res = await api.post('/api/user/state', state)
    return res.data
}

export const getUploadStatus = async (datasetId: string) => {
  const res = await api.get(`/upload-status/${datasetId}`)
  return res.data
}

export const getCopilotResponse = async (query: string, datasetId?: string) => {
    if (isDemoMode()) {
        return {
            response: "Neural simulation of demo data suggests healthy growth. Our LLM-driven analysis indicates a 12% revenue upside if you optimize your networking inventory for the enterprise segment.",
            type: "text"
        }
    }
    const res = await api.post('/copilot-chat', {
        query,
        dataset_id: datasetId,
    })
    return res.data
}

export const getNLBIChart = async (query: string, datasetId: string) => {
  const res = await api.post('/nlbi-chart', {
    query,
    dataset_id: datasetId,
  })
  return res.data
}

export const askNLBI = getNLBIChart

export const getPricingOptimization = async (datasetId: string) => {
  const res = await api.post(`/pricing-optimization/${datasetId}`)
  return res.data
}

export const getDashboardConfig = async (datasetId: string) => {
  const res = await api.get(`/dashboard-config/${datasetId}`)
  return res.data
}

export const downloadStrategicPlanPDF = (datasetId: string) => {
  window.open(buildApiUrl(`/strategic-plan-pdf/${datasetId}`), "_blank")
}

export const reprocessDataset = async (datasetId: string, sheetName: string) => {
  const res = await api.post(`/reprocess/${datasetId}`, { sheet_name: sheetName })
  return res.data
}

export const getLiveKPIs = async () => {
  if (isDemoMode()) return getDemoKPIs()
  const res = await api.get('/api/live-kpis')
  return res.data
}

export const getModulesStatus = async () => {
  const res = await api.get('/api/modules-status')
  return res.data
}

export const getCRMAnalytics = async () => {
  const res = await api.get('/api/crm/analytics')
  return res.data
}

export const syncWorkspaceToDashboard = async () => {
  const res = await api.post('/workspace/sync-to-dashboard')
  return res.data
}

export const getInvoicesByStatus = async (status: string) => {
  const res = await api.get(`/workspace/invoices/status/${status}`)
  return res.data
}

export const updateInvoiceStatus = async (invoiceId: string, status: string) => {
  const res = await api.put(`/workspace/invoices/${invoiceId}/status`, { status })
  return res.data
}

export const getCustomerProfile = async (customerId: string) => {
  const res = await api.get(`/workspace/customers/${customerId}`)
  return res.data
}

export const updateCustomerProfile = async (customerId: string, data: any) => {
  const res = await api.put(`/workspace/customers/${customerId}`, data)
  return res.data
}

export const getInventoryItem = async (itemId: string) => {
  const res = await api.get(`/workspace/inventory/${itemId}`)
  return res.data
}

export const updateInventoryItem = async (itemId: string, data: any) => {
  const res = await api.put(`/workspace/inventory/${itemId}`, data)
  return res.data
}

export const getExpenseAnalytics = async () => {
  const res = await api.get('/workspace/expenses/analytics')
  return res.data
}

export const getExpenseList = async () => {
  const res = await api.get('/workspace/expenses')
  return res.data
}

export const updateExpenseStatus = async (expenseId: string, status: string) => {
  const res = await api.put(`/workspace/expenses/${expenseId}/status`, { status })
  return res.data
}

export const deleteExpense = async (expenseId: string) => {
  const res = await api.delete(`/workspace/expenses/${expenseId}`)
  return res.data
}

export const manageCompanyProfile = async (action: 'GET' | 'SAVE', data: any = {}) => {
  const res = await api.post('/api/company/profile/manage', { action, ...data })
  return res.data
}

export const getLedgerEntries = async () => {
  const res = await api.get('/workspace/ledger/entries')
  return res.data
}

export const addLedgerEntry = async (data: any) => {
  const res = await api.post('/workspace/ledger/entries', data)
  return res.data
}

export const updateLedgerEntry = async (entryId: string, data: any) => {
  const res = await api.put(`/workspace/ledger/entries/${entryId}`, data)
  return res.data
}

export const deleteLedgerEntry = async (entryId: string) => {
  const res = await api.delete(`/workspace/ledger/entries/${entryId}`)
  return res.data
}

export const getAccountingNotes = async () => {
  const res = await api.get('/workspace/accounting/notes')
  return res.data
}

export const addAccountingNote = async (data: any) => {
  const res = await api.post('/workspace/accounting/notes', data)
  return res.data
}

export const updateAccountingNote = async (noteId: string, data: any) => {
  const res = await api.put(`/workspace/accounting/notes/${noteId}`, data)
  return res.data
}

export const deleteAccountingNote = async (noteId: string) => {
  const res = await api.delete(`/workspace/accounting/notes/${noteId}`)
  return res.data
}

export const registerUser = async (data: any) => {
  const res = await api.post('/api/auth/register', data)
  return res.data
}

export const loginUser = async (data: any) => {
  const res = await api.post('/api/auth/login', data)
  return res.data
}

export const getMarketingCampaigns = async () => {
  const res = await api.get('/workspace/marketing/campaigns')
  return res.data
}

export const manageMarketingCampaign = async (action: 'CREATE' | 'UPDATE' | 'DELETE', data: any = {}) => {
  const url = action === 'CREATE' ? '/workspace/marketing/campaigns' : `/workspace/marketing/campaigns/${data.id || data}`
  const method = action === 'CREATE' ? 'post' : action === 'UPDATE' ? 'put' : 'delete'
  const res = await api[method](url, data)
  return res.data
}

export const createMarketingCampaign = (data: any) => manageMarketingCampaign('CREATE', data)
export const updateMarketingCampaign = (id: number, data: any) => manageMarketingCampaign('UPDATE', { ...data, id })
export const deleteMarketingCampaign = (id: number) => manageMarketingCampaign('DELETE', id)

export const getCustomerLedger = async (customerId: string) => {
  const res = await api.get(`/workspace/accounting/ledger/customer/${customerId}`)
  return res.data
}

export const sendPaymentReminder = async (invoiceId: string) => {
  const res = await api.post(`/workspace/accounting/reminders/send/${invoiceId}`)
  return res.data
}

export const getCFOHealthReport = async () => {
  const res = await api.get('/workspace/accounting/cfo-report')
  return res.data
}

export const getDaybook = async () => {
  const res = await api.get('/workspace/accounting/daybook')
  return res.data
}

export const getTrialBalance = async () => {
  const res = await api.get('/workspace/accounting/trial-balance')
  return res.data
}

export const getPLStatement = async () => {
  const res = await api.get('/workspace/accounting/pl')
  return res.data
}

export const getBalanceSheet = async () => {
  const res = await api.get('/workspace/accounting/balance-sheet')
  return res.data
}

export const getGSTReports = async () => {
  const res = await api.get('/workspace/accounting/gst')
  return res.data
}

export const recordPayment = async (data: any) => {
  const res = await api.post('/workspace/accounting/payments', data)
  return res.data
}

export const reconcileBankStatement = async (entries: any[]) => {
  const res = await api.post('/workspace/accounting/reconcile', { entries })
  return res.data
}

export const getUsageStats = async () => {
  const res = await api.get('/workspace/usage-stats')
  return res.data
}

export const exportWorkspaceData = (tableName: string) => {
  window.open(buildApiUrl(`/workspace/export/${tableName}`), "_blank")
}

export const exportCustomerLedger = (customerId: string) => {
  window.open(buildApiUrl(`/workspace/export/customer-ledger/${customerId}`), "_blank")
}

export const generateEInvoice = async (invoiceId: string) => {
  const res = await api.post(`/workspace/invoices/${invoiceId}/einvoice`)
  return res.data
}

export const generatePaymentLink = async (invoiceId: string, amount: number) => {
  const res = await api.post(`/workspace/invoices/${invoiceId}/payment-link`, { amount })
  return res.data
}

export const sendWhatsAppReminder = async (phone: string, message: string) => {
  const res = await api.post("/workspace/marketing/whatsapp-send", { phone, message })
  return res.data
}

export const scheduleReport = async (reportType: string, email: string, frequency: string) => {
  const res = await api.post("/workspace/reports/schedule", { report_type: reportType, email, frequency })
  return res.data
}

export const getAuditLogs = async () => {
  const res = await api.get("/workspace/audit-logs")
  return res.data
}

export const getHealthScores = async () => {
  const res = await api.get("/crm/health-scores")
  return res.data
}

export const getPredictiveCRMInsights = async () => {
    const res = await api.get("/crm/predictive-insights")
    return res.data.insights || []
}

export const getDeals = async () => {
  const res = await api.get("/workspace/crm/deals")
  return res.data
}

export const manageDeal = async (action: "CREATE" | "UPDATE" | "DELETE", data: any) => {
  if (action === "CREATE") return (await api.post("/workspace/crm/deals", data)).data
  if (action === "UPDATE") return (await api.put(`/workspace/crm/deals/${data.id}`, data)).data
  return null
}

// --- PROCUREMENT & PO API ---
export const managePurchaseOrders = async (action: "CREATE" | "RECEIVE" | "LIST", data: any = {}) => {
  const res = await api.post("/workspace/procurement/po", { action, ...data })
  return res.data
}

// --- ADVANCED ANALYTICS ---
export const getRevenueScenarios = async () => {
    if (isDemoMode()) return demoIntelligence.scenarios
    const res = await api.get("/workspace/analytics/scenarios")
    return res.data
}

export const getSalesLeaderboard = async () => {
    if (isDemoMode()) return demoIntelligence.leaderboard
    const res = await api.get("/workspace/analytics/leaderboard")
    return res.data
}

export const getCrossSellRecommendations = async (sku: string) => {
  const res = await api.get(`/workspace/analytics/cross-sell/${sku}`)
  return res.data
}

export const handleReturn = async (invoiceId: string, items: any[]) => {
  const res = await api.post("/workspace/procurement/returns", { invoice_id: invoiceId, items })
  return res.data
}

// --- INTELLIGENCE & STRATEGY ---
export const getIntelligenceAnomalies = async () => {
    if (isDemoMode()) return { alerts: demoIntelligence.anomalies }
    const res = await api.get("/workspace/accounting/anomalies")
    return res.data
}

export const getCashFlowForecast = async () => {
    if (isDemoMode()) return demoIntelligence.cashFlow
    const res = await api.get("/workspace/accounting/cash-flow-gap")
    return res.data
}

export const simulateWhatIf = async (query: string) => {
    if (isDemoMode()) {
        await new Promise(r => setTimeout(r, 1000))
        return {
            baseline_revenue: 2450000,
            hypothetical_revenue: query.toLowerCase().includes('lose') ? 2100000 : 2750000,
            confidence_interval: 0.92,
            impact_description: `Neural simulation suggests that ${query} would result in a significant shift in monthly liquidity buffers.`,
            recommendation: "Hedge capital via short-term debt instruments or accelerate AR collection cycles."
        }
    }
    const res = await api.post("/ai/intelligence/what-if", { query })
    return res.data
}

export const transferInventory = async (data: {
  sku: string
  quantity: number
  from_location: string
  to_location: string
}) => {
  const res = await api.post("/workspace/inventory/transfer", data)
  return res.data
}

export const getInventoryTransfers = async () => {
  const res = await api.get("/workspace/inventory/transfers")
  return res.data
}

export const downloadGSTR1Json = () => {
  window.open(buildApiUrl(`/workspace/accounting/gst/gstr1-json`), "_blank")
}

export const getWorkingCapital = async () => {
  const res = await api.get("/workspace/accounting/working-capital")
  return res.data
}

// --- HR MODULE API ---
export const getEmployees = async () => (await api.get("/workspace/hr/employees")).data
export const addEmployee = async (data: any) => (await api.post("/workspace/hr/employees", data)).data
export const getHRStats = async () => (await api.get("/workspace/hr/stats")).data

// --- FINANCE MODULE API ---
export const getFinanceSummary = async (datasetId?: string) => 
    (await api.get(`/workspace/finance/summary${datasetId ? `?dataset_id=${datasetId}` : ''}`)).data
export const getBudgets = async () => (await api.get("/workspace/finance/budgets")).data

// --- COMMUNICATION MODULE API ---
export const getMeetings = async () => (await api.get("/workspace/comm/meetings")).data
export const createMeeting = async (data: any) => (await api.post("/workspace/comm/meetings", data)).data
export const getTeamMessages = async () => (await api.get("/workspace/comm/messages")).data
export const sendTeamMessage = async (sender: string, text: string) => 
    (await api.post("/workspace/comm/messages", { sender, text })).data
export const sendDirectEmail = async (to: string, subject: string, body: string) => 
    (await api.post("/workspace/comm/email/send", { to, subject, body })).data
export const getOutboundEmails = async () => (await api.get("/workspace/comm/email/history")).data

// --- AI STRATEGIC ROADMAP ENDPOINTS ---

export const getLeadScoring = async () => {
  const res = await api.get('/ai/intelligence/lead-scoring')
  return res.data
}

export const getChurnRisk = async () => {
  const res = await api.get('/ai/intelligence/churn-risk')
  return res.data
}

export const generateOutreach = async (data: { recipient: string; context: string }) => {
  const res = await api.post('/ai/intelligence/outreach/generate', data)
  return res.data
}

export const getInventoryDemandForecast = async () => {
  const res = await api.get('/ai/intelligence/inventory-forecast')
  return res.data
}

export const getFraudAlerts = async () => {
  const res = await api.get('/ai/intelligence/fraud-detection')
  return res.data
}

export const getSolvencyAudit = async () => {
  const res = await api.get('/workspace/finance/audit-solvency')
  return res.data
}

export const getDynamicPrice = async (sku: string) => {
  const res = await api.get(`/ai/intelligence/dynamic-pricing/${sku}`)
  return res.data
}

export const redactPII = async (text: string) => {
  const res = await api.post('/workspace/comm/security/redact', { text })
  return res.data
}

export const getTeamSentiment = async () => {
  const res = await api.get('/workspace/comm/sentiment')
  return res.data
}
