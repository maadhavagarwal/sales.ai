
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Download, 
  Clock, 
  FileText, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Search
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import Input from "@/components/ui/Input";

export default function CustomerPortal() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch for customer's own invoices
    setTimeout(() => {
      setInvoices([
        { id: "INV-8821", date: "2024-03-10", amount: 45000, status: "UNPAID", due_in: "5 days" },
        { id: "INV-8750", date: "2024-02-25", amount: 12500, status: "PAID", due_in: "-" },
        { id: "INV-8610", date: "2024-02-10", amount: 8900, status: "PAID", due_in: "-" },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="min-h-screen bg-[#050510] text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              Customer Success Portal
            </h1>
            <p className="text-slate-400 mt-1">Authorized access for Acme Corp (GSTIN: 27ABCDE1234F1Z1)</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="glass-pro border-slate-800 text-slate-300">
              <Download className="w-4 h-4 mr-2" /> Download Statement
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white">
              <CreditCard className="w-4 h-4 mr-2" /> Pay Outstanding
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-pro border-slate-800/50 bg-slate-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Outstanding Balance</p>
                  <h3 className="text-2xl font-bold mt-1 text-orange-400">₹45,000.00</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-pro border-slate-800/50 bg-slate-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Open Invoices</p>
                  <h3 className="text-2xl font-bold mt-1 text-white">1 Active</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-pro border-slate-800/50 bg-slate-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Compliance Status</p>
                  <h3 className="text-2xl font-bold mt-1 text-emerald-400">Fully Verified</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card className="glass-pro border-slate-800/50 bg-slate-900/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Your Invoices</CardTitle>
              <CardDescription className="text-slate-500">View history and settle balances</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Search invoice..." className="pl-10 glass-pro border-slate-800" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    <th className="pb-4 text-xs uppercase text-slate-500 font-bold">Invoice ID</th>
                    <th className="pb-4 text-xs uppercase text-slate-500 font-bold">Date</th>
                    <th className="pb-4 text-xs uppercase text-slate-500 font-bold">Amount</th>
                    <th className="pb-4 text-xs uppercase text-slate-500 font-bold">Due In</th>
                    <th className="pb-4 text-xs uppercase text-slate-500 font-bold">Status</th>
                    <th className="pb-4 text-xs uppercase text-slate-500 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {invoices.map((inv) => (
                    <motion.tr 
                      key={inv.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 font-mono text-blue-400">{inv.id}</td>
                      <td className="py-4 text-slate-300">{inv.date}</td>
                      <td className="py-4 font-bold">₹{inv.amount.toLocaleString()}</td>
                      <td className="py-4 text-slate-400">{inv.due_in}</td>
                      <td className="py-4">
                        <Badge className={inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white group-hover:bg-white/10">
                          <Download className="w-4 h-4 mr-2" /> PDF
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Support Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div className="p-6 rounded-2xl glass-pro border-slate-800/50 bg-slate-900/40">
            <h4 className="font-bold text-lg mb-2">Need context on an invoice?</h4>
            <p className="text-slate-400 mb-4 text-sm">Ask our AI assistant about your purchase history, returns, or outstanding balance.</p>
            <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
              Open AI Chat <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="p-6 rounded-2xl glass-pro border-slate-800/50 bg-slate-900/40">
            <h4 className="font-bold text-lg mb-2">Self-Service Returns</h4>
            <p className="text-slate-400 mb-4 text-sm">Initiate a return for damaged goods or quantity mismatch within 48 hours for automatic credit notes.</p>
            <Button variant="outline" className="border-slate-700 text-slate-300">
              Initiate Return Flow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
