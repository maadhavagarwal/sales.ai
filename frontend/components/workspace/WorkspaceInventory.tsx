"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getInventory, addInventoryItem } from "@/services/api"
import { useStore } from "@/store/useStore"

export default function WorkspaceInventory() {
    const { currencySymbol } = useStore()
    const [items, setItems] = useState<any[]>([])
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        sku: "",
        name: "",
        quantity: 0,
        cost_price: 0,
        sale_price: 0,
        category: "General"
    })

    useEffect(() => {
        refreshData()
    }, [])

    const refreshData = async () => {
        try {
            const res = await getInventory()
            setItems(res)
        } catch (e) {
            console.error(e)
        }
    }

    const handleAdd = async () => {
        if (!formData.sku || !formData.name) return alert("SKU and Name are mandatory")
        setLoading(true)
        try {
            await addInventoryItem(formData)
            setShowAdd(false)
            setFormData({ sku: "", name: "", quantity: 0, cost_price: 0, sale_price: 0, category: "General" })
            refreshData()
        } catch (e) {
            alert("Failed to add inventory item. SKU might already exist.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Stock Analytics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }}>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-indigo)" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Assets</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800 }}>{items.length}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-emerald)" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Inventory Value</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{currencySymbol}{items.reduce((a, b) => a + (b.quantity * b.cost_price), 0).toLocaleString()}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-amber)" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Low Stock items</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-amber)" }}>{items.filter(i => i.quantity < 10).length}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-cyan)" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Projected Revenue</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-cyan)" }}>{currencySymbol}{items.reduce((a, b) => a + (b.quantity * b.sale_price), 0).toLocaleString()}</p>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Items & Physical Stock</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Manage your warehouse assets and SKU-level inventory</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAdd(true)}>
                    + Add New Stock Item
                </button>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="chart-card"
                        style={{ border: "1px solid var(--primary-500)", background: "rgba(99,102,241,0.02)", padding: "2rem" }}
                    >
                        <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--primary-400)" }}>Onboard Physical Asset</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>SKU ID</label>
                                <input placeholder="SKU-1001" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Item Name</label>
                                <input placeholder="High Performance Server" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Category</label>
                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }}>
                                    <option>General</option>
                                    <option>Electronics</option>
                                    <option>Services</option>
                                    <option>Assets</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Current Qty</label>
                                <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Cost Price ({currencySymbol})</label>
                                <input type="number" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Sale Price ({currencySymbol})</label>
                                <input type="number" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button className="btn-primary" onClick={handleAdd} disabled={loading} style={{ flex: 1 }}>{loading ? "Registering..." : "Onboard Asset"}</button>
                            <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="chart-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Stock Level</th>
                            <th>Unit Value</th>
                            <th>Total Value</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No warehouse assets found. Board your first stock item.</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.id}>
                                <td style={{ fontWeight: 800, color: "var(--primary-400)", fontSize: "0.75rem" }}>{item.sku}</td>
                                <td>{item.name}</td>
                                <td><span className="badge badge-secondary">{item.category}</span></td>
                                <td style={{ fontWeight: 800, color: item.quantity < 10 ? "var(--accent-amber)" : "inherit" }}>{item.quantity} units</td>
                                <td>{currencySymbol}{item.sale_price.toLocaleString()}</td>
                                <td style={{ fontWeight: 800 }}>{currencySymbol}{(item.quantity * item.sale_price).toLocaleString()}</td>
                                <td>
                                    <span className={`badge ${item.quantity > 0 ? 'badge-success' : 'badge-danger'}`}>
                                        {item.quantity > 0 ? 'IN STOCK' : 'OUT'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
