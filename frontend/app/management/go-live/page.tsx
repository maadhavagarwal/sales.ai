"use client"

import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Badge, Button, Card } from "@/components/ui"
import {
  getAdoptionConfidence,
  getAdoptionIncidentReadiness,
  runAdoptionBackupDrill,
  runMigrationVerification,
} from "@/services/api"

const DEFAULT_SOURCE_COUNTS = {
  customers: 0,
  invoices: 0,
  inventory: 0,
  ledger: 0,
  deals: 0,
  marketing_campaigns: 0,
  personnel: 0,
  expenses: 0,
}

export default function GoLiveReadinessPage() {
  const [confidence, setConfidence] = useState<any>(null)
  const [incidentReadiness, setIncidentReadiness] = useState<any>(null)
  const [verification, setVerification] = useState<any>(null)
  const [backupDrill, setBackupDrill] = useState<any>(null)
  const [sourceCountsText, setSourceCountsText] = useState(
    JSON.stringify(DEFAULT_SOURCE_COUNTS, null, 2),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isRunningVerify, setIsRunningVerify] = useState(false)
  const [isRunningDrill, setIsRunningDrill] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confidenceTone = useMemo(() => {
    if (!confidence) return "default"
    if (confidence.confidence_level === "HIGH") return "pro"
    if (confidence.confidence_level === "MEDIUM") return "primary"
    return "danger"
  }, [confidence])

  const loadCoreStatus = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const [confidenceData, incidentData] = await Promise.all([
        getAdoptionConfidence(),
        getAdoptionIncidentReadiness(),
      ])
      setConfidence(confidenceData)
      setIncidentReadiness(incidentData)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to load go-live status"
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCoreStatus()
  }, [])

  const handleVerify = async () => {
    setError(null)
    setIsRunningVerify(true)
    try {
      const parsed = JSON.parse(sourceCountsText)
      const result = await runMigrationVerification(parsed, 0)
      setVerification(result)
      await loadCoreStatus()
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Migration verification failed"
      setError(msg)
    } finally {
      setIsRunningVerify(false)
    }
  }

  const handleBackupDrill = async () => {
    setError(null)
    setIsRunningDrill(true)
    try {
      const result = await runAdoptionBackupDrill()
      setBackupDrill(result)
      await loadCoreStatus()
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Backup drill failed"
      setError(msg)
    } finally {
      setIsRunningDrill(false)
    }
  }

  return (
    <DashboardLayout
      title="Go-Live Confidence"
      subtitle="Migration verification, parity confidence, and operational resilience"
    >
      <div className="space-y-6">
        {error && (
          <Card variant="glass" padding="md" className="border-red-400/40 bg-red-500/10">
            <p className="text-sm text-red-200">{error}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card variant="glass" padding="lg" className="lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-[--text-muted] font-bold">Adoption Confidence</p>
                <h2 className="text-3xl font-black mt-2">
                  {isLoading || !confidence ? "..." : `${confidence.confidence_score}%`}
                </h2>
              </div>
              <Badge variant={confidenceTone as any}>
                {isLoading || !confidence ? "Loading" : confidence.confidence_level}
              </Badge>
            </div>
            <p className="text-sm text-[--text-muted] mt-3">
              Decision: {isLoading || !confidence ? "..." : confidence.overall}
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {(confidence?.signals || []).map((signal: any) => (
                <div
                  key={signal.name}
                  className={`rounded-lg border p-3 ${signal.ok ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-400/30 bg-amber-500/10"}`}
                >
                  <p className="font-bold text-sm">{signal.name}</p>
                  <p className="text-xs text-[--text-muted] mt-1">{signal.details}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" padding="lg">
            <p className="text-xs uppercase tracking-widest text-[--text-muted] font-bold">Incident Readiness</p>
            <h3 className="text-xl font-black mt-2">{incidentReadiness?.overall || "..."}</h3>
            <div className="mt-4 space-y-2">
              {(incidentReadiness?.checks || []).map((check: any) => (
                <div key={check.name} className="flex items-center justify-between text-sm">
                  <span>{check.name}</span>
                  <span className={check.ok ? "text-emerald-300" : "text-amber-300"}>
                    {check.ok ? "OK" : "Action"}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4" onClick={loadCoreStatus}>
              Refresh Status
            </Button>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="glass" padding="lg">
            <p className="text-xs uppercase tracking-widest text-[--text-muted] font-bold">Migration Verification</p>
            <p className="text-sm text-[--text-muted] mt-2">
              Provide legacy source counts for strict parity and cutover GO/NO_GO validation.
            </p>
            <textarea
              className="w-full mt-4 min-h-55 rounded-lg bg-black/50 border border-white/20 p-3 text-sm font-mono"
              value={sourceCountsText}
              onChange={(e) => setSourceCountsText(e.target.value)}
            />
            <Button variant="primary" size="sm" className="mt-4" onClick={handleVerify} disabled={isRunningVerify}>
              {isRunningVerify ? "Verifying..." : "Run Verification"}
            </Button>
            {verification && (
              <div className="mt-4 p-3 rounded-lg border border-white/20 bg-black/30">
                <p className="font-bold text-sm">{verification.cutover_gate}</p>
                <p className="text-xs text-[--text-muted] mt-1">{verification.overall}</p>
              </div>
            )}
          </Card>

          <Card variant="glass" padding="lg">
            <p className="text-xs uppercase tracking-widest text-[--text-muted] font-bold">Backup and Restore Drill</p>
            <p className="text-sm text-[--text-muted] mt-2">
              Executes a production-style backup and restore probe to validate recoverability.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleBackupDrill} disabled={isRunningDrill}>
              {isRunningDrill ? "Running Drill..." : "Run Backup Drill"}
            </Button>
            {backupDrill && (
              <div className="mt-4 p-3 rounded-lg border border-white/20 bg-black/30 text-sm">
                <p className="font-bold">{backupDrill.overall}</p>
                <p className="text-xs text-[--text-muted] mt-1">Backup: {backupDrill.backup_file}</p>
                <p className="text-xs text-[--text-muted]">Restore probe: {backupDrill.restore_probe_file}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
