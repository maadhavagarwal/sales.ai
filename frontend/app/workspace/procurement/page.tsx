
"use client";

import React, { useState } from "react";
import { 
  Truck, 
  ShoppingCart, 
  ArrowRightLeft, 
  Warehouse, 
  History, 
  Plus, 
  Search,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import Input from "@/components/ui/Input";

export default function LogisticsProcurement() {
  const [activeTab, setActiveTab] = useState("procurement");

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-[--text-primary]">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[--text-primary]">
            Logistics & Procurement
          </h1>
          <p className="text-[--text-secondary] mt-1">Manage purchase orders and inter-location stock transfers</p>
        </div>
        <div className="flex gap-2">
            <Button className="bg-[--primary] hover:brightness-110 text-white">
                <Plus className="w-4 h-4 mr-2" /> New Request
            </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[--surface-2] p-1 border border-[--border-default]">
          <TabsTrigger value="procurement" className="data-[state=active]:bg-[--primary] data-[state=active]:text-white">
            <ShoppingCart className="w-4 h-4 mr-2" /> Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="logistics" className="data-[state=active]:bg-[--secondary] data-[state=active]:text-white">
            <Truck className="w-4 h-4 mr-2" /> Stock Transfers
          </TabsTrigger>
        </TabsList>

        {/* --- Procurement Tab --- */}
        <TabsContent value="procurement" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <Card className="bg-[--surface-1] border-[--border-default]">
                <CardContent className="pt-6">
                    <p className="text-xs text-[--text-dim] uppercase tracking-widest font-bold">Planned Spend (90d)</p>
                    <h3 className="text-2xl font-bold mt-1 text-[--text-primary]">₹1.2Cr</h3>
                </CardContent>
             </Card>
             <Card className="bg-[--surface-1] border-[--border-default]">
                <CardContent className="pt-6">
                    <p className="text-xs text-[--text-dim] uppercase tracking-widest font-bold">Open POs</p>
                    <h3 className="text-2xl font-bold mt-1 text-orange-400">12 Pending</h3>
                </CardContent>
             </Card>
             <Card className="bg-[--surface-1] border-[--border-default]">
                <CardContent className="pt-6">
                    <p className="text-xs text-[--text-dim] uppercase tracking-widest font-bold">Supplier Lead Time</p>
                    <h3 className="text-2xl font-bold mt-1 text-emerald-400">4.2 Days</h3>
                </CardContent>
             </Card>
             <Card className="bg-[--surface-1] border-[--border-default]">
                <CardContent className="pt-6">
                    <p className="text-xs text-[--text-dim] uppercase tracking-widest font-bold">Reorder Alerts</p>
                    <h3 className="text-2xl font-bold mt-1 text-red-400">5 SKU Critical</h3>
                </CardContent>
             </Card>
          </div>

          <Card className="bg-[--surface-1] border-[--border-default]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[--text-primary]">Active Purchase Orders</CardTitle>
                <CardDescription className="text-[--text-secondary]">Track status of external stock procurement</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[--text-dim]" />
                <Input placeholder="Filter POs..." className="pl-8 h-8 text-xs border-[--border-default] bg-[--surface-2]" />
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[--border-subtle] text-left text-[--text-dim]">
                    <th className="pb-3 px-2">PO ID</th>
                    <th className="pb-3 px-2">Supplier</th>
                    <th className="pb-3 px-2">Total Value</th>
                    <th className="pb-3 px-2">Expected</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border-subtle]">
                  {[
                    { id: "PO-X8821", supplier: "Intel Corp", value: "₹45,00,000", date: "15 Mar 2024", status: "PENDING" },
                    { id: "PO-X8750", supplier: "Nvidia India", value: "₹28,50,000", date: "18 Mar 2024", status: "ORDERED" },
                    { id: "PO-X8610", supplier: "Samsung Logistics", value: "₹12,40,000", date: "10 Mar 2024", status: "RECEIVED" },
                  ].map(po => (
                    <tr key={po.id} className="group hover:bg-[--surface-2] transition-colors">
                      <td className="py-4 px-2 font-mono text-emerald-400">{po.id}</td>
                      <td className="py-4 px-2 font-semibold text-[--text-primary]">{po.supplier}</td>
                      <td className="py-4 px-2 font-bold text-[--text-primary]">{po.value}</td>
                      <td className="py-4 px-2 text-[--text-secondary] text-xs">{po.date}</td>
                      <td className="py-4 px-2">
                        <Badge className={po.status === "RECEIVED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : (po.status === "PENDING" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20")}>
                          {po.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-[--text-dim] hover:text-[--text-primary]">View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Stock Transfer Tab --- */}
        <TabsContent value="logistics" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Transfer Form */}
                <Card className="bg-[--surface-1] border-[--border-default]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-blue-400" /> Inter-Location Transfer
                    </CardTitle>
                  <CardDescription className="text-[--text-secondary]">Move stock between warehouses or retail outlets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                      <label className="text-[10px] uppercase text-[--text-dim] font-bold ml-1">Source Node</label>
                      <select className="w-full bg-[--surface-2] border border-[--border-default] rounded-md p-2 text-sm">
                                <option>Main Warehouse (Mumbai)</option>
                                <option>Distribution Hub (Delhi)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                      <label className="text-[10px] uppercase text-[--text-dim] font-bold ml-1">Destination Node</label>
                      <select className="w-full bg-[--surface-2] border border-[--border-default] rounded-md p-2 text-sm">
                                <option>Retail Outlet (Bandra)</option>
                                <option>Distribution Hub (Delhi)</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[--text-dim] font-bold ml-1">Select SKU</label>
                    <Input placeholder="Enter SKU ID or Product Name..." className="bg-[--surface-2] border-[--border-default] h-10" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                      <label className="text-[10px] uppercase text-[--text-dim] font-bold ml-1">Quantity</label>
                      <Input type="number" defaultValue={1} className="bg-[--surface-2] border-[--border-default] h-10" />
                        </div>
                        <div className="space-y-1 flex items-end">
                       <Button className="w-full bg-[--secondary] hover:brightness-110 text-white font-bold h-10">
                                Authorize Transfer
                             </Button>
                        </div>
                    </div>
                </CardContent>
              </Card>

              {/* Warehouse Status */}
              <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[--text-secondary] flex items-center gap-2">
                    <Warehouse className="w-4 h-4" /> Node Capacity Status
                 </h4>
                 <div className="space-y-2">
                    {[
                        { name: "Main Warehouse (MUM)", cap: "89%", status: "At Logic Limit", color: "text-orange-400" },
                        { name: "Retail Bandra (BOM)", cap: "42%", status: "Optimal", color: "text-emerald-400" },
                        { name: "North Hub (DEL)", cap: "12%", status: "Idle", color: "text-slate-500" },
                    ].map(node => (
                        <div key={node.name} className="p-3 rounded-lg bg-[--surface-1] border border-[--border-default] flex justify-between items-center">
                            <div>
                            <p className="font-semibold text-sm text-[--text-primary]">{node.name}</p>
                                <p className={`text-[10px] font-bold ${node.color} uppercase tracking-tight`}>{node.status}</p>
                            </div>
                            <div className="text-right">
                            <p className="text-lg font-bold font-mono text-[--text-primary]">{node.cap}</p>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Transfer History */}
           <Card className="bg-[--surface-1] border-[--border-default]">
             <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="text-lg flex items-center gap-2">
                   <History className="w-4 h-4 text-[--text-dim]" /> Logistic Feed
               </CardTitle>
               <Button variant="ghost" size="sm" className="text-xs text-[--text-dim] hover:text-[--text-primary]">Full Audit Log</Button>
             </CardHeader>
             <CardContent>
               <div className="space-y-3">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="flex justify-between items-center p-3 text-xs border-b border-[--border-subtle]">
                     <div className="flex gap-3 items-center">
                        <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500">
                            <CheckCircle className="w-3 h-3" />
                        </div>
                        <div>
                            <span className="font-semibold text-[--text-primary]">MUM → DEL</span>
                            <p className="text-[--text-secondary] mt-0.5">50x RTX 4090 TI (SKU: G-8821) Transferred</p>
                        </div>
                     </div>
                     <span className="text-[--text-dim] font-mono">2h ago</span>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
