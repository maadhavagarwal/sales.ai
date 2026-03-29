import axios from "axios"
import { clearAuthToken, getAuthToken, ORG_ID_KEY } from "@/lib/session"

const ENV_API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim()
const normalizeApiBase = (base: string) => {
  const trimmed = base.trim().replace(/\/$/, "")
  if (!trimmed) return ""

  // If an absolute backend host is provided, ensure requests target v1 API root.
  if (/^https?:\/\//i.test(trimmed) && !/\/api\/v1$/i.test(trimmed)) {
    return `${trimmed}/api/v1`
  }
  return trimmed
}

const ENV_API_BASE = normalizeApiBase(ENV_API_URL)
const API_BASE_CANDIDATES = Array.from(
  new Set([
    "/api/backend/api/v1", // Most robust through Next route proxy
    "/api/v1", // Direct rewrite path for local dev
    "/api/backend", // Legacy proxy base
    ...(ENV_API_BASE ? [ENV_API_BASE] : []),
  ]),
)
const API_URL = API_BASE_CANDIDATES[0]

const buildApiUrl = (path: string) => {
  if (path.startsWith("/")) {
    return `${API_URL}${path}`
  }
  return `${API_URL}/${path}`
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

export interface ApiErrorShape {
  status: number
  message: string
  requestId?: string
}

const normalizeBase = (base?: string) => (base || "").replace(/\/$/, "")

const shouldRetryWithAlternateBase = (error: any) => {
  const networkError = error?.code === "ERR_NETWORK"
  const proxyConnectionError =
    error?.response?.status === 502 &&
    String(error?.response?.data?.error || "").toLowerCase().includes("backend proxy connection failed")
  return networkError || proxyConnectionError
}

const shouldRetryWithClearedOrgContext = (error: any) => {
  const status = Number(error?.response?.status || 0)
  if (status !== 404) return false

  const detail = String(error?.response?.data?.detail || "").toLowerCase()
  return detail.includes("organization") && detail.includes("not found")
}

const shouldClearAuthOnUnauthorized = (error: any) => {
  const status = Number(error?.response?.status || 0)
  if (status !== 401) return false

  const detail = String(error?.response?.data?.detail || "").toLowerCase()
  const backendError = String(error?.response?.data?.error || "").toLowerCase()
  const msg = `${detail} ${backendError}`

  // Clear only when token itself is invalid/expired/account-missing.
  return (
    msg.includes("decode failed") ||
    msg.includes("missing email claim") ||
    msg.includes("account not found") ||
    msg.includes("invalid token") ||
    msg.includes("signature has expired")
  )
}

// Request Interceptor for Auth
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getAuthToken()
    const orgId = localStorage.getItem(ORG_ID_KEY)
    const requestId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (orgId) {
      config.headers["X-Org-Id"] = orgId
    }
    config.headers["X-Request-ID"] = requestId
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as any
    if (!config) {
      const backendError = error?.response?.data?.error
      if (backendError && typeof backendError === "object") {
        error.message = backendError.message || error.message
      } else if (typeof backendError === "string" && backendError.trim()) {
        error.message = backendError
      }
      return Promise.reject(error)
    }

    // Recover from stale tenant context in localStorage by clearing org id and retrying once.
    if (!config.__retriedWithoutOrg && shouldRetryWithClearedOrgContext(error) && typeof window !== "undefined") {
      localStorage.removeItem(ORG_ID_KEY)
      config.__retriedWithoutOrg = true
      if (config.headers) {
        delete config.headers["X-Org-Id"]
      }
      return axios.request(config)
    }

    if (config.__retriedWithAlternateBase || !shouldRetryWithAlternateBase(error)) {
      if (shouldClearAuthOnUnauthorized(error) && typeof window !== "undefined") {
        clearAuthToken()
        localStorage.removeItem(ORG_ID_KEY)
      }
      const backendError = error?.response?.data?.error
      if (backendError && typeof backendError === "object") {
        error.message = backendError.message || error.message
      } else if (typeof backendError === "string" && backendError.trim()) {
        error.message = backendError
      }
      return Promise.reject(error)
    }

    const currentBase = normalizeBase(config.baseURL || api.defaults.baseURL)
    const alternateBase = API_BASE_CANDIDATES.find((base) => normalizeBase(base) !== currentBase)
    if (!alternateBase) {
      return Promise.reject(error)
    }

    config.__retriedWithAlternateBase = true
    config.baseURL = alternateBase
    return axios.request(config)
  },
)

