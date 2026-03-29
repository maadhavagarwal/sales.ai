"use client"

import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Badge, Card, Button } from "@/components/ui"
import { useStore } from "@/store/useStore"
import { getAuthToken } from "@/lib/session"
import {
  getSaasReadiness,
  getEntitlements,
  EntitlementsResponse,
  getOrganizationSummary,
  OrganizationSummaryResponse,
  getOrganizationUsers,
  getOrganizationSeatUsage,
  updateOrganizationUserRole,
  getOrganizationInvites,
  createOrganizationInvite,
  revokeOrganizationInvite,
  acceptOrganizationInvite,
  getBillingHistory,
  getBillingSubscriptionState,
  getBillingProrationQuote,
  applyBillingPlanChange,
  requestBillingRefund,
  generateBillingTaxInvoice,
  getBillingTaxInvoices,
  downloadBillingTaxInvoice,
  exportBillingTaxInvoicesCsv,
  enqueueAnalyticsJob,
  listAnalyticsJobs,
  retryAnalyticsJob,
  getOperationsOverview,
  getOperationsRunbooks,
  runOperationsBackupDrill,
  getOperationsBackupDrillHistory,
  getDataLineage,
  getModelVersions,
  createModelVersion,
  getRbacCoverage,
  getApiVersioningPolicy,
  getQualityGates,
  getDeploymentWorkflow,
  getLaunchFinalReview,
  BillingEvent,
  BillingSubscriptionState,
  BillingProrationQuote,
  BillingTaxInvoice,
  getOrganizationActivity,
  OrganizationActivityItem,
  getOrganizationSettings,
  OrganizationSettings,
  updateOrganizationSettings,
  getOrganizationUserSecurity,
  updateOrganizationUserSecurity,
  UserSecuritySettings,
  OrganizationUser,
  OrganizationInvite,
  OrganizationSeatUsage,
  AnalyticsJob,
  OperationsOverview,
  OperationsRunbook,
  BackupDrillHistoryItem,
  DataLineageItem,
  ModelVersionItem,
  RbacCoverageItem,
  ApiVersioningPolicy,
} from "@/services/api"
import { ShieldCheck, Radar, Rocket } from "lucide-react"

type ReadinessResponse = {
  status: string
  score: number
  checks: Record<string, boolean>
  tenant: {
    company_id?: string
    role?: string
  }
}

const CHECK_LABELS: Record<string, string> = {
  auth_secret_configured: "Secure auth secret",
  strict_production_mode: "Strict production mode",
  production_like_database: "Production database",
  synthetic_kpi_simulator_disabled: "Synthetic KPI simulator disabled",
  request_tracing_enabled: "Request trace headers",
  tenant_context_present: "Tenant context available",
}

