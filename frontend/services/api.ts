import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000,
})

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
  window.open(`${API_URL}/download-report/${datasetId}`, "_blank")
}

export const downloadCleanData = (datasetId: string) => {
  window.open(`${API_URL}/download-clean-data/${datasetId}`, "_blank")
}

export const downloadStrategicPlanPDF = (datasetId: string) => {
  window.open(`${API_URL}/download-strategic-plan-pdf/${datasetId}`, "_blank")
}

export const reprocessDataset = async (datasetId: string, sheetName: string | null) => {
  const res = await api.post(`/reprocess-dataset/${datasetId}`, JSON.stringify(sheetName), {
    headers: { "Content-Type": "application/json" },
  })
  return res.data
}

// --- WORKSPACE API ---
export const createInvoice = async (data: any) => {
  const res = await api.post("/workspace/invoices", data)
  return res.data
}

export const getInvoices = async () => {
  const res = await api.get("/workspace/invoices")
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

// --- INVENTORY API ---
export const getInventory = async () => {
  const res = await api.get("/workspace/inventory")
  return res.data
}

export const addInventoryItem = async (data: any) => {
  const res = await api.post("/workspace/inventory", data)
  return res.data
}

export const addExpense = async (data: any) => {
  const res = await api.post("/workspace/expenses", data)
  return res.data
}

// --- ACCOUNTING LEDGER API ---
export const getLedger = async () => {
  const res = await api.get("/workspace/ledger")
  return res.data
}

export const addLedgerEntry = async (data: any) => {
  const res = await api.post("/workspace/ledger", data)
  return res.data
}

// --- STATUTORY ACCOUNTING BOOKS API ---
export const getAccountingNotes = async () => {
  const res = await api.get("/workspace/accounting/notes")
  return res.data
}

export const addAccountingNote = async (data: any) => {
  const res = await api.post("/workspace/accounting/notes", data)
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

// --- MARKETING API ---
export const createMarketingCampaign = async (data: any) => {
  const res = await api.post("/workspace/marketing/campaigns", data)
  return res.data
}

export const getMarketingCampaigns = async () => {
  const res = await api.get("/workspace/marketing/campaigns")
  return res.data
}

