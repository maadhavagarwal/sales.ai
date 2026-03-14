import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend"

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000,
})

export default api

export const buildApiUrl = (path: string) => `${API_URL}${path}`

export const uploadCSV = async (
  file: File,
  onProgress?: (progress: number) => void
) => {
  const formData = new FormData()
  formData.append("file", file)

  const res = await api.post("/upload-csv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
  return res.data
}

export const askCopilot = async (datasetId: string, question: string) => {
  const res = await api.post(`/copilot/${datasetId}`, JSON.stringify(question), {
    headers: { "Content-Type": "application/json" },
  })
  return res.data
}

export const askCopilotAgent = async (datasetId: string, question: string) => {
  const res = await api.post(`/copilot/agent/${datasetId}`, JSON.stringify(question), {
    headers: { "Content-Type": "application/json" },
  })
  return res.data
}

export const askNLBI = async (datasetId: string, question: string) => {
  const res = await api.post(`/nlbi/${datasetId}`, JSON.stringify(question), {
    headers: { "Content-Type": "application/json" },
  })
  return res.data
}

export const getPricingOptimization = async (datasetId: string) => {
  const res = await api.post(`/pricing-optimization/${datasetId}`)
  return res.data
}

export const getDashboardConfig = async (datasetId: string) => {
  const res = await api.post(`/dashboard-config/${datasetId}`)
  return res.data
}

export const downloadReport = (datasetId: string) => {
  window.open(buildApiUrl(`/download-report/${datasetId}`), "_blank")
}

export const downloadCleanData = (datasetId: string) => {
  window.open(buildApiUrl(`/download-clean-data/${datasetId}`), "_blank")
}

export const downloadStrategicPlanPDF = (datasetId: string) => {
  window.open(buildApiUrl(`/download-strategic-plan-pdf/${datasetId}`), "_blank")
}

export const reprocessDataset = async (datasetId: string, sheetName: string | null) => {
  const res = await api.post(`/reprocess-dataset/${datasetId}`, JSON.stringify(sheetName), {
    headers: { "Content-Type": "application/json" },
  })
  return res.data
}


export const createInvoice = async (data: any) => {
  const res = await api.post("/workspace/invoices", data)
  return res.data
}

export const getInvoices = async () => {
  const res = await api.get("/workspace/invoices")
  return res.data
}

export const updateInvoice = async (invoiceId: string, data: any) => {
  const res = await api.put(`/workspace/invoices/${invoiceId}`, data)
  return res.data
}

export const deleteInvoice = async (invoiceId: string) => {
  const res = await api.delete(`/workspace/invoices/${invoiceId}`)
  return res.data
}

export const addCustomer = async (data: any) => {
  const res = await api.post("/workspace/customers", data)
  return res.data
}

export const getCustomers = async () => {
  const res = await api.get("/workspace/customers")
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

// --- INVENTORY API ---
export const getInventory = async () => {
  const res = await api.get("/workspace/inventory")
  return res.data
}

export const getInventoryHealth = async () => {
  const res = await api.get("/workspace/inventory/health")
  return res.data
}

export const addInventoryItem = async (data: any) => {
  const res = await api.post("/workspace/inventory", data)
  return res.data
}

export const updateInventoryItem = async (itemId: number, data: any) => {
  const res = await api.put(`/workspace/inventory/${itemId}`, data)
  return res.data
}

export const deleteInventoryItem = async (itemId: number) => {
  const res = await api.delete(`/workspace/inventory/${itemId}`)
  return res.data
}

export const addExpense = async (data: any) => {
  const res = await api.post("/workspace/expenses", data)
  return res.data
}

export const updateExpense = async (expenseId: number, data: any) => {
  const res = await api.put(`/workspace/expenses/${expenseId}`, data)
  return res.data
}

export const deleteExpense = async (expenseId: number) => {
  const res = await api.delete(`/workspace/expenses/${expenseId}`)
  return res.data
}


export const getLedger = async () => {
  const res = await api.get("/workspace/ledger")
  return res.data
}

export const addLedgerEntry = async (data: any) => {
  const res = await api.post("/workspace/ledger", data)
  return res.data
}

export const updateLedgerEntry = async (entryId: number, data: any) => {
  const res = await api.put(`/workspace/ledger/${entryId}`, data)
  return res.data
}

export const deleteLedgerEntry = async (entryId: number) => {
  const res = await api.delete(`/workspace/ledger/${entryId}`)
  return res.data
}

export const getAccountingNotes = async () => {
  const res = await api.get("/workspace/accounting/notes")
  return res.data
}

export const addAccountingNote = async (data: any) => {
  const res = await api.post("/workspace/accounting/notes", data)
  return res.data
}

export const updateAccountingNote = async (noteId: number, data: any) => {
  const res = await api.put(`/workspace/accounting/notes/${noteId}`, data)
  return res.data
}

export const deleteAccountingNote = async (noteId: number) => {
  const res = await api.delete(`/workspace/accounting/notes/${noteId}`)
  return res.data
}

export const getFinancialStatements = async () => {
  const res = await api.get("/workspace/accounting/statements")
  return res.data
}

export const getExpenses = async () => {
  const res = await api.get("/workspace/expenses")
  return res.data
}

export const getDaybook = async () => {
  const res = await api.get("/workspace/accounting/daybook")
  return res.data
}

export const getTrialBalance = async () => {
  const res = await api.get("/workspace/accounting/trial-balance")
  return res.data
}

export const getPLStatement = async () => {
  const res = await api.get("/workspace/accounting/pl")
  return res.data
}

export const getBalanceSheet = async () => {
  const res = await api.get("/workspace/accounting/balance-sheet")
  return res.data
}

export const reconcileBankStatement = async (entries: any[]) => {
  const res = await api.post("/workspace/accounting/reconcile", { entries })
  return res.data
}

export const getGSTReports = async () => {
  const res = await api.get("/workspace/accounting/gst")
  return res.data
}

export const getDerivativesSnapshot = async (data: {
  underlying?: string
  expiry?: string
  portfolio_value?: number
  portfolio_beta?: number
  hedge_ratio_target?: number
}) => {
  const res = await api.post("/workspace/accounting/derivatives", data)
  return res.data
}

// --- MARKETING API ---
export const createMarketingCampaign = async (data: any) => {
  const res = await api.post("/workspace/marketing/campaigns", data)
  return res.data
}

export const getMarketingCampaigns = async () => {
  const res = await api.get("/workspace/marketing/campaigns")
  return res.data
}

export const updateMarketingCampaign = async (campaignId: number, data: any) => {
  const res = await api.put(`/workspace/marketing/campaigns/${campaignId}`, data)
  return res.data
}

export const deleteMarketingCampaign = async (campaignId: number) => {
  const res = await api.delete(`/workspace/marketing/campaigns/${campaignId}`)
  return res.data
}

export const getCustomerLedger = async (customerId: string) => {
  const res = await api.get(`/workspace/accounting/customer-ledger/${customerId}`)
  return res.data
}

export const syncWorkspaceToDashboard = async () => {
  const res = await api.get("/dashboard/sync-workspace")
  return res.data
}

export const recordPayment = async (data: any) => {
  const res = await api.post("/workspace/accounting/payments", data)
  return res.data
}
export const sendInvoiceReminder = async (invoiceId: string) => {
  const res = await api.post(`/workspace/accounting/reminders/${invoiceId}`)
  return res.data
}

export const downloadBusinessReport = async () => {
  const response = await api.get('/workspace/business-report/download', {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'Enterprise_Business_Report.txt');
  document.body.appendChild(link);
  link.click();
}

export const getCopilotResponse = async (query: string, datasetId?: string) => {
  const res = await api.post('/copilot-chat', { query, dataset_id: datasetId })
  return res.data
}

export const getUsageStats = async () => {
  const res = await api.get('/workspace/usage-stats')
  return res.data
}

export const getCFOHealthReport = async () => {
  const res = await api.get('/workspace/accounting/cfo-report')
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
    return res.data
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
  const res = await api.get("/workspace/analytics/scenarios")
  return res.data
}

export const getSalesLeaderboard = async () => {
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
  const res = await api.get("/workspace/accounting/anomalies")
  return res.data
}

export const getCashFlowForecast = async () => {
  const res = await api.get("/workspace/accounting/cash-flow-gap")
  return res.data
}

export const simulateWhatIf = async (query: string) => {
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