export default function EnterpriseControlPage() {
  const { userEmail, userRole } = useStore()
  const [data, setData] = useState<ReadinessResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null)
  const [entLoading, setEntLoading] = useState(false)
  const [orgSummary, setOrgSummary] = useState<OrganizationSummaryResponse | null>(null)
  const [users, setUsers] = useState<OrganizationUser[]>([])
  const [invites, setInvites] = useState<OrganizationInvite[]>([])
  const [seatUsage, setSeatUsage] = useState<OrganizationSeatUsage | null>(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("VIEWER")
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([])
  const [billingSubscription, setBillingSubscription] = useState<BillingSubscriptionState | null>(null)
  const [billingStatusFilter, setBillingStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL")
  const [billingTypeFilter, setBillingTypeFilter] = useState<string>("ALL")
  const [billingInvoices, setBillingInvoices] = useState<BillingTaxInvoice[]>([])
  const [analyticsJobs, setAnalyticsJobs] = useState<AnalyticsJob[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsActionMsg, setAnalyticsActionMsg] = useState<string | null>(null)
  const [operationsOverview, setOperationsOverview] = useState<OperationsOverview | null>(null)
  const [operationsRunbooks, setOperationsRunbooks] = useState<OperationsRunbook[]>([])
  const [backupDrills, setBackupDrills] = useState<BackupDrillHistoryItem[]>([])
  const [lineageItems, setLineageItems] = useState<DataLineageItem[]>([])
  const [modelVersions, setModelVersions] = useState<ModelVersionItem[]>([])
  const [rbacCoverage, setRbacCoverage] = useState<{ summary: { coverage_score: number; status: string; total_actions: number; covered_actions: number }; items: RbacCoverageItem[] } | null>(null)
  const [apiPolicy, setApiPolicy] = useState<ApiVersioningPolicy | null>(null)
  const [qualityGates, setQualityGates] = useState<{ summary: { score: number; status: string }; gates: Array<{ name: string; status: string; required: boolean }> } | null>(null)
  const [deploymentWorkflow, setDeploymentWorkflow] = useState<any>(null)
  const [launchFinalReview, setLaunchFinalReview] = useState<any>(null)
  const [modelName, setModelName] = useState("RevenueForecast")
  const [modelVersionTag, setModelVersionTag] = useState("v1.0.0")
  const [modelVersionStatus, setModelVersionStatus] = useState<"ACTIVE" | "SHADOW" | "DEPRECATED" | "ROLLED_BACK">("ACTIVE")
  const [modelVersionNotes, setModelVersionNotes] = useState("")
  const [targetPlan, setTargetPlan] = useState<"FREE" | "PRO" | "ENTERPRISE">("ENTERPRISE")
  const [effectiveMode, setEffectiveMode] = useState<"IMMEDIATE" | "PERIOD_END">("IMMEDIATE")
  const [prorationQuote, setProrationQuote] = useState<BillingProrationQuote | null>(null)
  const [billingActionLoading, setBillingActionLoading] = useState(false)
  const [billingActionMsg, setBillingActionMsg] = useState<string | null>(null)
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [refundReason, setRefundReason] = useState("")
  const [activityItems, setActivityItems] = useState<OrganizationActivityItem[]>([])
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [userSecurityMap, setUserSecurityMap] = useState<Record<number, UserSecuritySettings>>({})
  const [editingSecurityUserId, setEditingSecurityUserId] = useState<number | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getSaasReadiness()
      setData(response)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Unable to load SaaS readiness")
    } finally {
      setLoading(false)
    }
  }

  const refreshEntitlements = async () => {
    setEntLoading(true)
    try {
      const json = await getEntitlements()
      setEntitlements(json)
    } catch (e) {
      // ignore
    } finally {
      setEntLoading(false)
    }
  }

  const refreshOrganizationSummary = async () => {
    try {
      const summary = await getOrganizationSummary()
      setOrgSummary(summary)
    } catch {
      setOrgSummary(null)
    }
  }

  const refreshTeam = async () => {
    setTeamLoading(true)
    setTeamError(null)
    try {
      const [usersRes, invitesRes, seatsRes] = await Promise.all([
        getOrganizationUsers(),
        getOrganizationInvites(),
        getOrganizationSeatUsage(),
      ])
      setUsers(usersRes.users || [])
      setInvites(invitesRes.invites || [])
      setSeatUsage(seatsRes || null)
    } catch (err: any) {
      setUsers([])
      setInvites([])
      setSeatUsage(null)
      setTeamError(err?.response?.data?.error?.message || err?.response?.data?.detail || "Unable to load team data")
    } finally {
      setTeamLoading(false)
    }
  }

  const refreshBilling = async () => {
    try {
      const [historyRes, subscriptionRes, invoicesRes] = await Promise.all([
        getBillingHistory(),
        getBillingSubscriptionState(),
        getBillingTaxInvoices(),
      ])
      setBillingEvents(historyRes.events || [])
      setBillingSubscription(subscriptionRes || null)
      setBillingInvoices(invoicesRes.items || [])
    } catch {
      setBillingEvents([])
      setBillingSubscription(null)
      setBillingInvoices([])
    }
  }

  const handleGetProrationQuote = async () => {
    setBillingActionLoading(true)
    setBillingActionMsg(null)
    try {
      const quote = await getBillingProrationQuote(targetPlan)
      setProrationQuote(quote)
      setBillingActionMsg("Proration quote updated.")
    } catch (err: any) {
      setBillingActionMsg(err?.response?.data?.error?.message || err?.response?.data?.detail || "Failed to fetch quote")
    } finally {
      setBillingActionLoading(false)
    }
  }

  const handleApplyPlanChange = async () => {
    setBillingActionLoading(true)
    setBillingActionMsg(null)
    try {
      await applyBillingPlanChange({
        target_plan: targetPlan,
        effective_mode: effectiveMode,
        reason: "enterprise_control_admin_action",
      })
      setBillingActionMsg("Plan change workflow recorded successfully.")
      await Promise.all([refreshBilling(), refreshEntitlements()])
    } catch (err: any) {
      setBillingActionMsg(err?.response?.data?.error?.message || err?.response?.data?.detail || "Plan change failed")
    } finally {
      setBillingActionLoading(false)
    }
  }

  const handleRequestRefund = async () => {
    if (!refundAmount || !refundReason.trim()) {
      setBillingActionMsg("Refund amount and reason are required.")
      return
    }
    setBillingActionLoading(true)
    setBillingActionMsg(null)
    try {
      await requestBillingRefund({
        amount_inr: Number(refundAmount),
        reason: refundReason.trim(),
      })
      setBillingActionMsg("Refund workflow request submitted.")
      setRefundAmount(0)
      setRefundReason("")
      await refreshBilling()
    } catch (err: any) {
      setBillingActionMsg(err?.response?.data?.error?.message || err?.response?.data?.detail || "Refund request failed")
    } finally {
      setBillingActionLoading(false)
    }
  }

  const refreshActivity = async () => {
    try {
      const res = await getOrganizationActivity()
      setActivityItems(res.items || [])
    } catch {
      setActivityItems([])
    }
  }

  const refreshAnalyticsJobs = async () => {
    setAnalyticsLoading(true)
    try {
      const res = await listAnalyticsJobs()
      setAnalyticsJobs(res.items || [])
    } catch {
      setAnalyticsJobs([])
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const refreshOperations = async () => {
    try {
      const [overviewRes, runbooksRes, backupRes, lineageRes, modelRes, rbacRes, policyRes, gatesRes, deployRes, finalRes] = await Promise.all([
        getOperationsOverview(),
        getOperationsRunbooks(),
        getOperationsBackupDrillHistory(),
        getDataLineage(),
        getModelVersions(),
        getRbacCoverage(),
        getApiVersioningPolicy(),
        getQualityGates(),
        getDeploymentWorkflow(),
        getLaunchFinalReview(),
      ])
      setOperationsOverview(overviewRes || null)
      setOperationsRunbooks(runbooksRes.items || [])
      setBackupDrills(backupRes.items || [])
      setLineageItems(lineageRes.items || [])
      setModelVersions(modelRes.items || [])
      setRbacCoverage(rbacRes || null)
      setApiPolicy(policyRes || null)
      setQualityGates(gatesRes || null)
      setDeploymentWorkflow(deployRes || null)
      setLaunchFinalReview(finalRes || null)
    } catch {
      setOperationsOverview(null)
      setOperationsRunbooks([])
      setBackupDrills([])
      setLineageItems([])
      setModelVersions([])
      setRbacCoverage(null)
      setApiPolicy(null)
      setQualityGates(null)
      setDeploymentWorkflow(null)
      setLaunchFinalReview(null)
    }
  }

  const refreshSettings = async () => {
    try {
      const res = await getOrganizationSettings()
      setOrgSettings(res)
    } catch {
      setOrgSettings(null)
    }
  }

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await updateOrganizationUserRole(userId, role)
      await refreshTeam()
    } catch {
      // noop
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setTeamError(null)
    try {
      await createOrganizationInvite(inviteEmail.trim(), inviteRole)
      setInviteEmail("")
      await refreshTeam()
    } catch (err: any) {
      setTeamError(err?.response?.data?.error?.message || err?.response?.data?.detail || "Failed to send invite")
    }
  }

  const handleAcceptInvite = async (inviteId: number) => {
    setTeamError(null)
    try {
      await acceptOrganizationInvite(inviteId)
      await Promise.all([refreshTeam(), refreshOrganizationSummary(), refresh()])
    } catch (err: any) {
      setTeamError(err?.response?.data?.error?.message || err?.response?.data?.detail || "Failed to accept invite")
    }
  }

  const handleRevokeInvite = async (inviteId: number) => {
    try {
      await revokeOrganizationInvite(inviteId)
      await Promise.all([refreshTeam(), refreshActivity()])
    } catch {
      // noop
    }
  }

  const openUserSecurity = async (userId: number) => {
    try {
      const security = await getOrganizationUserSecurity(userId)
      setUserSecurityMap((prev) => ({ ...prev, [userId]: security }))
      setEditingSecurityUserId(userId)
    } catch {
      // noop
    }
  }

  const saveUserSecurity = async (userId: number) => {
    const security = userSecurityMap[userId]
    if (!security) return
    try {
      await updateOrganizationUserSecurity(userId, {
        idle_timeout: security.idle_timeout,
        mfa_enabled: security.mfa_enabled,
        allowed_ips: security.allowed_ips,
      })
      setEditingSecurityUserId(null)
      await refreshActivity()
    } catch {
      // noop
    }
  }

  useEffect(() => {
    refresh()
    refreshEntitlements()
    refreshOrganizationSummary()
    if (["ADMIN", "HR"].includes(String(userRole || "").toUpperCase())) {
      refreshTeam()
      refreshBilling()
      refreshActivity()
      refreshSettings()
    }
    if (["ADMIN", "FINANCE", "ANALYST"].includes(String(userRole || "").toUpperCase())) {
      refreshAnalyticsJobs()
      refreshOperations()
    }
  }, [])

  const checks = useMemo(() => Object.entries(data?.checks || {}), [data])
  const canManageTeam = ["ADMIN", "HR"].includes(String(userRole || "").toUpperCase())
  const canManageBilling = ["ADMIN", "HR"].includes(String(userRole || "").toUpperCase())
  const canUpgradePlan = ["ADMIN"].includes(String(userRole || "").toUpperCase())
  const filteredBillingEvents = useMemo(() => {
    return billingEvents.filter((ev) => {
      const statusOk = billingStatusFilter === "ALL" || ev.status === billingStatusFilter
      const typeOk = billingTypeFilter === "ALL" || ev.event_type === billingTypeFilter
      return statusOk && typeOk
    })
  }, [billingEvents, billingStatusFilter, billingTypeFilter])
  const billingTypes = useMemo(() => {
    const uniq = Array.from(new Set(billingEvents.map((e) => e.event_type))).sort()
    return ["ALL", ...uniq]
  }, [billingEvents])

  const saveSecuritySettings = async () => {
    if (!orgSettings || !canUpgradePlan) return
    setSavingSettings(true)
    try {
      await updateOrganizationSettings({
        security: orgSettings.security,
        seat_limit: orgSettings.seat_limit,
      } as Partial<OrganizationSettings>)
      await Promise.all([refreshSettings(), refreshActivity(), refreshTeam()])
    } catch {
      // noop
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <DashboardLayout
      title="Enterprise Command Deck"
      subtitle="Operational readiness, governance, and launch controls for production SaaS"
      actions={
        <Button variant="outline" size="sm" onClick={refresh} loading={loading}>
          Refresh Checks
        </Button>
      }
    >
      <div className="space-y-8">
        <div className="showcase-panel rounded-3xl p-6 aurora-ring">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[--text-muted] font-black">EXECUTIVE GOVERNANCE</p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[--text-primary] mt-2">Launch Control Tower</h2>
              <p className="text-sm text-[--text-muted] mt-2 max-w-3xl">
                Unified security posture, billing governance, and operations evidence for judge-ready enterprise demos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="pro"><ShieldCheck className="h-3.5 w-3.5 mr-1" /> COMPLIANCE LIVE</Badge>
              <Badge variant="outline"><Radar className="h-3.5 w-3.5 mr-1" /> MONITORING ACTIVE</Badge>
              <Badge variant="success"><Rocket className="h-3.5 w-3.5 mr-1" /> LAUNCH TRACK</Badge>
            </div>
          </div>
        </div>
        {orgSummary && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
              <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[--text-muted]">Organization</div>
              <div className="mt-2 text-lg font-black text-[--text-primary]">{orgSummary.company_name}</div>
              <div className="text-xs text-[--text-secondary] mt-1">{orgSummary.industry} · {orgSummary.hq_location}</div>
            </Card>
            <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
              <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[--text-muted]">Launch Checklist</div>
              <div className="mt-2 text-2xl font-black text-[--text-primary]">{orgSummary.checklist_score}%</div>
              <div className="text-xs text-[--text-secondary] mt-1">Production onboarding completion</div>
            </Card>
            <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
              <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[--text-muted]">Operational Data</div>
              <div className="mt-2 text-2xl font-black text-[--text-primary]">
                {(orgSummary.counts.invoices + orgSummary.counts.customers + orgSummary.counts.inventory + orgSummary.counts.expenses).toLocaleString()}
              </div>
              <div className="text-xs text-[--text-secondary] mt-1">Unified records in tenant workspace</div>
            </Card>
            <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
              <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[--text-muted]">Active Modules</div>
              <div className="mt-2 text-2xl font-black text-[--text-primary]">
                {Object.values(orgSummary.modules).filter((m) => m.status === "ready").length}/4
              </div>
              <div className="text-xs text-[--text-secondary] mt-1">Dashboard, Expenses, GST, Segments</div>
            </Card>
          </div>
        )}

        <Card variant="bento" padding="lg" className="border-[--border-default] bg-[--surface-1]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-[--text-muted]">SaaS Readiness</p>
              <h2 className="text-4xl font-black tracking-tight mt-2">{data ? `${data.score}%` : "--"}</h2>
              <p className="text-sm text-[--text-secondary] mt-2">Target: 80%+ for enterprise launch profile</p>
            </div>
            <div className="flex items-center gap-3">
              {data && (
                <Badge variant={data.status === "ready" ? "success" : "warning"} size="lg" pulse>
                  {data.status}
                </Badge>
              )}
              {!data && !loading && <Badge variant="outline">No data</Badge>}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card variant="glass" padding="md" className="xl:col-span-2">
            <h3 className="text-lg font-black tracking-tight mb-6">Hardening Checks</h3>
            <div className="space-y-3">
              {checks.map(([key, ok]) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <span className="text-sm font-semibold text-[--text-primary]">
                    {CHECK_LABELS[key] || key}
                  </span>
                  <Badge variant={ok ? "success" : "danger"} size="sm">{ok ? "Pass" : "Fail"}</Badge>
                </div>
              ))}
            </div>
          </Card>

            <Card variant="glass" padding="md">
              <h3 className="text-lg font-black tracking-tight mb-6">Tenant Context</h3>
              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <div className="text-[10px] uppercase tracking-[0.15em] font-black text-[--text-muted]">Company</div>
                  <div className="mt-2 font-semibold text-[--text-primary]">{data?.tenant?.company_id || "DEFAULT"}</div>
                </div>
                <div className="p-4 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <div className="text-[10px] uppercase tracking-[0.15em] font-black text-[--text-muted]">Role</div>
                  <div className="mt-2 font-semibold text-[--text-primary]">{data?.tenant?.role || "UNKNOWN"}</div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold mb-3">Entitlements</h4>
                <div className="space-y-3">
                  {entLoading && <div className="text-sm text-[--text-muted]">Loading entitlements...</div>}
                  {!entLoading && entitlements && (
                    <div className="p-4 rounded-xl border border-[--border-subtle] bg-[--surface-2] text-sm">
                      <div className="mb-2">
                        <div className="text-[10px] uppercase tracking-[0.15em] font-black text-[--text-muted]">Plan</div>
                        <div className="mt-1 font-semibold text-[--text-primary]">{entitlements.plan}</div>
                      </div>
                      <div className="mb-2">
                        <div className="text-[10px] uppercase tracking-[0.15em] font-black text-[--text-muted]">Status</div>
                        <div className="mt-1 font-semibold text-[--text-primary]">{entitlements.status}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.15em] font-black text-[--text-muted]">Features</div>
                        <ul className="mt-2 list-disc list-inside text-[--text-secondary]">
                          {entitlements.features.map((f) => (
                            <li key={f} className="truncate">{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4">
                        {entitlements.plan !== 'ENTERPRISE' && canUpgradePlan && (
                          <Button
                            variant="pro"
                            onClick={async () => {
                              try {
                                const token = getAuthToken()
                                const res = await fetch('/api/backend/api/v1/system/entitlements/checkout', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                  body: JSON.stringify({ plan: 'ENTERPRISE', success_url: window.location.href, cancel_url: window.location.href }),
                                })
                                const json = await res.json()
                                if (json.checkout_url) {
                                  window.location.href = json.checkout_url
                                }
                                await refreshBilling()
                              } catch (e) {
                                console.error('Upgrade failed', e)
                              }
                            }}
                          >
                            Upgrade to Enterprise
                          </Button>
                        )}
                        {entitlements.plan !== 'ENTERPRISE' && !canUpgradePlan && (
                          <div className="text-xs text-[--text-muted] mt-2">
                            Admin role required to initiate plan upgrade.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!entLoading && !entitlements && (
                    <div className="text-sm text-[--text-muted]">Entitlement data not available.</div>
                  )}
                </div>
              </div>
            </Card>
        </div>

        {orgSummary && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
              <h3 className="text-lg font-black tracking-tight mb-4">Launch Checklist</h3>
              <div className="space-y-3">
                {Object.entries(orgSummary.checklist).map(([key, ok]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                    <span className="text-sm text-[--text-primary]">{key.replace(/_/g, " ")}</span>
                    <Badge variant={ok ? "success" : "warning"} size="sm">{ok ? "Done" : "Pending"}</Badge>
                  </div>
                ))}
              </div>
            </Card>
            <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
              <h3 className="text-lg font-black tracking-tight mb-4">Module Integration</h3>
              <div className="space-y-3">
                {Object.entries(orgSummary.modules).map(([key, mod]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                    <div>
                      <div className="text-sm font-semibold text-[--text-primary] uppercase">{key}</div>
                      <div className="text-xs text-[--text-secondary]">{mod.records.toLocaleString()} records connected</div>
                    </div>
                    <Badge variant={mod.status === "ready" ? "success" : "outline"} size="sm">{mod.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {canManageTeam ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black tracking-tight">Team Members</h3>
              <Button variant="outline" size="sm" onClick={refreshTeam} loading={teamLoading}>Refresh Team</Button>
            </div>
            <div className="space-y-3">
              {users.length === 0 && <div className="text-sm text-[--text-muted]">No organization members found.</div>}
              {users.map((user) => (
                <div key={user.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[--text-primary]">{user.email}</div>
                      <div className="text-xs text-[--text-secondary]">ID: {user.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="px-2 py-1 text-xs rounded-md border border-[--border-default] bg-[--surface-1] text-[--text-primary]"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      >
                        {["ADMIN", "FINANCE", "SALES", "WAREHOUSE", "HR", "ANALYST", "VIEWER"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline" onClick={() => openUserSecurity(user.id)}>
                        Security
                      </Button>
                    </div>
                  </div>
                  {editingSecurityUserId === user.id && userSecurityMap[user.id] && (
                    <div className="mt-3 p-3 rounded-lg border border-[--border-default] bg-[--surface-1] space-y-2">
                      <div>
                        <label className="text-xs text-[--text-secondary]">Idle Timeout (seconds)</label>
                        <input
                          type="number"
                          min={300}
                          max={86400}
                          value={userSecurityMap[user.id].idle_timeout}
                          onChange={(e) =>
                            setUserSecurityMap((prev) => ({
                              ...prev,
                              [user.id]: {
                                ...prev[user.id],
                                idle_timeout: Number(e.target.value || 3600),
                              },
                            }))
                          }
                          className="mt-1 w-full px-2 py-1 rounded-md border border-[--border-default] bg-[--surface-2] text-[--text-primary]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[--text-secondary]">Allowed IPs (comma separated)</label>
                        <input
                          type="text"
                          value={(userSecurityMap[user.id].allowed_ips || []).join(", ")}
                          onChange={(e) =>
                            setUserSecurityMap((prev) => ({
                              ...prev,
                              [user.id]: {
                                ...prev[user.id],
                                allowed_ips: e.target.value
                                  .split(",")
                                  .map((ip) => ip.trim())
                                  .filter(Boolean),
                              },
                            }))
                          }
                          className="mt-1 w-full px-2 py-1 rounded-md border border-[--border-default] bg-[--surface-2] text-[--text-primary]"
                        />
                      </div>
                      <label className="flex items-center justify-between p-2 rounded-md border border-[--border-default] bg-[--surface-2]">
                        <span className="text-xs text-[--text-secondary]">MFA Enabled</span>
                        <input
                          type="checkbox"
                          checked={!!userSecurityMap[user.id].mfa_enabled}
                          onChange={(e) =>
                            setUserSecurityMap((prev) => ({
                              ...prev,
                              [user.id]: {
                                ...prev[user.id],
                                mfa_enabled: e.target.checked,
                              },
                            }))
                          }
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="primary" onClick={() => saveUserSecurity(user.id)}>
                          Save Security
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSecurityUserId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <h3 className="text-lg font-black tracking-tight mb-4">Invite Team</h3>
            {seatUsage && (
              <div className="mb-4 p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                <div className="text-xs text-[--text-secondary]">Seat Usage ({seatUsage.plan})</div>
                <div className="mt-1 text-sm font-semibold text-[--text-primary]">
                  {seatUsage.used_total} / {seatUsage.seat_limit} used
                </div>
                <div className="text-xs text-[--text-secondary] mt-1">
                  Active: {seatUsage.active_users} · Pending invites: {seatUsage.pending_invites} · Available: {seatUsage.available}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full px-3 py-2 rounded-lg border border-[--border-default] bg-[--surface-2] text-[--text-primary] outline-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[--border-default] bg-[--surface-2] text-[--text-primary] text-sm"
                >
                  {["VIEWER", "ANALYST", "SALES", "FINANCE", "HR", "WAREHOUSE", "ADMIN"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleInvite}
                  disabled={!!seatUsage && seatUsage.available <= 0}
                >
                  Send Invite
                </Button>
              </div>
              {seatUsage && seatUsage.available <= 0 && (
                <div className="text-xs text-amber-300">
                  Seat limit reached. Upgrade plan or increase seat capacity in organization settings.
                </div>
              )}
              {teamError && (
                <div className="text-xs text-red-300">{teamError}</div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-bold mb-3">Pending Invites</h4>
              <div className="space-y-2">
                {invites.length === 0 && <div className="text-sm text-[--text-muted]">No invites yet.</div>}
                {invites.slice(0, 6).map((inv) => (
                  <div key={inv.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between">
                    <div>
                      <div className="text-sm text-[--text-primary]">{inv.email}</div>
                      <div className="text-xs text-[--text-secondary]">{inv.role} {inv.expires_at ? `· expires ${inv.expires_at}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.status === "PENDING" && userEmail && inv.email.toLowerCase() === userEmail.toLowerCase() && (
                        <Button size="sm" variant="primary" onClick={() => handleAcceptInvite(inv.id)}>Accept</Button>
                      )}
                      {inv.status === "PENDING" && canManageTeam && (
                        <Button size="sm" variant="outline" onClick={() => handleRevokeInvite(inv.id)}>Revoke</Button>
                      )}
                      <Badge variant={inv.status === "PENDING" ? "warning" : "outline"} size="sm">{inv.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
        ) : (
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <h3 className="text-lg font-black tracking-tight">Team Management</h3>
            <p className="text-sm text-[--text-muted] mt-2">
              Admin or HR role required to view and manage team members and invites.
            </p>
          </Card>
        )}

        <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black tracking-tight">Billing & Upgrade Audit</h3>
            <div className="flex items-center gap-2">
              {canManageBilling && (
                <Button variant="outline" size="sm" onClick={refreshBilling}>Refresh Billing</Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(filteredBillingEvents, null, 2)], { type: "application/json" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "billing_audit_export.json"
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }}
              >
                Export JSON
              </Button>
            </div>
          </div>
          {canManageBilling ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={billingStatusFilter}
                onChange={(e) => setBillingStatusFilter(e.target.value as "ALL" | "SUCCESS" | "FAILED")}
                className="px-2 py-1 text-xs rounded-md border border-[--border-default] bg-[--surface-2] text-[--text-primary]"
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
              <select
                value={billingTypeFilter}
                onChange={(e) => setBillingTypeFilter(e.target.value)}
                className="px-2 py-1 text-xs rounded-md border border-[--border-default] bg-[--surface-2] text-[--text-primary]"
              >
                {billingTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-[--text-muted] mb-4">
              Admin or HR role required to access billing audit records.
            </p>
          )}
          {canManageBilling && (
            <div className="mb-4 p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] space-y-3">
              <div className="text-xs text-[--text-secondary] uppercase tracking-[0.15em]">Plan Ops</div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={targetPlan}
                  onChange={(e) => setTargetPlan(e.target.value as "FREE" | "PRO" | "ENTERPRISE")}
                  className="px-2 py-1 text-xs rounded-md border border-[--border-default] bg-[--surface-1] text-[--text-primary]"
                >
                  {["FREE", "PRO", "ENTERPRISE"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={effectiveMode}
                  onChange={(e) => setEffectiveMode(e.target.value as "IMMEDIATE" | "PERIOD_END")}
                  className="px-2 py-1 text-xs rounded-md border border-[--border-default] bg-[--surface-1] text-[--text-primary]"
                >
                  <option value="IMMEDIATE">Immediate</option>
                  <option value="PERIOD_END">Period End</option>
                </select>
                <Button size="sm" variant="outline" onClick={handleGetProrationQuote} loading={billingActionLoading}>
                  Quote
                </Button>
                {canUpgradePlan && (
                  <Button size="sm" variant="primary" onClick={handleApplyPlanChange} loading={billingActionLoading}>
                    Apply Plan Change
                  </Button>
                )}
              </div>
              {prorationQuote && (
                <div className="text-xs text-[--text-secondary]">
                  Delta: INR {prorationQuote.proration_delta_inr} · Days remaining: {prorationQuote.days_remaining}
                </div>
              )}
              <div className="pt-2 border-t border-[--border-subtle] space-y-2">
                <div className="text-xs text-[--text-secondary]">Refund Workflow</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value || 0))}
                    placeholder="Amount (INR)"
                    className="px-2 py-1 text-xs rounded-md border border-[--border-default] bg-[--surface-1] text-[--text-primary]"
                  />
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Refund reason"
                    className="px-2 py-1 text-xs rounded-md border border-[--border-default] bg-[--surface-1] text-[--text-primary] min-w-[220px]"
                  />
                  <Button size="sm" variant="outline" onClick={handleRequestRefund} loading={billingActionLoading}>
                    Request Refund
                  </Button>
                </div>
              </div>
              {billingActionMsg && <div className="text-xs text-[--text-muted]">{billingActionMsg}</div>}
            </div>
          )}
          <div className="space-y-2">
            {filteredBillingEvents.length === 0 && <div className="text-sm text-[--text-muted]">No billing events for selected filter.</div>}
            {billingSubscription && (
              <div className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[--text-primary]">Subscription Lifecycle</div>
                  <div className="text-xs text-[--text-secondary]">
                    {billingSubscription.plan_code} · {billingSubscription.lifecycle_status}
                  </div>
                  {billingSubscription.grace_ends_at && (
                    <div className="text-[10px] text-[--text-dim] mt-1">
                      Grace ends: {billingSubscription.grace_ends_at}
                    </div>
                  )}
                  {billingSubscription.current_period_end && (
                    <div className="text-[10px] text-[--text-dim] mt-1">
                      Current period end: {billingSubscription.current_period_end}
                    </div>
                  )}
                </div>
                <Badge
                  variant={
                    billingSubscription.lifecycle_status === "ACTIVE"
                      ? "success"
                      : billingSubscription.lifecycle_status === "GRACE" || billingSubscription.lifecycle_status === "PAST_DUE"
                        ? "warning"
                        : billingSubscription.lifecycle_status === "CANCELED"
                          ? "danger"
                          : "outline"
                  }
                  size="sm"
                >
                  {billingSubscription.lifecycle_status}
                </Badge>
              </div>
            )}
            {filteredBillingEvents.slice(0, 8).map((ev) => (
              <div key={ev.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[--text-primary]">{ev.event_type}</div>
                  <div className="text-xs text-[--text-secondary]">{ev.actor_email || "system"} · {ev.created_at}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ev.status === "SUCCESS" ? "success" : "warning"} size="sm">{ev.status}</Badge>
                  {canManageBilling && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await generateBillingTaxInvoice(ev.id, 18)
                          await refreshBilling()
                          setBillingActionMsg(`Tax invoice generated for event #${ev.id}`)
                        } catch (err: any) {
                          setBillingActionMsg(err?.response?.data?.error?.message || err?.response?.data?.detail || "Invoice generation failed")
                        }
                      }}
                    >
                      Generate Invoice
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {canManageBilling && (
            <div className="mt-4 pt-4 border-t border-[--border-subtle]">
              <div className="text-xs text-[--text-secondary] uppercase tracking-[0.15em] mb-2">Tax Invoices</div>
              <div className="space-y-2">
                {billingInvoices.length === 0 && (
                  <div className="text-xs text-[--text-muted]">No generated billing invoices yet.</div>
                )}
                {billingInvoices.length > 0 && (
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={exportBillingTaxInvoicesCsv}>
                      Export CSV
                    </Button>
                  </div>
                )}
                {billingInvoices.slice(0, 6).map((inv) => (
                  <div key={inv.id} className="p-2 rounded-lg border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-[--text-primary]">{inv.invoice_number}</div>
                      <div className="text-[10px] text-[--text-secondary]">
                        INR {inv.total_inr} · GST {inv.gst_rate}% · {inv.issued_at}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadBillingTaxInvoice(inv.invoice_number)}>
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black tracking-tight">Security Policies</h3>
              <Button
                variant="primary"
                size="sm"
                onClick={saveSecuritySettings}
                loading={savingSettings}
                disabled={!canUpgradePlan || !orgSettings}
              >
                Save Policies
              </Button>
            </div>
            {orgSettings ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <label className="text-xs text-[--text-secondary]">Session Idle Timeout (seconds)</label>
                  <input
                    type="number"
                    min={300}
                    max={86400}
                    value={orgSettings.security.idle_timeout}
                    onChange={(e) =>
                      setOrgSettings({
                        ...orgSettings,
                        security: { ...orgSettings.security, idle_timeout: Number(e.target.value || 3600) },
                      })
                    }
                    className="mt-2 w-full px-3 py-2 rounded-md border border-[--border-default] bg-[--surface-1] text-[--text-primary]"
                    disabled={!canUpgradePlan}
                  />
                </div>
                <div className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <label className="text-xs text-[--text-secondary]">Seat Limit</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={orgSettings.seat_limit}
                    onChange={(e) =>
                      setOrgSettings({
                        ...orgSettings,
                        seat_limit: Number(e.target.value || 1),
                      })
                    }
                    className="mt-2 w-full px-3 py-2 rounded-md border border-[--border-default] bg-[--surface-1] text-[--text-primary]"
                    disabled={!canUpgradePlan}
                  />
                </div>
                <label className="flex items-center justify-between p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <span className="text-sm text-[--text-primary]">Require MFA</span>
                  <input
                    type="checkbox"
                    checked={orgSettings.security.require_mfa}
                    onChange={(e) =>
                      setOrgSettings({
                        ...orgSettings,
                        security: { ...orgSettings.security, require_mfa: e.target.checked },
                      })
                    }
                    disabled={!canUpgradePlan}
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <span className="text-sm text-[--text-primary]">IP Allowlist Enabled</span>
                  <input
                    type="checkbox"
                    checked={orgSettings.security.ip_allowlist_enabled}
                    onChange={(e) =>
                      setOrgSettings({
                        ...orgSettings,
                        security: { ...orgSettings.security, ip_allowlist_enabled: e.target.checked },
                      })
                    }
                    disabled={!canUpgradePlan}
                  />
                </label>
                {!canUpgradePlan && (
                  <p className="text-xs text-[--text-muted]">Admin role required to modify policies.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[--text-muted]">Security settings unavailable.</p>
            )}
          </Card>

          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black tracking-tight">Admin Activity Feed</h3>
              {canManageBilling && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={refreshActivity}>Refresh Activity</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const token = getAuthToken()
                        const res = await fetch('/api/backend/api/v1/system/organization/activity/export.csv', {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        })
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = "organization_activity_export.csv"
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      } catch {
                        // noop
                      }
                    }}
                  >
                    Export CSV
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {activityItems.length === 0 && <div className="text-sm text-[--text-muted]">No recent admin activity.</div>}
              {activityItems.slice(0, 10).map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[--text-primary]">{item.action}</div>
                    <div className="text-xs text-[--text-secondary]">{item.module} · {item.timestamp}</div>
                    {item.event_hash && (
                      <div className="text-[10px] text-[--text-dim] mt-1 font-mono">hash: {item.event_hash.slice(0, 16)}...</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        (item.severity || "info") === "critical"
                          ? "danger"
                          : (item.severity || "info") === "high"
                            ? "warning"
                            : "outline"
                      }
                      size="sm"
                    >
                      {(item.severity || "info").toUpperCase()}
                    </Badge>
                    <Badge variant="outline" size="sm">{item.entity_id || "ORG"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black tracking-tight">Analytics Job Queue</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshAnalyticsJobs} loading={analyticsLoading}>
                Refresh Jobs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setAnalyticsActionMsg(null)
                  try {
                    await enqueueAnalyticsJob("summary_rollup")
                    setAnalyticsActionMsg("Summary job queued.")
                    await refreshAnalyticsJobs()
                  } catch (err: any) {
                    setAnalyticsActionMsg(err?.response?.data?.error?.message || err?.response?.data?.detail || "Queue failed")
                  }
                }}
              >
                Queue Summary
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setAnalyticsActionMsg(null)
                  try {
                    await enqueueAnalyticsJob("monthly_revenue")
                    setAnalyticsActionMsg("Monthly revenue job queued.")
                    await refreshAnalyticsJobs()
                  } catch (err: any) {
                    setAnalyticsActionMsg(err?.response?.data?.error?.message || err?.response?.data?.detail || "Queue failed")
                  }
                }}
              >
                Queue Revenue
              </Button>
            </div>
          </div>
          {analyticsActionMsg && <div className="text-xs text-[--text-muted] mb-3">{analyticsActionMsg}</div>}
          <div className="space-y-2">
            {analyticsJobs.length === 0 && <div className="text-sm text-[--text-muted]">No analytics jobs found.</div>}
            {analyticsJobs.slice(0, 8).map((job) => (
              <div key={job.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[--text-primary]">#{job.id} · {job.job_type}</div>
                  <div className="text-xs text-[--text-secondary]">
                    attempts: {job.attempts} · queued: {job.queued_at || "-"}
                  </div>
                  {job.error_message && (
                    <div className="text-[10px] text-red-300 mt-1">{job.error_message}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      job.status === "COMPLETED"
                        ? "success"
                        : job.status === "FAILED"
                          ? "danger"
                          : job.status === "RUNNING"
                            ? "warning"
                            : "outline"
                    }
                    size="sm"
                  >
                    {job.status}
                  </Badge>
                  {job.status === "FAILED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await retryAnalyticsJob(job.id)
                          await refreshAnalyticsJobs()
                        } catch {
                          // noop
                        }
                      }}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black tracking-tight">Operations Overview</h3>
              <Button variant="outline" size="sm" onClick={refreshOperations}>Refresh Ops</Button>
            </div>
            {operationsOverview ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between">
                  <span className="text-sm text-[--text-primary]">Overall Status</span>
                  <Badge
                    variant={
                      operationsOverview.overall_status === "healthy"
                        ? "success"
                        : operationsOverview.overall_status === "degraded"
                          ? "warning"
                          : "danger"
                    }
                    size="sm"
                  >
                    {operationsOverview.overall_status}
                  </Badge>
                </div>
                <div className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] text-xs text-[--text-secondary]">
                  Queue: {operationsOverview.signals.analytics_queue.queued} queued · {operationsOverview.signals.analytics_queue.running} running · {operationsOverview.signals.analytics_queue.failed} failed
                </div>
                <div className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] text-xs text-[--text-secondary]">
                  Billing failures: {operationsOverview.signals.billing_failures} · Security incidents: {operationsOverview.signals.security_incidents_recent} · High severity: {operationsOverview.signals.high_severity_incidents_recent}
                </div>
              </div>
            ) : (
              <div className="text-sm text-[--text-muted]">Operations overview unavailable.</div>
            )}
          </Card>

          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <h3 className="text-lg font-black tracking-tight mb-4">Incident Runbooks</h3>
            <div className="space-y-2">
              {operationsRunbooks.length === 0 && (
                <div className="text-sm text-[--text-muted]">No runbooks available.</div>
              )}
              {operationsRunbooks.map((rb) => (
                <div key={rb.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[--text-primary]">{rb.title}</div>
                    <Badge variant={rb.severity === "critical" ? "danger" : rb.severity === "high" ? "warning" : "outline"} size="sm">
                      {rb.severity}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-[--text-dim] mt-1">Owner: {rb.owner}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black tracking-tight">Backup Drill Evidence</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshOperations}>Refresh Evidence</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  try {
                    await runOperationsBackupDrill()
                    await refreshOperations()
                  } catch {
                    // noop
                  }
                }}
              >
                Run Backup Drill
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {backupDrills.length === 0 && (
              <div className="text-sm text-[--text-muted]">No backup drill evidence yet.</div>
            )}
            {backupDrills.slice(0, 6).map((item) => (
              <div key={item.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[--text-primary]">Drill #{item.id}</div>
                  <div className="text-xs text-[--text-secondary]">
                    {item.initiated_by || "system"} · {item.executed_at}
                  </div>
                  <div className="text-[10px] text-[--text-dim] mt-1 font-mono">
                    hash: {item.evidence_hash.slice(0, 16)}...
                  </div>
                </div>
                <Badge variant={item.status === "SUCCESS" ? "success" : "warning"} size="sm">
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <h3 className="text-lg font-black tracking-tight mb-4">Data Lineage</h3>
            <div className="space-y-2">
              {lineageItems.length === 0 && (
                <div className="text-sm text-[--text-muted]">No lineage records yet.</div>
              )}
              {lineageItems.slice(0, 6).map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <div className="text-sm font-semibold text-[--text-primary]">{item.source_type} #{item.source_ref || item.id}</div>
                  <div className="text-xs text-[--text-secondary]">{item.transform_stage} · {item.created_at}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black tracking-tight">Model Versions</h3>
              <Button variant="outline" size="sm" onClick={refreshOperations}>Refresh Models</Button>
            </div>
            <div className="space-y-2 mb-4">
              <input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Model name"
                className="w-full px-3 py-2 rounded-lg border border-[--border-default] bg-[--surface-2] text-[--text-primary]"
              />
              <div className="flex items-center gap-2">
                <input
                  value={modelVersionTag}
                  onChange={(e) => setModelVersionTag(e.target.value)}
                  placeholder="Version tag"
                  className="flex-1 px-3 py-2 rounded-lg border border-[--border-default] bg-[--surface-2] text-[--text-primary]"
                />
                <select
                  value={modelVersionStatus}
                  onChange={(e) => setModelVersionStatus(e.target.value as "ACTIVE" | "SHADOW" | "DEPRECATED" | "ROLLED_BACK")}
                  className="px-3 py-2 rounded-lg border border-[--border-default] bg-[--surface-2] text-[--text-primary] text-sm"
                >
                  {["ACTIVE", "SHADOW", "DEPRECATED", "ROLLED_BACK"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <input
                value={modelVersionNotes}
                onChange={(e) => setModelVersionNotes(e.target.value)}
                placeholder="Release notes"
                className="w-full px-3 py-2 rounded-lg border border-[--border-default] bg-[--surface-2] text-[--text-primary]"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  try {
                    await createModelVersion({
                      model_name: modelName.trim(),
                      version_tag: modelVersionTag.trim(),
                      status: modelVersionStatus,
                      notes: modelVersionNotes.trim(),
                    })
                    setModelVersionNotes("")
                    await refreshOperations()
                  } catch {
                    // noop
                  }
                }}
              >
                Register Model Version
              </Button>
            </div>
            <div className="space-y-2">
              {modelVersions.length === 0 && (
                <div className="text-sm text-[--text-muted]">No model versions recorded.</div>
              )}
              {modelVersions.slice(0, 6).map((mv) => (
                <div key={mv.id} className="p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[--text-primary]">{mv.model_name} {mv.version_tag}</div>
                    <div className="text-xs text-[--text-secondary]">{mv.created_at}</div>
                  </div>
                  <Badge variant={mv.status === "ACTIVE" ? "success" : mv.status === "SHADOW" ? "warning" : "outline"} size="sm">
                    {mv.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {rbacCoverage && (
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black tracking-tight">RBAC Coverage Audit</h3>
              <Badge variant={rbacCoverage.summary.status === "READY" ? "success" : "warning"} size="sm">
                {rbacCoverage.summary.status}
              </Badge>
            </div>
            <div className="text-sm text-[--text-secondary] mb-3">
              Coverage: <span className="font-bold text-[--text-primary]">{rbacCoverage.summary.coverage_score}%</span>
              {" "}({rbacCoverage.summary.covered_actions}/{rbacCoverage.summary.total_actions} actions)
            </div>
            <div className="space-y-2">
              {rbacCoverage.items.slice(0, 8).map((item, idx) => (
                <div key={`${item.module}-${item.action}-${idx}`} className="p-2 rounded-lg border border-[--border-subtle] bg-[--surface-2] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[--text-primary]">{item.module} · {item.action}</div>
                    <div className="text-[10px] text-[--text-secondary]">roles: {item.required_roles.join(", ")}</div>
                  </div>
                  <Badge variant={item.ui_guarded ? "success" : "danger"} size="sm">
                    {item.ui_guarded ? "guarded" : "gap"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <h3 className="text-lg font-black tracking-tight mb-4">API Policy & Quality Gates</h3>
            {apiPolicy && (
              <div className="text-xs text-[--text-secondary] space-y-1 mb-3">
                <div>Current API Version: <span className="text-[--text-primary] font-semibold">{apiPolicy.current_version}</span></div>
                <div>Deprecation Notice: {apiPolicy.deprecation_policy.notice_period_days} days</div>
              </div>
            )}
            {qualityGates && (
              <div className="text-xs text-[--text-secondary]">
                Quality Score: <span className="text-[--text-primary] font-semibold">{qualityGates.summary.score}%</span> ({qualityGates.summary.status})
              </div>
            )}
            {deploymentWorkflow && (
              <div className="mt-3 text-xs text-[--text-secondary]">
                Workflow: <span className="text-[--text-primary] font-semibold">{deploymentWorkflow.workflow}</span>
              </div>
            )}
          </Card>

          <Card variant="glass" padding="md" className="bg-[--surface-1] border-[--border-subtle]">
            <h3 className="text-lg font-black tracking-tight mb-4">Launch Final Review</h3>
            {launchFinalReview ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-[--border-subtle] bg-[--surface-2]">
                  <span className="text-sm text-[--text-primary]">Go/No-Go</span>
                  <Badge variant={launchFinalReview.status === "GO" ? "success" : "warning"} size="sm">
                    {launchFinalReview.status}
                  </Badge>
                </div>
                <div className="text-xs text-[--text-secondary]">
                  Score: <span className="text-[--text-primary] font-semibold">{launchFinalReview.score}%</span>
                </div>
                {Array.isArray(launchFinalReview.blockers) && launchFinalReview.blockers.length > 0 && (
                  <div className="text-xs text-amber-300">
                    Blockers: {launchFinalReview.blockers.join(", ")}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-[--text-muted]">Launch final review unavailable.</div>
            )}
          </Card>
        </div>

        {error && (
          <Card variant="outlined" padding="md" className="border-red-500/30 bg-red-500/10">
            <p className="text-sm text-red-300">{error}</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}


