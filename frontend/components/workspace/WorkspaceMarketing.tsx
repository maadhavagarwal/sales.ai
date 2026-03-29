"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createMarketingCampaign, getMarketingCampaigns, updateMarketingCampaign, deleteMarketingCampaign, exportWorkspaceData } from "@/services/api"
import { useStore } from "@/store/useStore"
import { useToast } from "@/components/ui/Toast"
import { Card, Button, Badge } from "@/components/ui"

export default function WorkspaceMarketing() {
    const { currencySymbol, results, workspaceSyncCount } = useStore()
    const { showToast } = useToast()
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({ name: "", channel: "Meta", spend: 0, conversions: 0, revenue_generated: 0 })
    const [editingId, setEditingId] = useState<number | null>(null)

    const aiSuggestion = results?.strategic_plan || results?.analyst_report?.report || "No active AI growth directive found. Run an Autonomous Analysis to generate multi-channel suggestions."

    useEffect(() => {
        refreshData()
    }, [workspaceSyncCount])

    const refreshData = async () => {
        try {
            const res = await getMarketingCampaigns()
            setCampaigns(res || [])
        } catch (e: any) {
            const errMsg = e?.message || "Failed to load campaigns"
            console.error(errMsg)
            showToast("error", `❌ ${errMsg}`)
        }
    }

    const handleSave = async () => {
        if (!formData.name || !formData.spend) return
        setLoading(true)
        try {
            if (editingId) {
                await updateMarketingCampaign(editingId, formData)
                showToast("success", "✅ Campaign updated successfully")
            } else {
                await createMarketingCampaign(formData)
                showToast("success", "✅ Campaign created successfully")
            }
            setShowCreate(false)
            setEditingId(null)
            setFormData({ name: "", channel: "Meta", spend: 0, conversions: 0, revenue_generated: 0 })
            refreshData()
        } catch (e: any) {
            const errMsg = e?.message || "Failed to save campaign"
            console.error(errMsg)
            showToast("error", `❌ ${errMsg}`)
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (camp: any) => {
        setEditingId(camp.id)
        setFormData({
            name: camp.name,
            channel: camp.channel || "Meta",
            spend: camp.spend,
            conversions: camp.conversions,
            revenue_generated: camp.revenue_generated
        })
        setShowCreate(true)
    }

    const totalSpend = campaigns.reduce((a, b) => a + b.spend, 0)
    const totalRevenue = campaigns.reduce((a, b) => a + b.revenue_generated, 0)
    const avgROAS = totalRevenue / (totalSpend || 1)

    return (
        <div className="space-y-16">
            {/* Performance KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Total Asset Allocation", val: totalSpend, color: "var(--accent-indigo)", icon: "🛡️" },
                    { label: "Yield Generated", val: totalRevenue, color: "var(--accent-emerald)", icon: "💸" },
                    { label: "Aggregated ROAS", val: `${avgROAS.toFixed(2)}x`, color: "var(--accent-cyan)", icon: "🚀" },
                ].map((stat, i) => (
                    <Card key={i} variant="glass" padding="md" className="group">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-10 h-10 rounded-[--radius-sm] flex items-center justify-center text-lg"
                                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}20` }}
                            >
                                {stat.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">{stat.label}</p>
                                <p className="text-xl font-black text-white truncate tracking-tight">
                                    {typeof stat.val === 'number' ? currencySymbol : ''}{stat.val.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* AI Growth Directive */}
            <Card variant="bento" padding="lg" className="border-[--primary]/30/5 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-[--primary]/10 rounded-full" />
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-16 h-16 rounded-2xl bg-[--primary]/20 flex items-center justify-center text-3xl">
                        🤖
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <Badge variant="primary" size="xs" className="mb-3">AI Growth Directive</Badge>
                        <p className="text-lg font-bold text-white leading-relaxed italic pr-12">
                            "{typeof aiSuggestion === 'string' && aiSuggestion.length > 250
                                ? aiSuggestion.substring(0, 250) + "..."
                                : aiSuggestion}"
                        </p>
                    </div>
                </div>
            </Card>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-[--text-primary] tracking-tight">Growth Performance Orchestrator</h2>
                    <p className="text-sm font-medium text-[--text-muted] mt-1 italic">
                        Deploy acquisition drives and track multi-channel ROI in high fidelity.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" size="lg" onClick={() => exportWorkspaceData("marketing")} className="uppercase text-[10px] font-black tracking-widest">
                        Export CSV
                    </Button>
                    <Button variant="pro" size="lg" onClick={() => setShowCreate(true)} icon={<span>⚡</span>} className="shadow-[--shadow-glow]">
                        Deploy New Growth Drive
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 20 }}
                    >
                        <Card variant="bento" padding="lg" className="border-[--primary]/30 bg-[--primary]/5">
                            <div className="space-y-10">
                                <div className="flex justify-between items-center pb-6 border-b border-white/5">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[--primary]">
                                        {editingId ? "Update Capital Deployment Parameters" : "Capital Deployment Protocol"}
                                    </h3>
                                    <Badge variant="outline">Allocation Mode: ACTIVE</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Campaign Nomenclature</label>
                                        <input placeholder="e.g. Q1 Efficiency Scaling" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-pro w-full font-bold bg-black/40" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Acquisition Channel</label>
                                        <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} className="input-pro w-full font-bold bg-black/40">
                                            <option>Meta (FB/IG)</option>
                                            <option>Google Search Ads</option>
                                            <option>LinkedIn B2B</option>
                                            <option>Retargeting Email</option>
                                            <option>Brand Awareness (Offline)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Budget Allocation ({currencySymbol})</label>
                                        <input type="number" value={formData.spend} onChange={(e) => setFormData({ ...formData, spend: parseFloat(e.target.value) || 0 })} className="input-pro w-full font-bold bg-black/40 text-[--accent-cyan]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Conversion Quantum</label>
                                        <input type="number" value={formData.conversions} onChange={(e) => setFormData({ ...formData, conversions: parseInt(e.target.value) || 0 })} className="input-pro w-full font-bold bg-black/40" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Revenue Realization ({currencySymbol})</label>
                                        <input type="number" value={formData.revenue_generated} onChange={(e) => setFormData({ ...formData, revenue_generated: parseFloat(e.target.value) || 0 })} className="input-pro w-full font-bold bg-black/40 text-[--accent-emerald]" />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-10 border-t border-white/5">
                                    <Button variant="pro" size="lg" onClick={handleSave} loading={loading} className="flex-2 h-16 uppercase text-[10px] tracking-widest">
                                        {editingId ? "COMMIT MODIFICATION" : "Authorize Capital Deployment"}
                                    </Button>
                                    <Button variant="outline" size="lg" onClick={() => { setShowCreate(false); setEditingId(null); }} className="flex-1 h-16 uppercase text-[10px] tracking-widest opacity-60">
                                        Abort Launch
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {campaigns.length === 0 ? (
                    <Card variant="glass" padding="lg" className="col-span-full border-dashed border-white/10 py-24 text-center">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[--text-muted] italic">ROAS Data Unavailable</p>
                        <p className="text-[10px] font-bold text-[--text-muted] mt-2 opacity-60">No active acquisition drives detected. Initialize your first campaign expansion protocol.</p>
                    </Card>
                ) : campaigns.map((camp) => (
                    <Card key={camp.id} variant="bento" padding="lg" className="group hover:border-[--primary]/50 transition-all">
                        <div className="flex justify-between items-start mb-8">
                            <div className="min-w-0">
                                <h4 className="text-sm font-black text-white truncate group-hover:text-[--primary] transition-colors">{camp.name}</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[--text-muted] mt-1 opacity-50">{camp.channel}</p>
                            </div>
                            <Badge variant="primary" size="xs">ROI {(camp.revenue_generated / (camp.spend || 1)).toFixed(1)}x</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-white/5 relative">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[--text-muted]">Net Spend</p>
                                <p className="text-md font-black text-white tracking-tight mt-1">
                                    {currencySymbol}{camp.spend.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[--text-muted]">Realized Revenue</p>
                                <p className="text-md font-black text-[--accent-emerald] tracking-tight mt-1">
                                    {currencySymbol}{camp.revenue_generated.toLocaleString()}
                                </p>
                            </div>
                            <div className="absolute -top-12 right-0 flex gap-4 opacity-0 group-hover:opacity-100 transition-all transition-opacity">
                                <button 
                                    onClick={() => handleEdit(camp)}
                                    className="text-[--accent-cyan] font-black text-[8px] tracking-widest hover:underline uppercase"
                                >
                                    EDIT
                                </button>
                                <button 
                                    onClick={async () => {
                                        if(confirm(`Confirm termination of campaign ${camp.name}?`)) {
                                            await deleteMarketingCampaign(camp.id)
                                            refreshData()
                                        }
                                    }}
                                    className="text-[--accent-rose] font-black text-[8px] tracking-widest hover:underline uppercase"
                                >
                                    DELETE
                                </button>
                            </div>
                        </div>

                        <div className="pt-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[--text-muted]">Efficiency Matrix</span>
                                <span className="text-[10px] font-black text-white">{camp.conversions} Conversions</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((camp.revenue_generated / (camp.spend || 1)) * 20, 100)}%` }}
                                    className="h-full"
                                />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
