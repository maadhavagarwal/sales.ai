"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { addCustomer, getCustomers, getCustomerLedger, deleteCustomer, updateCustomer, exportWorkspaceData, exportCustomerLedger, getHealthScores, getPredictiveCRMInsights } from "@/services/api"
import { useStore } from "@/store/useStore"
import { Card, Button, Badge } from "@/components/ui"

export default function WorkspaceCRM() {
    const { currencySymbol, workspaceSyncCount } = useStore()
    const [customers, setCustomers] = useState<any[]>([])
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [healthScores, setHealthScores] = useState<any>({})
    const [crmInsights, setCrmInsights] = useState<any[]>([])

    // Ledger Modal State
    const [showLedger, setShowLedger] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [ledgerData, setLedgerData] = useState<any[]>([])
    const [ledgerLoading, setLedgerLoading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", gstin: "", pan: "" })
    const [editingId, setEditingId] = useState<number | null>(null)

    useEffect(() => {
        refreshData()
    }, [workspaceSyncCount])

    const refreshData = async () => {
        try {
            const [res, grades, insights] = await Promise.all([
                getCustomers(), 
                getHealthScores(),
                getPredictiveCRMInsights()
            ])
            setCustomers(res)
            setHealthScores(grades || {})
            // Ensure we handle both wrapped and unwrapped insights
            const dataInsights = Array.isArray(insights) ? insights : (insights?.insights || [])
            setCrmInsights(dataInsights)
        } catch (e) {
            console.error(e)
        }
    }

    const handleSave = async () => {
        if (!formData.name) return
        setLoading(true)
        try {
            if (editingId) {
                await updateCustomer(editingId, formData)
            } else {
                await addCustomer(formData)
            }
            setShowAdd(false)
            setEditingId(null)
            setFormData({ name: "", email: "", phone: "", address: "", gstin: "", pan: "" })
            refreshData()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (customer: any) => {
        setEditingId(customer.id)
        setFormData({
            name: customer.name,
            email: customer.email || "",
            phone: customer.phone || "",
            address: customer.address || "",
            gstin: customer.gstin || "",
            pan: customer.pan || ""
        })
        setShowAdd(true)
    }

    const handleViewLedger = async (customer: any) => {
        setSelectedCustomer(customer)
        setShowLedger(true)
        setLedgerLoading(true)
        try {
            // We use name or id as reference for ledger lookup
            const data = await getCustomerLedger(customer.name)
            setLedgerData(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLedgerLoading(false)
        }
    }

    return (
        <div className="space-y-12 font-jakarta">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-white/5">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter">Client Strategic Intelligence</h2>
                    <p className="text-sm font-bold text-[--text-muted] mt-2 opacity-60 uppercase tracking-[0.2em]">
                        Autonomous Entity Registry & Relationship Health Matrix.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" size="lg" onClick={() => exportWorkspaceData("customers")} className="tracking-widest text-[10px]">EXPORT CSV</Button>
                    <Button variant="outline" size="lg" onClick={refreshData} className="tracking-widest text-[10px]">SYNC CORE</Button>
                    <Button variant="pro" size="lg" onClick={() => setShowAdd(true)} icon={<span>+</span>} className="shadow-[--shadow-glow] tracking-widest text-[10px]">
                        BOARD NEW ENTITY
                    </Button>
                </div>
            </div>

            {/* AI Insights Bar */}
            {crmInsights.length > 0 && (
                <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                    {crmInsights.map((insight, idx) => (
                        <div key={idx} className="min-w-[300px] p-6 rounded-2xl bg-[--primary]/5 border border-[--primary]/20 flex items-start gap-4">
                            <span className="text-2xl">💡</span>
                            <div>
                                <p className="text-[10px] font-black text-[--primary] uppercase tracking-widest mb-1">{insight.type}</p>
                                <p className="text-xs font-bold text-white/80">{insight.insight}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -20 }}
                    >
                        <Card variant="bento" padding="lg" className="border-[--primary]/30 bg-[--primary]/5 shadow-[0_0_50px_rgba(99,102,241,0.1)]">
                            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-[--primary]/20 flex items-center justify-center text-xl">{editingId ? "✏️" : "🏢"}</div>
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">
                                    {editingId ? "Update Entity Parameters" : "Strategic Onboarding Protocol"}
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[--text-muted] ml-1">Entity Legal Name</label>
                                    <input
                                        placeholder="e.g. Global Dynamics Corp"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-pro w-full h-14"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[--text-muted] ml-1">Capital Channel (Email)</label>
                                    <input
                                        placeholder="finance@corp.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input-pro w-full h-14"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[--text-muted] ml-1">Telecom Link</label>
                                    <input
                                        placeholder="+91 XXXX XXX XXX"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="input-pro w-full h-14"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[--text-muted] ml-1">Statutory GSTIN</label>
                                    <input
                                        placeholder="27AAAAA0000A1Z5"
                                        value={formData.gstin}
                                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                                        className="input-pro w-full h-14"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[--text-muted] ml-1">Federal PAN</label>
                                    <input
                                        placeholder="ABCDE1234F"
                                        value={formData.pan}
                                        onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                                        className="input-pro w-full h-14"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 mb-12">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[--text-muted] ml-1">Registered Headquarters</label>
                                <textarea
                                    placeholder="Full Registered Address for Statutory Documentation"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input-pro w-full min-h-[120px] py-4 h-auto leading-relaxed"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-5 pt-8 border-t border-white/5">
                                <Button variant="pro" size="lg" onClick={handleSave} loading={loading} className="flex-1 h-14 tracking-widest text-xs">
                                    {editingId ? "COMMIT CHANGES" : "INITIALIZE ENTITY PROFILE"}
                                </Button>
                                <Button variant="outline" size="lg" onClick={() => { setShowAdd(false); setEditingId(null); }} className="px-12 h-14 tracking-widest text-xs">
                                    ABORT
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence>
                    {customers.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="md:col-span-2 xl:col-span-3"
                        >
                            <Card variant="glass" padding="lg" className="py-40 text-center border-dashed border-2 border-white/5 bg-white/[0.01]">
                                <div className="w-24 h-24/10 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl opacity-40">
                                    🧬
                                </div>
                                <h4 className="text-xs font-black text-white uppercase tracking-[0.4em]">Corporate Registry Vacant</h4>
                                <p className="text-sm font-bold text-[--text-muted] mt-4 opacity-40 italic max-w-sm mx-auto leading-relaxed">
                                    Onboard enterprise stakeholders to activate statutory tracking and relationship lifecycle management.
                                </p>
                            </Card>
                        </motion.div>
                    ) : (
                        customers.map((c, i) => (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.05, duration: 0.5 }}
                            >
                                <Card variant="glass" padding="lg" className="group hover:border-[--primary]/40 transition-all duration-700 bg-black/40 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[--primary]/5 rounded-full -translate-y-16 translate-x-16 group-hover:bg-[--primary]/10 transition-colors" />

                                    <div className="flex justify-between items-start mb-8 relative z-10">
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-black text-white tracking-tighter group-hover:text-[--primary] transition-colors leading-tight">{c.name}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline" className="text-[8px] tracking-widest border-white/10 uppercase py-0 px-2 opacity-50 font-bold">UID: {String(c.id).slice(0, 8)}</Badge>
                                                {c.gstin && <Badge variant="pro" pulse size="xs">GST: ACTIVE</Badge>}
                                                {healthScores[c.name] && (
                                                    <Badge 
                                                        variant={healthScores[c.name] > 80 ? "success" : healthScores[c.name] > 50 ? "warning" : "danger"} 
                                                        size="xs"
                                                    >
                                                        {healthScores[c.name]}% HEALTH
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center text-xl grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500">
                                            💎
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-10 relative z-10">
                                        <div className="flex items-center gap-4 text-[11px] font-bold text-[--text-secondary] bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                            <span className="opacity-40 text-sm">✉️</span>
                                            <span className="font-geist tracking-tight truncate">{c.email || 'entity@neural.hq'}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[11px] font-bold text-[--text-secondary] bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                            <span className="opacity-40 text-sm">📱</span>
                                            <span className="font-geist tracking-tight">{c.phone || '+91 LOG REQ'}</span>
                                        </div>
                                        <div className="flex items-start gap-4 text-[11px] font-bold text-[--text-muted] p-3">
                                            <span className="opacity-40 text-sm mt-0.5">🏢</span>
                                            <span className="line-clamp-2 leading-relaxed italic opacity-80">{c.address || 'Statutory HQ Pending Verification.'}</span>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[--text-muted] opacity-60">Revenue Yield (LTV)</span>
                                            <span className="text-2xl font-black text-white tracking-tighter mt-1 group-hover:text-[--primary] transition-colors">
                                                {currencySymbol}{(c.total_spend || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewLedger(c)}
                                                className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 tracking-[0.2em] text-[8px] font-black uppercase"
                                            >
                                                VIEW LEDGER →
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(c)}
                                                className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 tracking-[0.2em] text-[8px] font-black uppercase text-[--accent-cyan]"
                                            >
                                                EDIT PARAMETERS
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    if(confirm(`Confirm de-registration of ${c.name}?`)) {
                                                        await deleteCustomer(c.id)
                                                        refreshData()
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 tracking-[0.2em] text-[8px] font-black uppercase text-[--accent-rose]"
                                            >
                                                DELETE ENTITY
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Entity Ledger Modal */}
            <AnimatePresence>
                {showLedger && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowLedger(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-5xl max-h-[80vh] overflow-hidden"
                        >
                            <Card variant="bento" padding="none" className="h-full flex flex-col border-[--primary]/30 bg-black/60 shadow-[0_0_100px_rgba(99,102,241,0.2)]">
                                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <div className="flex gap-10 items-center">
                                        <div>
                                            <Badge variant="pro" className="mb-2">Entity Audit Trail</Badge>
                                            <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{selectedCustomer?.name}</h3>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => exportCustomerLedger(selectedCustomer.name)}
                                            className="tracking-[0.2em] text-[8px] font-black"
                                        >
                                            EXPORT LEDGER (CSV)
                                        </Button>
                                    </div>
                                    <button onClick={() => setShowLedger(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 house:text-white transition-colors">×</button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 scrollbar-pro">
                                    {ledgerLoading ? (
                                        <div className="py-20 text-center"><div className="spinner mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-white">Hydrating Ledger Stream...</p></div>
                                    ) : (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/5 text-left">
                                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Date</th>
                                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Type</th>
                                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Particulars</th>
                                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">VCH ID</th>
                                                    <th className="pb-4 text-right text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Debit</th>
                                                    <th className="pb-4 text-right text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Credit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {ledgerData.map((row, i) => (
                                                    <tr key={i} className="group hover:bg-white/[0.01]">
                                                        <td className="py-4 text-xs font-bold text-white/50">{row.date}</td>
                                                        <td className="py-4"><Badge variant="outline" size="xs" className="uppercase px-4">{row.voucher_type || 'Journal'}</Badge></td>
                                                        <td className="py-4">
                                                            <p className="text-xs font-black text-white">{row.account_name}</p>
                                                            <p className="text-[9px] font-bold text-[--text-muted] tracking-tight">{row.description}</p>
                                                        </td>
                                                        <td className="py-4 text-[9px] font-mono text-[--text-muted]">{row.voucher_id}</td>
                                                        <td className="py-4 text-right font-black text-sm text-[--accent-cyan]">
                                                            {row.amount > 0 ? (currencySymbol + row.amount.toLocaleString()) : ""}
                                                        </td>
                                                        <td className="py-4 text-right font-black text-sm text-[--accent-rose]">
                                                            {row.amount < 0 ? (currencySymbol + Math.abs(row.amount).toLocaleString()) : ""}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {ledgerData.length === 0 && (
                                                    <tr><td colSpan={6} className="py-20 text-center text-xs font-bold text-[--text-muted] italic">No transaction records found for this entity.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                <div className="p-8 bg-white/[0.02] border-t border-white/5 flex justify-between items-center text-sm font-black text-white tracking-tighter">
                                    <span>NET STATUTORY BALANCE</span>
                                    <span className={ledgerData.reduce((a, b) => a + b.amount, 0) >= 0 ? "text-[--accent-cyan]" : "text-[--accent-rose]"}>
                                        {currencySymbol}{ledgerData.reduce((a, b) => a + b.amount, 0).toLocaleString()}
                                    </span>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
