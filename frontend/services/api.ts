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