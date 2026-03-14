"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    getInventory, 
    addInventoryItem, 
    getInventoryHealth, 
    updateInventoryItem, 
    deleteInventoryItem, 
    exportWorkspaceData,
    managePurchaseOrders,
    transferInventory,
    getInventoryTransfers
} from "@/services/api"
import { useStore } from "@/store/useStore"
import { Card, Button, Badge } from "@/components/ui"

export default function WorkspaceInventory() {
    const { currencySymbol, workspaceSyncCount } = useStore()
    const [items, setItems] = useState<any[]>([])
    const [pos, setPOs] = useState<any[]>([])
    const [transfers, setTransfers] = useState<any[]>([])
    const [health, setHealth] = useState<any[]>([])
    const [showAdd, setShowAdd] = useState(false)
    const [showPO, setShowPO] = useState(false)
    const [showTransfer, setShowTransfer] = useState(false)
    const [activeTab, setActiveTab] = useState<"stock" | "procurement" | "transfers">("stock")
    const [loading, setLoading] = useState(false)

    // Form states
    const [formData, setFormData] = useState({
        sku: "",
        name: "",
        quantity: 0,
        cost_price: 0,
        sale_price: 0,
        category: "General",
        hsn_code: ""
    })
    const [poForm, setPOForm] = useState({ supplier: "", items: [{ sku: "", quantity: 10, unit_price: 0 }] })
    const [transferForm, setTransferForm] = useState({ sku: "", quantity: 0, from_location: "MAIN", to_location: "" })
    const [editingId, setEditingId] = useState<number | null>(null)

    useEffect(() => {
        refreshData()
    }, [workspaceSyncCount, activeTab])

    const refreshData = async () => {
        setLoading(true)
        try {
            if (activeTab === "stock") {
                const [res, healthRes] = await Promise.all([
                    getInventory(),
                    getInventoryHealth()
                ])
                setItems(res)
                setHealth(healthRes)
            } else if (activeTab === "procurement") {
                const poRes = await managePurchaseOrders("LIST")
                setPOs(poRes)
            } else {
                const transRes = await getInventoryTransfers()
                setTransfers(transRes)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
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

    const handleCreatePO = async () => {
        setLoading(true)
        try {
            await managePurchaseOrders("CREATE", poForm)
            setShowPO(false)
            setPOForm({ supplier: "", items: [{ sku: "", quantity: 10, unit_price: 0 }] })
            refreshData()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleTransfer = async () => {
        if (!transferForm.sku || !transferForm.to_location) return
        setLoading(true)
        try {
            await transferInventory(transferForm)
            setShowTransfer(false)
            setTransferForm({ sku: "", quantity: 0, from_location: "MAIN", to_location: "" })
            refreshData()
        } catch (e) {
            alert("Transfer failed: Stock unavailable or SKU mismatch.")
        } finally {
            setLoading(false)
        }
    }

    const handleReceivePO = async (poId: string) => {
        if (!confirm("Authorize receipt of this shipment? This will update local stock quantum.")) return
        setLoading(true)
        try {
            await managePurchaseOrders("RECEIVE", { po_id: poId })
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
                    { label: "Active POs", val: pos.filter(p => p.status === 'PENDING').length, color: "var(--accent-amber)", icon: "🚛" },
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
                    <div className="flex flex-wrap gap-4 mt-4">
                        <button 
                            onClick={() => setActiveTab("stock")}
                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${activeTab === 'stock' ? 'bg-white text-black border-white' : 'text-[--text-muted] border-white/10 hover:border-white/30'}`}
                        >
                            Physical Stock
                        </button>
                        <button 
                            onClick={() => setActiveTab("procurement")}
                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${activeTab === 'procurement' ? 'bg-white text-black border-white' : 'text-[--text-muted] border-white/10 hover:border-white/30'}`}
                        >
                            Inbound Procurement
                        </button>
                        <button 
                            onClick={() => setActiveTab("transfers")}
                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${activeTab === 'transfers' ? 'bg-white text-black border-white' : 'text-[--text-muted] border-white/10 hover:border-white/30'}`}
                        >
                            Inter-Facility Transfers
                        </button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" size="lg" onClick={() => exportWorkspaceData("inventory")} className="uppercase text-[10px] font-black tracking-widest">
                        Export CSV
                    </Button>
                    {activeTab === 'stock' && (
                        <Button variant="pro" size="lg" onClick={() => setShowTransfer(true)} icon={<span>🔄</span>} className="shadow-[--shadow-glow] bg-[--accent-violet] border-[--accent-violet]">
                            Transfer Stock
                        </Button>
                    )}
                    {activeTab === 'stock' ? (
                        <Button variant="pro" size="lg" onClick={() => setShowAdd(true)} icon={<span>+</span>} className="shadow-[--shadow-glow]">
                            Board New Physical SKU
                        </Button>
                    ) : (
                        <Button variant="pro" size="lg" onClick={() => setShowPO(true)} icon={<span>🚚</span>} className="shadow-[--shadow-glow] bg-[--accent-amber] border-[--accent-amber]">
                            Authorize New PO
                        </Button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === "stock" ? (
                    <motion.div key="stock" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        {/* Predictive Logistics Panel */}
                        {health.some(h => h.risk !== "HEALTHY") && (
                            <Card variant="bento" padding="lg" className="border-[--accent-rose]/20 bg-[--accent-rose]/5 mb-16">
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
                                                <td colSpan={7} className="py-24 text-center">
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
                                                            <button onClick={() => handleEdit(item)} className="text-[--accent-cyan] font-black text-[10px] tracking-widest hover:underline opacity-0 group-hover:opacity-100 transition-opacity uppercase">Edit</button>
                                                            <button onClick={async () => {
                                                                if(confirm(`Confirm deletion of SKU ${item.sku}?`)) {
                                                                    await deleteInventoryItem(item.id)
                                                                    refreshData()
                                                                }
                                                            }} className="text-[--accent-rose] font-black text-[10px] tracking-widest hover:underline opacity-0 group-hover:opacity-100 transition-opacity uppercase">Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </motion.div>
                ) : activeTab === "procurement" ? (
                    <motion.div key="procurement" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <Card variant="glass" padding="none" className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.01]">
                                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">PO Matrix</th>
                                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Authorized Supplier</th>
                                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Expected Delivery</th>
                                            <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Gross Total</th>
                                            <th className="text-center p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Operational Status</th>
                                            <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {pos.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-24 text-center">
                                                    <p className="text-xs font-bold text-[--text-muted] italic">No active procurement operations. Authorize a PO to begin.</p>
                                                </td>
                                            </tr>
                                        ) : pos.map((po) => (
                                            <tr key={po.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-6 font-black text-[--accent-amber] text-xs">#{po.id}</td>
                                                <td className="p-6 text-xs font-black text-white">{po.supplier_name}</td>
                                                <td className="p-6 text-[10px] font-black text-[--text-muted] uppercase tracking-widest">{po.expected_date}</td>
                                                <td className="p-6 text-right font-black text-white text-sm">{currencySymbol}{po.total_amount.toLocaleString()}</td>
                                                <td className="p-6 text-center">
                                                    <Badge variant={po.status === 'RECEIVED' ? 'success' : 'warning'}>{po.status}</Badge>
                                                </td>
                                                <td className="p-6 text-right">
                                                    {po.status === 'PENDING' && (
                                                        <Button variant="ghost" size="xs" onClick={() => handleReceivePO(po.id)} className="text-[--accent-emerald] border border-[--accent-emerald]/20 uppercase text-[9px] font-black tracking-widest">
                                                            Authorize Receipt
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div key="transfers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <Card variant="glass" padding="none" className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.01]">
                                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Transfer Link</th>
                                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">SKU Instrument</th>
                                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Facility Route</th>
                                            <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Quantity</th>
                                            <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Timestamp</th>
                                            <th className="text-center p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {transfers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-24 text-center text-[--text-muted] italic">No inter-facility movements recorded.</td>
                                            </tr>
                                        ) : transfers.map((t, idx) => (
                                            <tr key={idx} className="group hover:bg-white/[0.02]">
                                                <td className="p-6 font-black text-[--accent-violet] text-xs">TR-{idx+1000}</td>
                                                <td className="p-6 text-xs font-black text-white">{t.sku}</td>
                                                <td className="p-6 text-[10px] font-black text-[--text-muted] uppercase tracking-widest">{t.from_location} → {t.to_location}</td>
                                                <td className="p-6 text-right font-black text-white">{t.quantity}</td>
                                                <td className="p-6 text-right text-[10px] font-bold text-white/40">{t.timestamp}</td>
                                                <td className="p-6 text-center"><Badge variant="success">AUTHORIZED</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals for Add/Edit, PO, and Transfer */}
            <AnimatePresence>
                {(showAdd || showPO || showTransfer) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl">
                            {showAdd ? (
                                <Card variant="bento" padding="lg" className="border-[--primary]/30 bg-black shadow-2xl">
                                    <div className="space-y-10">
                                        <div className="flex justify-between items-center pb-6 border-b border-white/5">
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[--primary]">
                                                {editingId ? "Update Asset Technical Specs" : "Legal Asset Onboarding Protocol"}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">SKU Identification</label>
                                                <input placeholder="SKU-1001" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="input-pro w-full font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Asset Nomenclature</label>
                                                <input placeholder="Item full legal name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-pro w-full font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Classification</label>
                                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-pro w-full font-bold">
                                                    <option>General Inventory</option>
                                                    <option>Electronics/Hardware</option>
                                                    <option>Service Deliverables</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-10">
                                            <Button variant="pro" size="lg" onClick={handleSave} loading={loading} className="flex-2 uppercase text-[10px] tracking-widest">Commit Registry</Button>
                                            <Button variant="outline" size="lg" onClick={() => setShowAdd(false)} className="flex-1 uppercase text-[10px] tracking-widest opacity-60">Abort</Button>
                                        </div>
                                    </div>
                                </Card>
                            ) : showPO ? (
                                <Card variant="bento" padding="lg" className="border-[--accent-amber]/30 bg-black shadow-2xl">
                                    <div className="space-y-10">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[--accent-amber]">Authorize Multi-Asset Purchase Order</h3>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Authorized Supplier</label>
                                                <input placeholder="Supplier legal name" value={poForm.supplier} onChange={(e) => setPOForm({ ...poForm, supplier: e.target.value })} className="input-pro w-full font-bold" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">PO Lines</label>
                                                {poForm.items.map((it, i) => (
                                                    <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <input placeholder="SKU" value={it.sku} onChange={(e) => {
                                                            const ni = [...poForm.items]; ni[i].sku = e.target.value; setPOForm({...poForm, items: ni})
                                                        }} className="input-pro w-full font-bold" />
                                                        <input type="number" placeholder="Qty" value={it.quantity} onChange={(e) => {
                                                            const ni = [...poForm.items]; ni[i].quantity = parseInt(e.target.value) || 0; setPOForm({...poForm, items: ni})
                                                        }} className="input-pro w-full font-bold" />
                                                        <input type="number" placeholder="Unit Price" value={it.unit_price} onChange={(e) => {
                                                            const ni = [...poForm.items]; ni[i].unit_price = parseFloat(e.target.value) || 0; setPOForm({...poForm, items: ni})
                                                        }} className="input-pro w-full font-bold" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-10">
                                            <Button variant="pro" size="lg" onClick={handleCreatePO} loading={loading} className="flex-2 bg-[--accent-amber] border-[--accent-amber] text-black font-black uppercase text-[10px] tracking-widest">Authorize & Send PO</Button>
                                            <Button variant="outline" size="lg" onClick={() => setShowPO(false)} className="flex-1 uppercase text-[10px] tracking-widest opacity-60">Discard Draft</Button>
                                        </div>
                                    </div>
                                </Card>
                            ) : (
                                <Card variant="bento" padding="lg" className="border-[--accent-violet]/30 bg-black shadow-2xl">
                                    <div className="space-y-10">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[--accent-violet]">Inter-Facility Asset Transfer Protocol</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">SKU Instrument</label>
                                                <select 
                                                    value={transferForm.sku} 
                                                    onChange={(e) => setTransferForm({ ...transferForm, sku: e.target.value })} 
                                                    className="input-pro w-full font-bold"
                                                >
                                                    <option value="">Select Asset...</option>
                                                    {items.map(i => <option key={i.sku} value={i.sku}>{i.sku} - {i.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Destination Facility</label>
                                                <input 
                                                    placeholder="e.g. WAREHOUSE-B" 
                                                    value={transferForm.to_location} 
                                                    onChange={(e) => setTransferForm({ ...transferForm, to_location: e.target.value })} 
                                                    className="input-pro w-full font-bold" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Transfer Quantity</label>
                                                <input 
                                                    type="number" 
                                                    value={transferForm.quantity} 
                                                    onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 0 })} 
                                                    className="input-pro w-full font-bold" 
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-10">
                                            <Button variant="pro" size="lg" onClick={handleTransfer} loading={loading} className="flex-2 bg-[--accent-violet] border-[--accent-violet] uppercase text-[10px] tracking-widest">Authorize Transfer</Button>
                                            <Button variant="outline" size="lg" onClick={() => setShowTransfer(false)} className="flex-1 uppercase text-[10px] tracking-widest opacity-60">Abort</Button>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
