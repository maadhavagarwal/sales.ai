
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft,
  Settings2,
  FileJson,
  History
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";

export default function TallySyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("IDLE"); // IDLE, SYNCING, SUCCESS, ERROR

  const handleSync = () => {
    setSyncing(true);
    setStatus("SYNCING");
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncing(false);
          setStatus("SUCCESS");
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">External ERP Integration</h1>
          <p className="text-slate-400 mt-1">Synchronize your book-of-record with TallyPrime / Zoho Books</p>
        </div>
        <Badge variant="outline" className="border-blue-500/50 text-blue-400 bg-blue-500/5 uppercase tracking-widest text-[10px] px-3 py-1">
          Two-Way Sync Active
        </Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Status */}
        <Card className="glass-pro bg-slate-900/40 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-400 ring-4 ring-blue-500/5">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-lg">TallyPrime Server</h4>
                <p className="text-xs text-slate-500">Connected: Local Gateway v2.4</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> System Online
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="md:col-span-2 glass-pro bg-slate-900/20 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-slate-400" /> Sync Intelligence Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <p className="font-semibold text-sm">Automated Master Sync</p>
                <p className="text-xs text-slate-500 text-pretty">Update Customers and Inventory every 60 minutes</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400">ENABLED</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 text-pretty">
              <div>
                <p className="font-semibold text-sm">Voucher Push (Invoices)</p>
                <p className="text-xs text-slate-500">Push individual Invoices as Sales Vouchers in real-time</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400">ENABLED</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Sync Component */}
      <Card className="glass-pro-thick bg-gradient-to-b from-slate-900/60 to-black/80 border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-gradient-x opacity-30" />
        
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Manual Delta reconciliation</CardTitle>
          <CardDescription>Resolve differences between NeuralBI ledger and Tally master</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 py-8">
          <div className="flex justify-center gap-12 items-center">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                <FileJson className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-xs font-bold text-slate-400">NeuralBI Assets</p>
            </div>
            
            <motion.div 
              animate={syncing ? { rotate: 360 } : {}} 
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="p-3 rounded-full bg-blue-600/20 text-blue-400"
            >
              <ArrowRightLeft className="w-6 h-6" />
            </motion.div>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                <Database className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-slate-400">Tally XML Port</p>
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            {syncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Synchronizing Ledger Codes...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-800" />
              </div>
            )}

            <AnimatePresence>
              {status === "SUCCESS" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm justify-center"
                >
                  <CheckCircle2 className="w-4 h-4" /> Reconciliation Complete. 12 Vouchers Pushed.
                </motion.div>
              )}
            </AnimatePresence>

            <Button 
              disabled={syncing}
              onClick={handleSync}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg"
            >
              {syncing ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
              {syncing ? "Syncing..." : "Initiate Global Sync"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card className="glass-pro bg-slate-900/20 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" /> Sync History
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white">Clear Logs</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between items-center p-3 text-sm border-b border-slate-800/50">
                <div className="flex gap-4 items-center">
                  <span className="text-slate-500 font-mono">14-03-2024 10:30</span>
                  <span className="font-semibold">Voucher Push: 45 Invoices</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500">
                  <span className="text-[10px] font-bold">SUCCESS</span>
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
