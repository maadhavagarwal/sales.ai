
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Database,
  CheckCircle2,
  ArrowRightLeft,
  Settings2,
  FileJson,
  History,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { getTallySyncStatus, triggerTallySync } from "@/services/api";

export default function TallySyncPage() {
  const [syncState, setSyncState] = useState({
    status: "idle",
    progress: 0,
    last_run: null,
    logs: [] as any[],
  });
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getTallySyncStatus();
      setSyncState(data);
    } catch (err) {
      console.warn("Failed to load sync status", err);
    }
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      loadStatus();
    }, 1200);
  };

  const handleSync = async () => {
    setError(null);
    try {
      setSyncState((prev) => ({ ...prev, status: "syncing", progress: 0 }));
      await triggerTallySync();
      startPolling();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to start sync")
    }
  };

  const clearLogs = () => setSyncState((prev) => ({ ...prev, logs: [] }));

  useEffect(() => {
    loadStatus();
    return () => stopPolling();
  }, [loadStatus]);

  useEffect(() => {
    if (syncState.status !== "syncing") {
      stopPolling();
    }
  }, [syncState.status]);

  const isSyncing = syncState.status === "syncing";

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[--text-primary]">External ERP Integration</h1>
          <p className="text-[--text-secondary] mt-1">
            Synchronize your book-of-record with TallyPrime / Zoho Books (connect a real gateway via environment
            variables).
          </p>
        </div>
        <Badge variant="outline" className="border-[--primary]/50 text-[--primary] bg-[--primary]/5 uppercase tracking-widest text-[10px] px-3 py-1">
          Two-Way Sync Active
        </Badge>
      </header>

      {error && (
        <div className="p-4 rounded-lg bg-[--accent-rose]/10 border border-[--accent-rose]/20 text-[--accent-rose]">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Status */}
        <Card className="glass-pro bg-[--surface-2] border-[--border-default]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-[--primary]/10 text-[--primary] ring-4 ring-[--primary]/5">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-[--text-primary]">TallyPrime Server</h4>
                <p className="text-xs text-[--text-dim]">Connected: Local Gateway v2.4</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[--accent-emerald] font-semibold bg-[--accent-emerald]/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> System Online
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="md:col-span-2 glass-pro bg-[--surface-1] border-[--border-default]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[--text-dim]" /> Sync Intelligence Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-[--surface-2] border border-[--border-subtle]">
              <div>
                <p className="font-semibold text-sm text-[--text-primary]">Automated Master Sync</p>
                <p className="text-xs text-[--text-dim]">Update Customers and Inventory every 60 minutes</p>
              </div>
              <Badge className="bg-[--accent-emerald]/20 text-[--accent-emerald]">ENABLED</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-[--surface-2] border border-[--border-subtle] text-pretty">
              <div>
                <p className="font-semibold text-sm text-[--text-primary]">Voucher Push (Invoices)</p>
                <p className="text-xs text-[--text-dim]">Push individual Invoices as Sales Vouchers in real-time</p>
              </div>
              <Badge className="bg-[--accent-emerald]/20 text-[--accent-emerald]">ENABLED</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Sync Component */}
      <Card className="glass-pro-thick bg-[--surface-1] border-[--border-default] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[--primary]/30 animate-gradient-x opacity-30" />

        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl text-[--text-primary]">Manual Delta reconciliation</CardTitle>
          <CardDescription>Resolve differences between NeuralBI ledger and Tally master</CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 py-8">
          <div className="flex justify-center gap-12 items-center">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-[--surface-2] flex items-center justify-center border border-[--border-default]">
                <FileJson className="w-8 h-8 text-[--primary]" />
              </div>
              <p className="text-xs font-bold text-[--text-dim]">NeuralBI Assets</p>
            </div>

            <motion.div
              animate={isSyncing ? { rotate: 360 } : {}}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="p-3 rounded-full bg-[--primary]/20 text-[--primary]"
            >
              <ArrowRightLeft className="w-6 h-6" />
            </motion.div>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-[--surface-2] flex items-center justify-center border border-[--border-default]">
                <Database className="w-8 h-8 text-[--accent-emerald]" />
              </div>
              <p className="text-xs font-bold text-[--text-dim]">Tally XML Port</p>
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[--text-dim] mb-1">
                  <span>Synchronizing Ledger Codes...</span>
                  <span>{syncState.progress}%</span>
                </div>
                <Progress value={syncState.progress} className="h-2 bg-[--surface-2]" />
              </div>
            )}

            <AnimatePresence>
              {syncState.status === "idle" && syncState.logs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[--accent-emerald]/10 text-[--accent-emerald] border border-[--accent-emerald]/20 text-sm justify-center"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Last sync complete at {syncState.last_run ? new Date(syncState.last_run).toLocaleString() : "—"}.
                </motion.div>
              )}
              {syncState.status === "syncing" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[--primary]/10 text-[--primary] border border-[--primary]/20 text-sm justify-center"
                >
                  <RefreshCw className="w-4 h-4 animate-spin" /> Sync in progress...
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              disabled={isSyncing}
              onClick={handleSync}
              className="w-full h-12 bg-[--primary] hover:bg-[--primary]/90 text-white font-bold text-lg"
            >
              {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
              {isSyncing ? "Syncing..." : "Initiate Global Sync"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card className="glass-pro bg-[--surface-1] border-[--border-default]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" /> Sync History
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white" onClick={clearLogs}>
            Clear Logs
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {syncState.logs.length === 0 ? (
              <div className="text-sm text-[--text-dim]">No sync actions recorded yet. Run a sync to see details.</div>
            ) : (
              syncState.logs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center p-3 text-sm border-b border-[--border-subtle]"
                >
                  <div className="flex gap-4 items-center">
                    <span className="text-[--text-dim] font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                    <span className="font-semibold text-[--text-primary]">{entry.message}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[--accent-emerald]">
                    <span className="text-[10px] font-bold">{entry.status}</span>
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
