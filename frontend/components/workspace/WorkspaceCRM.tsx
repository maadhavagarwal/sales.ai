"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { addCustomer, getCustomers } from "@/services/api"
import { useStore } from "@/store/useStore"

export default function WorkspaceCRM() {
    const { currencySymbol } = useStore()
    const [customers, setCustomers] = useState<any[]>([])
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", gstin: "", pan: "" })

    useEffect(() => {
        refreshData()
    }, [])

    const refreshData = async () => {
        try {
            const res = await getCustomers()
            setCustomers(res)
        } catch (e) {
            console.error(e)
        }
    }

    const handleAdd = async () => {
        setLoading(true)
        try {
            await addCustomer(formData)
            setShowAdd(false)
            setFormData({ name: "", email: "", phone: "", address: "", gstin: "", pan: "" })
            refreshData()
        } catch (e) {
            alert("Failed to add client profile")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Statutory Client Directory (CRM)</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Manage enterprise clients with GST and PAN compliance</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAdd(true)}>
                    + Board New Entity
                </button>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="chart-card"
                        style={{ border: "1px solid var(--accent-cyan)", background: "rgba(6,182,212,0.02)", padding: "2rem" }}
                    >
                        <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--accent-cyan)" }}>Client Onboarding Directive</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Business/Entity Name</label>
                                <input placeholder="e.g. Reliance Industries" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Primary Email</label>
                                <input placeholder="finance@entity.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Business GSTIN</label>
                                <input placeholder="27AAAAA0000A1Z5" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Business PAN</label>
                                <input placeholder="ABCDE1234F" value={formData.pan} onChange={(e) => setFormData({ ...formData, pan: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%" }} />
                            </div>
                        </div>
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem", display: "block" }}>Registered Address</label>
                            <textarea placeholder="Line 1, City, State, PIN" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-base" style={{ background: "rgba(0,0,0,0.3)", width: "100%", height: "80px" }} />
                        </div>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button className="btn-primary" onClick={handleAdd} disabled={loading} style={{ flex: 1 }}>{loading ? "Adding..." : "Add Client Profile"}</button>
                            <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="chart-card">
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>Enterprise Client Directory</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                    {customers.length === 0 && (
                        <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                            No clients available. Expand your business by adding your first customer profile!
                        </div>
                    )}
                    {customers.map((c) => (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="metric-card"
                            style={{ padding: "1.25rem", borderLeft: "4px solid var(--accent-cyan)" }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                <h4 style={{ fontSize: "1rem", fontWeight: 700 }}>{c.name}</h4>
                                <span className="badge badge-primary">ID: {c.id}</span>
                            </div>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>📧 {c.email || 'No email'}</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>📞 {c.phone || 'No phone'}</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>📍 {c.address || 'No address'}</p>

                            <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Lifetime Value (LTV)</span>
                                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{currencySymbol}{(c.total_spend || 0).toLocaleString()}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
