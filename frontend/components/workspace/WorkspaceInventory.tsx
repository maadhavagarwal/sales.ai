"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getInventory, addInventoryItem, getInventoryHealth, updateInventoryItem, deleteInventoryItem, exportWorkspaceData } from "@/services/api"
import { useStore } from "@/store/useStore"
import { Card, Button, Badge } from "@/components/ui"

export default function WorkspaceInventory() {
    const { currencySymbol, workspaceSyncCount } = useStore()
    const [items, setItems] = useState<any[]>([])
    const [health, setHealth] = useState<any[]>([])
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        sku: "",
        name: "",
        quantity: 0,
        cost_price: 0,
        sale_price: 0,
        category: "General",
        hsn_code: ""
    })
    const [editingId, setEditingId] = useState<number | null>(null)

    useEffect(() => {
        refreshData()
    }, [workspaceSyncCount])

    const refreshData = async () => {
        try {
            const [res, healthRes] = await Promise.all([
                getInventory(),
                getInventoryHealth()
            ])
            setItems(res)
            setHealth(healthRes)
        } catch (e) {
            console.error(e)
        }
    }

    const handleSave = async () => {
        if (!formData.sku || !formData.name) return
        setLoading(true)
        try {
            if (editingId) {
                await updateInventoryItem(editingId, formData)
            } else {
                await addInventoryItem(formData)
            }
            setShowAdd(false)
            setEditingId(null)
            setFormData({ sku: "", name: "", quantity: 0, cost_price: 0, sale_price: 0, category: "General", hsn_code: "" })
            refreshData()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (item: any) => {
        setEditingId(item.id)
        setFormData({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            cost_price: item.cost_price,
            sale_price: item.sale_price,
            category: item.category || "General Inventory",
            hsn_code: item.hsn_code || ""
        })
        setShowAdd(true)
    }

    const getItemHealth = (sku: string) => health.find(h => h.sku === sku)

    return (
        <div className="space-y-16">
            {/* Stock Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Total Asset SKUs", val: items.length, color: "var(--accent-violet)", icon: "📦" },
                    { label: "Inventory Value (Cost)", val: items.reduce((a, b) => a + (b.quantity * b.cost_price), 0), color: "var(--accent-emerald)", icon: "💰" },
                    { label: "AI Critical Risk", val: health.filter(h => h.risk === "CRITICAL").length, color: "var(--accent-rose)", icon: "🚨" },
                    { label: "Inbound Requirement", val: health.filter(h => h.risk === "WARNING").length, color: "var(--accent-amber)", icon: "🚛" },
                ].map((stat, i) => (
                    <Card key={i} variant="glass" padding="md" className="group">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-10 h-10 rounded-[--radius-sm] flex items-center justify-center text-lg shadow-inner"
                                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}20` }}
                            >
                                {stat.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">{stat.label}</p>
                                <p className={`text-xl font-black tracking-tight ${stat.label.includes('Risk') && stat.val > 0 ? 'text-[--accent-rose]' : 'text-white'}`}>
                                    {typeof stat.val === 'number' && stat.label.includes('Value') ? currencySymbol : ''}{stat.val.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-[--text-primary] tracking-tight">Warehouse Asset Intelligence</h2>
                    <p className="text-sm font-medium text-[--text-muted] mt-1 italic">
                        Predictive inventory management powered by autonomous sales velocity mapping.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" size="lg" onClick={() => exportWorkspaceData("inventory")} className="uppercase text-[10px] font-black tracking-widest">
                        Export CSV
                    </Button>
                    <Button variant="pro" size="lg" onClick={() => setShowAdd(true)} icon={<span>+</span>} className="shadow-[--shadow-glow]">
                        Board New Physical SKU
                    </Button>
                </div>
            </div>

            {/* Predictive Logistics Panel */}
            {health.some(h => h.risk !== "HEALTHY") && (
                <Card variant="bento" padding="lg" className="border-[--accent-rose]/20 bg-[--accent-rose]/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[--accent-rose] mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[--accent-rose] animate-pulse" />
                        Neural Depletion Forecast: Critical Action Required
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {health.filter(h => h.risk !== "HEALTHY").map((h, i) => (
                            <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center group hover:border-white/20 transition-all">
                                <div>
                                    <p className="text-xs font-black text-white">{h.name}</p>
                                    <p className="text-[9px] font-bold text-[--text-muted] uppercase tracking-tighter">SKU: {h.sku} • Velocity: {h.daily_velocity}/day</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[--primary]" />
                                        <p className="text-[9px] font-black text-[--primary] uppercase tracking-widest">Restock: {h.recommended_restock} Units</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-black tracking-tighter ${h.risk === 'CRITICAL' ? 'text-[--accent-rose]' : 'text-[--accent-amber]'}`}>
                                        {h.days_remaining} Days
                                    </p>
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Burn Rate</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Existing Modal & Table - Enhanced with Risk Indicators */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 20 }}
                    >
                        <Card variant="bento" padding="lg" className="border-[--primary]/30 bg-[--primary]/5">
                            <div className="space-y-10">
                                <div className="flex justify-between items-center pb-6 border-b border-white/5">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[--primary]">
                                        {editingId ? "Update Asset Technical Specs" : "Legal Asset Onboarding Protocol"}
                                    </h3>
                                    <Badge variant="outline">SKU ID Generation: Active</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">SKU Identification</label>
                                        <input placeholder="SKU-1001" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="input-pro w-full font-bold bg-black/40" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Asset Nomenclature</label>
                                        <input placeholder="Item full legal name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-pro w-full font-bold bg-black/40" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Asset Classification</label>
                                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-pro w-full font-bold bg-black/40">
                                            <option>General Inventory</option>
                                            <option>Electronics/Hardware</option>
                                            <option>Service Deliverables</option>
                                            <option>Capital Fixed Assets</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Opening Quantum</label>
                                        <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} className="input-pro w-full font-bold bg-black/40" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Base Cost ({currencySymbol})</label>
                                        <input type="number" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} className="input-pro w-full font-bold bg-black/40" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Market Price ({currencySymbol})</label>
                                        <input type="number" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })} className="input-pro w-full font-bold bg-black/40 text-[--accent-cyan]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Statutory HSN</label>
                                        <input placeholder="HSN-998311" value={formData.hsn_code} onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })} className="input-pro w-full font-bold bg-black/40" />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-10 border-t border-white/5">
                                    <Button variant="pro" size="lg" onClick={handleSave} loading={loading} className="flex-2 h-16 uppercase text-[10px] tracking-widest">
                                        {editingId ? "COMMIT ASSET MODIFICATION" : "Authorize Registry & Sync Stocks"}
                                    </Button>
                                    <Button variant="outline" size="lg" onClick={() => { setShowAdd(false); setEditingId(null); }} className="flex-1 h-16 uppercase text-[10px] tracking-widest opacity-60">
                                        Abort Registry
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <Card variant="glass" padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">SKU Instrument</th>
                                <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Asset Description</th>
                                <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Daily Velocity</th>
                                <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Stock Magnitude</th>
                                <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Burn Horizon</th>
                                <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Status</th>
                                <th className="text-center p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <p className="text-xs font-bold text-[--text-muted] italic">Warehouse records empty. Board your first SKU to begin tracking.</p>
                                    </td>
                                </tr>
                            ) : items.map((item) => {
                                const ih = getItemHealth(item.sku)
                                return (
                                    <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="p-6">
                                            <span className="text-[10px] font-black text-[--primary] uppercase tracking-wider bg-[--primary]/10 px-3 py-1 rounded-[--radius-sm]">
                                                {item.sku}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-xs font-black text-white">{item.name}</p>
                                            <p className="text-[9px] font-bold text-[--text-muted] uppercase tracking-widest mt-1 opacity-60">{item.category}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[10px] font-black text-white">{ih?.daily_velocity || '0.0'}</span>
                                            <span className="text-[8px] font-bold text-[--text-muted] ml-1 uppercase">/day</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black ${item.quantity < 10 ? 'text-[--accent-rose]' : 'text-white'}`}>
                                                    {item.quantity}
                                                </span>
                                                <span className="text-[8px] font-bold text-[--text-muted] uppercase">units</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <p className={`text-sm font-black tracking-tighter ${ih?.risk === 'CRITICAL' ? 'text-[--accent-rose]' : 'text-white'}`}>
                                                {ih?.days_remaining || '∞'} Days
                                            </p>
                                            <Badge variant={ih?.risk === 'CRITICAL' ? 'danger' : ih?.risk === 'WARNING' ? 'warning' : 'outline'} size="xs" className="scale-75 origin-left">
                                                {ih?.risk || 'HEALTHY'}
                                            </Badge>
                                        </td>
                                        <td className="p-6 text-right">
                                            <Badge variant={item.quantity > 0 ? 'success' : 'danger'} size="xs" className="px-4">
                                                {item.quantity > 0 ? 'AVAILABLE' : 'DEPLETED'}
                                            </Badge>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex justify-center gap-4">
                                                <button 
                                                    onClick={() => handleEdit(item)}
                                                    className="text-[--accent-cyan] font-black text-[10px] tracking-widest hover:underline opacity-0 group-hover:opacity-100 transition-opacity uppercase"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        if(confirm(`Confirm deletion of SKU ${item.sku}?`)) {
                                                            await deleteInventoryItem(item.id)
                                                            refreshData()
                                                        }
                                                    }}
                                                    className="text-[--accent-rose] font-black text-[10px] tracking-widest hover:underline opacity-0 group-hover:opacity-100 transition-opacity uppercase"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