export const normalizeApiError = (error: any): ApiErrorShape => {
  const status = Number(error?.response?.status || 0)
  const responseError = error?.response?.data?.error

  if (typeof responseError === "object" && responseError) {
    return {
      status,
      message: String(responseError.message || "Request failed"),
      requestId: responseError.request_id ? String(responseError.request_id) : undefined,
    }
  }

  if (typeof responseError === "string" && responseError.trim()) {
    return { status, message: responseError }
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return { status, message: error.message }
  }

  return { status, message: "Unexpected request error" }
}

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

export interface EntitlementsResponse {
  company_id: string
  plan: string
  status: string
  features: string[]
}

export interface OrganizationSummaryResponse {
  company_id: string
  company_name: string
  industry: string
  hq_location: string
  counts: {
    users: number
    customers: number
    invoices: number
    inventory: number
    expenses: number
    segments: number
  }
  checklist: {
    profile_configured: boolean
    data_uploaded: boolean
    finance_ready: boolean
    segment_ready: boolean
    team_ready: boolean
  }
  checklist_score: number
  modules: Record<string, { status: string; records: number }>
}

export interface OrganizationUser {
  id: number
  email: string
  role: string
  created_at: string
}

export interface OrganizationInvite {
  id: number
  email: string
  role: string
  status: string
  invited_by?: number
  created_at: string
  invite_token?: string
  expires_at?: string
}

export interface BillingEvent {
  id: number
  actor_email?: string
  event_type: string
  status: string
  details?: Record<string, any>
  created_at: string
}

export interface BillingSubscriptionState {
  company_id: string
  provider: string
  provider_customer_id?: string | null
  provider_subscription_id?: string | null
  plan_code: string
  lifecycle_status: string
  status_reason?: string | null
  grace_ends_at?: string | null
  current_period_end?: string | null
  canceled_at?: string | null
  updated_at?: string | null
}

export interface BillingProrationQuote {
  company_id: string
  current_plan: string
  target_plan: string
  current_price_inr?: number
  target_price_inr?: number
  proration_delta_inr: number
  days_remaining: number
  lifecycle_status: string
  note?: string
}

export interface BillingTaxInvoice {
  id: number
  invoice_number: string
  billing_event_id: number
  event_type: string
  currency: string
  subtotal_inr: number
  gst_rate: number
  gst_amount_inr: number
  cgst_inr: number
  sgst_inr: number
  igst_inr: number
  total_inr: number
  seller_gstin?: string
  buyer_gstin?: string
  compliance_hash?: string
  status: string
  issued_at: string
}

export interface AnalyticsJob {
  id: number
  submitted_by?: string
  job_type: "summary_rollup" | "monthly_revenue" | string
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | string
  attempts: number
  error_message?: string
  queued_at?: string
  started_at?: string
  completed_at?: string
}

export interface OperationsOverview {
  company_id: string
  timestamp: string
  overall_status: string
  systems: Record<string, any>
  signals: {
    analytics_queue: {
      queued: number
      running: number
      failed: number
      completed: number
    }
    billing_failures: number
    security_incidents_recent: number
    high_severity_incidents_recent: number
  }
}

export interface OperationsRunbook {
  id: string
  title: string
  severity: string
  steps: string[]
  owner: string
}

export interface BackupDrillHistoryItem {
  id: number
  initiated_by?: string
  status: string
  summary: Record<string, any>
  evidence_hash: string
  executed_at: string
}

export interface DataLineageItem {
  id: number
  source_type: string
  source_ref?: string
  transform_stage: string
  output_ref?: string
  metadata?: Record<string, any>
  created_by?: string
  created_at: string
}

export interface ModelVersionItem {
  id: number
  model_name: string
  version_tag: string
  status: string
  notes?: string
  metadata?: Record<string, any>
  created_by?: string
  created_at: string
}

export interface RbacCoverageItem {
  module: string
  action: string
  required_roles: string[]
  ui_guarded: boolean
}

export interface ApiVersioningPolicy {
  effective_date: string
  current_version: string
  supported_versions: Array<{ version: string; status: string; sunset_date?: string | null }>
  deprecation_policy: {
    notice_period_days: number
    communication_channels: string[]
    breaking_change_window: string
  }
  endpoint_prefix_rules: {
    versioned_prefix_required: boolean
    allowed_prefixes: string[]
    legacy_prefixes: string[]
  }
}

