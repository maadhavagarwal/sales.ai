
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
        const response = await fetch(`${baseUrl}/api/portal/dashboard`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data === "object") {
            const invoiceList = data.recent_invoices || data.invoices || [];
            setInvoices(Array.isArray(invoiceList) ? invoiceList : []);
          }
        } else {
          setError("Unable to load portal data. Please login with a valid account.");
          setInvoices([]);
        }
      } catch (err) {
        console.warn("Failed to fetch portal data:", err);
        setError("Portal service unavailable. Please retry shortly.");
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, []);

  return (
    <div className="min-h-screen bg-[--surface-0] text-[--text-primary] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[--text-primary]">
              Customer Success Portal
            </h1>
            <p className="text-[--text-secondary] mt-1">Authorized access for Acme Corp (GSTIN: 27ABCDE1234F1Z1)</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-[--border-default] bg-[--surface-1] text-[--text-secondary] hover:text-[--text-primary]">
              <Download className="w-4 h-4 mr-2" /> Download Statement
            </Button>
            <Button className="bg-[--primary] hover:brightness-110 text-white">
              <CreditCard className="w-4 h-4 mr-2" /> Pay Outstanding
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-[--border-default] bg-[--surface-1]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[--text-muted] uppercase tracking-wider font-semibold">Outstanding Balance</p>
                  <h3 className="text-2xl font-bold mt-1 text-orange-400">₹45,000.00</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[--border-default] bg-[--surface-1]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[--text-muted] uppercase tracking-wider font-semibold">Open Invoices</p>
                  <h3 className="text-2xl font-bold mt-1 text-[--text-primary]">1 Active</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[--border-default] bg-[--surface-1]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[--text-muted] uppercase tracking-wider font-semibold">Compliance Status</p>
                  <h3 className="text-2xl font-bold mt-1 text-emerald-400">Fully Verified</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card className="border-[--border-default] bg-[--surface-1]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl text-[--text-primary]">Your Invoices</CardTitle>
              <CardDescription className="text-[--text-secondary]">View history and settle balances</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-dim]" />
              <Input placeholder="Search invoice..." className="pl-10 border-[--border-default] bg-[--surface-2]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[--border-subtle] text-left">
                    <th className="pb-4 text-xs uppercase text-[--text-dim] font-bold">Invoice ID</th>
                    <th className="pb-4 text-xs uppercase text-[--text-dim] font-bold">Date</th>
                    <th className="pb-4 text-xs uppercase text-[--text-dim] font-bold">Amount</th>
                    <th className="pb-4 text-xs uppercase text-[--text-dim] font-bold">Due In</th>
                    <th className="pb-4 text-xs uppercase text-[--text-dim] font-bold">Status</th>
                    <th className="pb-4 text-xs uppercase text-[--text-dim] font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border-subtle]">
                  {invoices.map((inv) => (
                    <motion.tr 
                      key={inv.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-[--surface-2] transition-colors"
                    >
                      <td className="py-4 font-mono text-[--primary]">{inv.id}</td>
                      <td className="py-4 text-[--text-secondary]">{inv.date}</td>
                      <td className="py-4 font-bold text-[--text-primary]">₹{(inv.grand_total || inv.amount || 0).toLocaleString()}</td>
                      <td className="py-4 text-[--text-secondary]">{inv.due_in || inv.status || "—"}</td>
                      <td className="py-4">
                        <Badge className={inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Button variant="ghost" size="sm" className="text-[--text-dim] hover:text-[--text-primary] group-hover:bg-[--surface-3]">
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
          <div className="p-6 rounded-2xl border border-[--border-default] bg-[--surface-1]">
            <h4 className="font-bold text-lg mb-2 text-[--text-primary]">Need context on an invoice?</h4>
            <p className="text-[--text-secondary] mb-4 text-sm">Ask our AI assistant about your purchase history, returns, or outstanding balance.</p>
            <Button variant="outline" className="border-[--primary]/30 text-[--primary] hover:bg-[--primary]/10">
              Open AI Chat <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="p-6 rounded-2xl border border-[--border-default] bg-[--surface-1]">
            <h4 className="font-bold text-lg mb-2 text-[--text-primary]">Self-Service Returns</h4>
            <p className="text-[--text-secondary] mb-4 text-sm">Initiate a return for damaged goods or quantity mismatch within 48 hours for automatic credit notes.</p>
            <Button variant="outline" className="border-[--border-default] text-[--text-secondary] hover:text-[--text-primary]">
              Initiate Return Flow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