export interface OrganizationActivityItem {
  id: number
  user_id?: number
  action: string
  module: string
  entity_id?: string
  details?: Record<string, any>
  timestamp: string
  event_hash?: string
  severity?: "info" | "low" | "medium" | "high" | "critical" | string
}

export interface OrganizationSettings {
  company_id: string
  name: string
  industry: string
  hq_location: string
  seat_limit: number
  security: {
    idle_timeout: number
    require_mfa: boolean
    ip_allowlist_enabled: boolean
  }
}

export interface OrganizationSeatUsage {
  company_id: string
  plan: string
  seat_limit: number
  active_users: number
  pending_invites: number
  used_total: number
  available: number
  over_limit: boolean
}

// API Functions
export const getCustomers = async () => {
  try {
    const res = await api.get('/workspace/customers')
    return Array.isArray(res.data) ? res.data : res.data?.customers || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
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

export const getInvoices = async (datasetId?: string) => {
  try {
    const res = await api.get('/workspace/invoices', { params: { dataset_id: datasetId } })
    return Array.isArray(res.data) ? res.data : res.data?.invoices || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const createInvoice = async (data: any) => {
    const res = await api.post('/workspace/invoices', data)
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



export const getInventory = async () => {
  try {
    const res = await api.get('/workspace/inventory')
    return Array.isArray(res.data) ? res.data : res.data?.inventory || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const getInventoryHealth = async () => {
    try {
        const res = await api.get('/workspace/inventory/health')
        return res.data || { status: 'unknown' }
    } catch (err: any) {
        if (err.response?.status === 404) return { status: 'unavailable' }
        throw err
    }
}

export const addInventoryItem = async (data: any) => {
    const res = await api.post('/workspace/inventory', data)
    return res.data
}

export const deleteInventoryItem = async (itemId: string | number) => {
    const res = await api.delete(`/workspace/inventory/${itemId}`)
    return res.data
}

export const getLedger = async () => {
  try {
    const res = await api.get('/workspace/ledger')
    return Array.isArray(res.data) ? res.data : res.data?.ledger || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
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

export const uploadUniversalFile = uploadBulkFiles

export const postOrganizationInitialize = async (data: any) => {
  const res = await api.post('/onboarding/initialize', data)
  return res.data
}

export interface OnboardingTemplate {
  id: string
  name: string
  description: string
  workspaces: [string, string][]
}

export const getOnboardingTemplates = async (): Promise<{ items: OnboardingTemplate[]; count: number }> => {
  try {
    const res = await api.get('/onboarding/templates')
    return res.data || { items: [], count: 0 }
  } catch (err: any) {
    if (err.response?.status === 404) return { items: [], count: 0 }
    throw err
  }
}

export const getOnboardingLaunchGates = async (): Promise<{
  company_id?: string
  onboarding_complete: boolean
  gates: Record<string, boolean>
  score: number
  blockers: string[]
}> => {
  try {
    const res = await api.get('/onboarding/launch-gates')
    return res.data || { onboarding_complete: false, gates: {}, score: 0, blockers: [] }
  } catch (err: any) {
    if (err.response?.status === 404) return { onboarding_complete: false, gates: {}, score: 0, blockers: [] }
    throw err
  }
}

export const getWorkspaceIntegrity = async () => {
    try {
        const res = await api.get('/workspace/integrity')
        return res.data || {}
    } catch (err: any) {
    if ([401, 403, 404].includes(Number(err.response?.status))) return {}
        throw err
    }
}

export const getUserState = async () => {
    try {
        const res = await api.get('/workspace/user/state')
        return res.data || {}
    } catch (err: any) {
    if ([401, 403, 404].includes(Number(err.response?.status))) return {}
        throw err
    }
}

export const saveUserState = async (state: any) => {
  try {
    const res = await api.post('/workspace/user/state', state)
    return res.data
  } catch (err: any) {
    if ([401, 403, 404].includes(Number(err.response?.status))) {
    return { status: 'SKIPPED' }
    }
    throw err
  }
}

export const getUploadStatus = async (datasetId: string) => {
  try {
    const res = await api.get(`/upload-status/${datasetId}`)
    return res.data || {}
  } catch (err: any) {
    if (err.response?.status === 404) return {}
    throw err
  }
}

export const getCopilotResponse = async (query: string, datasetId?: string) => {
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
  try {
    const res = await api.get(`/dashboard-config/${datasetId}`)
    return res.data || {}
  } catch (err: any) {
    if (err.response?.status === 404) return {}
    throw err
  }
}

export const downloadStrategicPlanPDF = (datasetId: string) => {
  window.open(buildApiUrl(`/strategic-plan-pdf/${datasetId}`), "_blank")
}

export const reprocessDataset = async (datasetId: string, sheetName: string) => {
  const res = await api.post(`/reprocess/${datasetId}`, { sheet_name: sheetName })
  return res.data
}

export const getLiveKPIs = async () => {
  const res = await api.get('/api/live-kpis')
  return res.data
}

export const getModulesStatus = async () => {
  const res = await api.get('/api/modules-status')
  return res.data
}

export const getSaasReadiness = async () => {
  const res = await api.get('/system/saas-readiness')
  return res.data
}

export const getEntitlements = async (): Promise<EntitlementsResponse> => {
  const res = await api.get('/system/entitlements')
  return res.data
}

export const getOrganizationSummary = async (): Promise<OrganizationSummaryResponse> => {
  const res = await api.get('/system/organization/summary')
  return res.data
}

export const getOrganizationUsers = async (): Promise<{ users: OrganizationUser[]; count: number }> => {
  const res = await api.get('/system/organization/users')
  return res.data
}

export const updateOrganizationUserRole = async (userId: number, role: string) => {
  const res = await api.put(`/system/organization/users/${userId}/role`, { role })
  return res.data
}

export const getOrganizationInvites = async (): Promise<{ invites: OrganizationInvite[]; count: number }> => {
  const res = await api.get('/system/organization/invites')
  return res.data
}

export const createOrganizationInvite = async (email: string, role: string) => {
  const res = await api.post('/system/organization/invites', { email, role })
  return res.data
}

export const revokeOrganizationInvite = async (inviteId: number) => {
  const res = await api.post(`/system/organization/invites/${inviteId}/revoke`)
  return res.data
}

export const acceptOrganizationInvite = async (inviteId: number) => {
  const res = await api.post(`/system/organization/invites/${inviteId}/accept`)
  return res.data
}

export const getBillingHistory = async (): Promise<{ events: BillingEvent[]; count: number }> => {
  const res = await api.get('/system/billing/history')
  return res.data
}

export const getBillingSubscriptionState = async (): Promise<BillingSubscriptionState> => {
  const res = await api.get('/system/billing/subscription')
  return res.data
}

export const getBillingProrationQuote = async (targetPlan: string): Promise<BillingProrationQuote> => {
  const res = await api.get('/system/billing/proration-quote', { params: { target_plan: targetPlan } })
  return res.data
}

export const applyBillingPlanChange = async (payload: { target_plan: string; effective_mode: "IMMEDIATE" | "PERIOD_END"; reason?: string }) => {
  const res = await api.post('/system/billing/plan-change', payload)
  return res.data
}

export const requestBillingRefund = async (payload: { amount_inr: number; reason: string; reference_event_id?: number }) => {
  const res = await api.post('/system/billing/refunds', payload)
  return res.data
}

export const generateBillingTaxInvoice = async (billingEventId: number, gstRate = 18) => {
  const res = await api.post('/system/billing/invoices/generate', { billing_event_id: billingEventId, gst_rate: gstRate })
  return res.data
}

export const getBillingTaxInvoices = async (): Promise<{ items: BillingTaxInvoice[]; count: number }> => {
  const res = await api.get('/system/billing/invoices')
  return res.data
}

export const downloadBillingTaxInvoice = (invoiceNumber: string) => {
  window.open(buildApiUrl(`/system/billing/invoices/${invoiceNumber}/download`), "_blank")
}

export const exportBillingTaxInvoicesCsv = () => {
  window.open(buildApiUrl(`/system/billing/invoices/export.csv`), "_blank")
}

export const enqueueAnalyticsJob = async (jobType: "summary_rollup" | "monthly_revenue", params: Record<string, any> = {}) => {
  const res = await api.post('/system/jobs/analytics', { job_type: jobType, params })
  return res.data
}

export const listAnalyticsJobs = async (): Promise<{ items: AnalyticsJob[]; count: number }> => {
  const res = await api.get('/system/jobs/analytics')
  return res.data
}

export const getAnalyticsJob = async (jobId: number) => {
  const res = await api.get(`/system/jobs/analytics/${jobId}`)
  return res.data
}

export const retryAnalyticsJob = async (jobId: number) => {
  const res = await api.post(`/system/jobs/analytics/${jobId}/retry`)
  return res.data
}

export const getOperationsOverview = async (): Promise<OperationsOverview> => {
  const res = await api.get('/system/operations/overview')
  return res.data
}

export const getOperationsRunbooks = async (): Promise<{ items: OperationsRunbook[]; count: number }> => {
  const res = await api.get('/system/operations/runbooks')
  return res.data
}

export const runOperationsBackupDrill = async () => {
  const res = await api.post('/system/operations/backup-drill/run')
  return res.data
}

export const getOperationsBackupDrillHistory = async (): Promise<{ items: BackupDrillHistoryItem[]; count: number }> => {
  const res = await api.get('/system/operations/backup-drill/history')
  return res.data
}

export const getDataLineage = async (): Promise<{ items: DataLineageItem[]; count: number }> => {
  const res = await api.get('/system/operations/data-lineage')
  return res.data
}

export const getModelVersions = async (): Promise<{ items: ModelVersionItem[]; count: number }> => {
  const res = await api.get('/system/operations/model-versions')
  return res.data
}

export const createModelVersion = async (payload: {
  model_name: string
  version_tag: string
  status: "ACTIVE" | "SHADOW" | "DEPRECATED" | "ROLLED_BACK"
  notes?: string
  metadata?: Record<string, any>
}) => {
  const res = await api.post('/system/operations/model-versions', payload)
  return res.data
}

export const getRbacCoverage = async (): Promise<{
  summary: { total_actions: number; covered_actions: number; coverage_score: number; status: string }
  items: RbacCoverageItem[]
}> => {
  const res = await api.get('/system/operations/rbac/coverage')
  return res.data
}

export const getApiVersioningPolicy = async (): Promise<ApiVersioningPolicy> => {
  const res = await api.get('/system/api/versioning-policy')
  return res.data
}

export const getQualityGates = async (): Promise<{
  summary: { score: number; status: string }
  gates: Array<{ name: string; status: string; required: boolean }>
}> => {
  const res = await api.get('/system/operations/quality-gates')
  return res.data
}

export const getDeploymentWorkflow = async () => {
  const res = await api.get('/system/operations/deployment-workflow')
  return res.data
}

export const getLaunchFinalReview = async () => {
  const res = await api.get('/system/operations/launch-final-review')
  return res.data
}

export const getOrganizationActivity = async (): Promise<{ items: OrganizationActivityItem[]; count: number }> => {
  const res = await api.get('/system/organization/activity')
  return res.data
}

export const getOrganizationSettings = async (): Promise<OrganizationSettings> => {
  const res = await api.get('/system/organization/settings')
  return res.data
}

export const getOrganizationSeatUsage = async (): Promise<OrganizationSeatUsage> => {
  const res = await api.get('/system/organization/seats')
  return res.data
}

export const updateOrganizationSettings = async (payload: Partial<OrganizationSettings>) => {
  const res = await api.put('/system/organization/settings', payload)
  return res.data
}

export const acceptOrganizationInviteByToken = async (inviteToken: string) => {
  const res = await api.post('/system/organization/invites/accept-token', { invite_token: inviteToken })
  return res.data
}

export interface UserSecuritySettings {
  user_id: number
  email: string
  idle_timeout: number
  mfa_enabled: boolean
  allowed_ips: string[]
}

export const getOrganizationUserSecurity = async (userId: number): Promise<UserSecuritySettings> => {
  const res = await api.get(`/system/organization/users/${userId}/security`)
  return res.data
}

export const updateOrganizationUserSecurity = async (userId: number, payload: { idle_timeout: number; mfa_enabled: boolean; allowed_ips: string[] | string }) => {
  const res = await api.put(`/system/organization/users/${userId}/security`, payload)
  return res.data
}

export const getCRMAnalytics = async () => {
  const res = await api.get('/api/crm/analytics')
  return res.data
}

export const getOperationsData = async () => {
  const res = await api.get('/operations')
  return res.data
}

export const manageOperationsPersonnel = async (op: string, data: any) => {
  const res = await api.post('/operations/personnel', { op, data })
  return res.data
}

export const manageOperationsTask = async (op: string, data: any) => {
  const res = await api.post('/operations/tasks', { op, data })
  return res.data
}

export const manageOperationsSchedule = async (op: string, data: any) => {
  const res = await api.post('/operations/schedules', { op, data })
  return res.data
}

export const syncWorkspaceToDashboard = async () => {
  try {
    const res = await api.post('/workspace/sync-to-dashboard')
    return res.data
  } catch (error: any) {
    // Handle 400 error when no data is available
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.error || "No data available"
      const err = new Error(errorMsg)
      ;(err as any).statusCode = 400
      throw err
    }
    throw error
  }
}

export const getInvoicesByStatus = async (status: string) => {
  const res = await api.get(`/workspace/invoices/status/${status}`)
  return res.data
}

export const updateInvoiceStatus = async (invoiceId: string, status: string) => {
  const res = await api.put(`/workspace/invoices/${invoiceId}/status`, { status })
  return res.data
}

export const getCommSentiment = async () => {
    const res = await api.get('/workspace/comm/sentiment')
    return res.data
}

export const summarizeMeeting = async (meetingId: string, notes: string) => {
    const res = await api.post(`/workspace/comm/meetings/${meetingId}/summarize`, { notes })
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

export const updateInventoryItem = async (itemId: string | number, data: any) => {
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

export const updateLedgerEntry = async (entryId: string | number, data: any) => {
  const res = await api.put(`/workspace/ledger/entries/${entryId}`, data)
  return res.data
}

export const deleteLedgerEntry = async (entryId: string | number) => {
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
  const res = await api.post('/auth/register', data)
  return res.data
}

export const loginUser = async (data: any) => {
  const res = await api.post('/auth/login', data)
  return res.data
}

export const getMarketingCampaigns = async () => {
  try {
    const res = await api.get('/workspace/marketing/campaigns')
    return Array.isArray(res.data) ? res.data : res.data?.campaigns || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const manageMarketingCampaign = async (action: 'CREATE' | 'UPDATE' | 'DELETE', data: any = {}) => {
  try {
    const url = action === 'CREATE' ? '/workspace/marketing/campaigns' : `/workspace/marketing/campaigns/${data.id || data}`
    const method = action === 'CREATE' ? 'post' : action === 'UPDATE' ? 'put' : 'delete'
    const res = await api[method](url, data)
    return res.data
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, message: 'Endpoint not yet implemented' }
    throw err
  }
}

export const createMarketingCampaign = (data: any) => manageMarketingCampaign('CREATE', data)
export const updateMarketingCampaign = (id: number, data: any) => manageMarketingCampaign('UPDATE', { ...data, id })
export const deleteMarketingCampaign = (id: number) => manageMarketingCampaign('DELETE', id)

export const getCustomerLedger = async (customerId: string) => {
  try {
    const res = await api.get(`/workspace/accounting/ledger/customer/${customerId}`)
    const d = res.data
    if (Array.isArray(d)) return d
    if (Array.isArray(d?.entries)) return d.entries
    return d?.customer_ledger || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const sendPaymentReminder = async (invoiceId: string) => {
  try {
    const res = await api.post(`/workspace/accounting/reminders/${invoiceId}`)
    return res.data
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, message: 'Endpoint not yet implemented' }
    throw err
  }
}
export const sendInvoiceReminder = sendPaymentReminder

export const getCFOHealthReport = async () => {
  try {
    const res = await api.get('/workspace/accounting/cfo-report')
    return res.data || {}
  } catch (err: any) {
    if (err.response?.status === 404) return {}
    throw err
  }
}

export const getDaybook = async () => {
  try {
    const res = await api.get('/workspace/accounting/daybook')
    return Array.isArray(res.data) ? res.data : res.data?.daybook || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const getTrialBalance = async () => {
  try {
    const res = await api.get('/workspace/accounting/trial-balance')
    return Array.isArray(res.data) ? res.data : res.data?.trial_balance || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const getPLStatement = async () => {
  try {
    const res = await api.get('/workspace/accounting/pl-statement')
    const d = res.data
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      return (d as any).pl_statement || d
    }
    return Array.isArray(d) ? d : []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const getBalanceSheet = async () => {
  try {
    const res = await api.get('/workspace/accounting/balance-sheet')
    const d = res.data
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      return (d as any).balance_sheet || d
    }
    return Array.isArray(d) ? d : []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const getGSTReports = async () => {
  try {
    const res = await api.get('/workspace/accounting/gst')
    const d = res.data
    if (d && typeof d === 'object' && 'gstr1' in d) return d
    return Array.isArray(d) ? d : d?.gst_reports || null
  } catch (err: any) {
    if (err.response?.status === 404) return null
    throw err
  }
}

export const recordPayment = async (data: any) => {
  try {
    const res = await api.post('/workspace/accounting/payments', data)
    return res.data
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, message: 'Endpoint not yet implemented' }
    throw err
  }
}

export const reconcileBankStatement = async (entries: any[]) => {
  try {
    const res = await api.post('/workspace/accounting/reconcile', { entries })
    return res.data
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, message: 'Endpoint not yet implemented' }
    throw err
  }
}

export const getUsageStats = async () => {
  try {
    const res = await api.get('/workspace/usage-stats')
    return res.data || {}
  } catch (err: any) {
    if (err.response?.status === 404) return {}
    throw err
  }
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
  try {
    const res = await api.post("/workspace/marketing/whatsapp-send", { phone, message })
    return res.data || { success: false }
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "WhatsApp module not available" }
    throw err
  }
}

export const scheduleReport = async (reportType: string, email: string, frequency: string) => {
  try {
    const res = await api.post("/workspace/reports/schedule", { report_type: reportType, email, frequency })
    return res.data || { success: false }
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "Report scheduling not available" }
    throw err
  }
}

export const getAuditLogs = async () => {
  try {
    const res = await api.get("/workspace/audit-logs")
    return Array.isArray(res.data) ? res.data : res.data?.logs || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const getHealthScores = async () => {
  try {
    const res = await api.get("/crm/health-scores")
    return res.data || {}
  } catch (err: any) {
    if (err.response?.status === 404) return {}
    throw err
  }
}

export const getPredictiveCRMInsights = async () => {
    try {
        const res = await api.get("/crm/predictive-insights")
        return res.data?.insights || []
    } catch (err: any) {
        if (err.response?.status === 404) return []
        throw err
    }
}

export const downloadBusinessReport = () => {
  window.open(buildApiUrl(`/workspace/business-report/download`), "_blank")
}

export const getDeals = async () => {
  try {
    const res = await api.get("/workspace/crm/deals")
    return Array.isArray(res.data) ? res.data : res.data?.deals || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const manageDeal = async (action: "CREATE" | "UPDATE" | "DELETE", data: any) => {
  try {
    if (action === "CREATE") return (await api.post("/workspace/crm/deals", data)).data || { success: false }
    if (action === "UPDATE") return (await api.put(`/workspace/crm/deals/${data.id}`, data)).data || { success: false }
    return null
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "CRM module not available" }
    throw err
  }
}

// --- PROCUREMENT & PO API ---
export const managePurchaseOrders = async (action: "CREATE" | "RECEIVE" | "LIST", data: any = {}) => {
  try {
    const res = await api.post("/workspace/procurement/po", { action, ...data })
    return res.data || { success: false }
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "Procurement module not available" }
    throw err
  }
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
  try {
    const res = await api.get("/api/anomalies/alerts")
    return res.data || { alerts: [] }
  } catch (err: any) {
    if (err.response?.status === 404) return { alerts: [] }
    throw err
  }
}

export const getCashFlowForecast = async () => {
    try {
        const res = await api.get("/workspace/accounting/cash-flow-gap")
        return res.data || {}
    } catch (err: any) {
        if (err.response?.status === 404) return {}
        throw err
    }
}

export const simulateWhatIf = async (query: string) => {
    try {
        const res = await api.post("/ai/intelligence/what-if", { query })
        return res.data || {}
    } catch (err: any) {
        if (err.response?.status === 404) return { simulation: null, error: "What-if simulation not available yet" }
        throw err
    }
}

export const transferInventory = async (data: {
  sku: string
  quantity: number
  from_location: string
  to_location: string
}) => {
  try {
    const res = await api.post("/workspace/inventory/transfer", data)
    return res.data || { success: false }
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "Inventory transfer not available" }
    throw err
  }
}

export const getInventoryTransfers = async () => {
  try {
    const res = await api.get("/workspace/inventory/transfers")
    return Array.isArray(res.data) ? res.data : res.data?.transfers || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

export const downloadGSTR1Json = () => {
  window.open(buildApiUrl(`/workspace/accounting/gst/gstr1-json`), "_blank")
}

export const getWorkingCapital = async () => {
  try {
    const res = await api.get("/workspace/accounting/working-capital")
    return res.data || {}
  } catch (err: any) {
    if (err.response?.status === 404) return {}
    throw err
  }
}

// --- HR MODULE API ---
export const getEmployees = async () => {
  try {
    const res = await api.get("/workspace/hr/employees")
    return Array.isArray(res.data) ? res.data : res.data?.employees || []
  } catch (err: any) {
    if ([404, 429, 500].includes(Number(err.response?.status || 0))) return []
    throw err
  }
}
export const addEmployee = async (data: any) => {
  try {
    const res = await api.post("/workspace/hr/employees", data)
    return res.data || { success: false }
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "HR module not available" }
    throw err
  }
}
export const getHRStats = async () => {
  try {
    const res = await api.get("/workspace/hr/stats")
    return res.data || {}
  } catch (err: any) {
    if ([404, 429, 500].includes(Number(err.response?.status || 0))) return {}
    throw err
  }
}

// --- FINANCE MODULE API ---
export const getFinanceSummary = async (datasetId?: string) => {
  try {
    const res = await api.get(`/workspace/finance/summary${datasetId ? `?dataset_id=${datasetId}` : ''}`)
    return res.data || {}
  } catch (err: any) {
    if ([404, 429, 500].includes(Number(err.response?.status || 0))) return {}
    throw err
  }
}
export const getBudgets = async () => {
  try {
    const res = await api.get("/workspace/finance/budgets")
    return Array.isArray(res.data) ? res.data : res.data?.budgets || []
  } catch (err: any) {
    if ([404, 429, 500].includes(Number(err.response?.status || 0))) return []
    throw err
  }
}

// --- COMMUNICATION MODULE API ---
export const getMeetings = async () => {
  try {
    const res = await api.get("/workspace/comm/meetings")
    return Array.isArray(res.data) ? res.data : res.data?.meetings || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}
export const createMeeting = async (data: any) => {
  try {
    const res = await api.post("/workspace/comm/meetings", data)
    return res.data || { success: false }
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "Communication module not available" }
    throw err
  }
}
export const getTeamMessages = async () => {
  try {
    const res = await api.get("/workspace/comm/messages")
    return Array.isArray(res.data) ? res.data : res.data?.messages || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}
export const sendTeamMessage = async (sender: string, text: string) => {
  try {
    const res = await api.post("/workspace/comm/messages", { sender, text })
    return res.data || { success: false }
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "Communication module not available" }
    throw err
  }
}
export const sendDirectEmail = async (to: string, subject: string, body: string) => {
  try {
    const res = await api.post("/workspace/comm/email/send", { to, subject, body })
    return res.data || { success: false }
  } catch (err: any) {
    if (err.response?.status === 404) return { success: false, error: "Email module not available" }
    throw err
  }
}
export const getOutboundEmails = async () => {
  try {
    const res = await api.get("/workspace/comm/email/history")
    return Array.isArray(res.data) ? res.data : res.data?.emails || []
  } catch (err: any) {
    if (err.response?.status === 404) return []
    throw err
  }
}

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

export const getDerivativesSnapshot = async (data: any = {}) => {
    const res = await api.post("/workspace/accounting/derivatives", data)
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

export const getTallySyncStatus = async () => {
    const res = await api.get("/api/tally/status")
    return res.data
}

export const triggerTallySync = async () => {
    const res = await api.post("/api/tally/sync")
    return res.data
}

export interface AdoptionConfidenceReport {
  generated_at: string
  company_id?: string
  confidence_score: number
  confidence_level: "HIGH" | "MEDIUM" | "LOW"
  overall: "GO" | "HOLD"
  blockers: string[]
  system_readiness?: {
    overall: string
    score: number
    blockers: string[]
  }
}

export const getAdoptionConfidence = async (): Promise<AdoptionConfidenceReport> => {
  const res = await api.get("/system/adoption/confidence")
  return res.data
}

export const getAdoptionIncidentReadiness = async () => {
  const res = await api.get("/system/adoption/incident-readiness")
  return res.data
}

export const runAdoptionBackupDrill = async () => {
  const res = await api.post("/system/adoption/backup-drill")
  return res.data
}

export const runAdoptionParityCheck = async (source_counts: Record<string, number>, tolerance = 0) => {
  const res = await api.post("/system/adoption/parity", { source_counts, tolerance })
  return res.data
}

export const runMigrationVerification = async (
  source_counts?: Record<string, number>,
  tolerance = 0,
) => {
  const res = await api.post("/system/adoption/migration/verify", {
    source_counts,
    tolerance,
  })
  return res.data
}
