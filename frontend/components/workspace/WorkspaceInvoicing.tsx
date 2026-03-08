"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createInvoice, getInvoices, getCustomers, getInventory } from "@/services/api"
import { useStore } from "@/store/useStore"

export default function WorkspaceInvoicing() {
    const { currencySymbol } = useStore()
    const [invoices, setInvoices] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [inventory, setInventory] = useState<any[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state (GST Compliant)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [items, setItems] = useState([{ inventory_id: "", desc: "", qty: 1, price: 0, hsn: "", taxRate: 18 }])
    const [notes, setNotes] = useState("")
    const [isInterState, setIsInterState] = useState(false)

    useEffect(() => {
        refreshData()
    }, [])

    const refreshData = async () => {
        try {
            const [invRes, custRes, stockRes] = await Promise.all([getInvoices(), getCustomers(), getInventory()])
            setInvoices(invRes)
            setCustomers(custRes)
            setInventory(stockRes)
        } catch (e) {
            console.error(e)
        }
    }

    const addItem = () => setItems([...items, { inventory_id: "", desc: "", qty: 1, price: 0, hsn: "", taxRate: 18 }])

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
            ; (newItems[index] as any)[field] = value

        // If inventory item selected, auto-populate
        if (field === 'inventory_id' && value) {
            const stock = inventory.find(i => i.sku === value)
            if (stock) {
                newItems[index].desc = stock.name
                newItems[index].price = stock.sale_price
                newItems[index].hsn = stock.hsn_code || "998311"
            }
        }

        setItems(newItems)
    }

    const calculateTotals = () => {
        let subtotal = 0
        let cgst = 0
        let sgst = 0
        let igst = 0

        items.forEach(item => {
            const lineSub = (item.qty || 0) * (item.price || 0)
            subtotal += lineSub
            const tax = lineSub * (item.taxRate / 100)

            if (isInterState) {
                igst += tax
            } else {
                cgst += tax / 2
                sgst += tax / 2
            }
        })

        return { subtotal, cgst, sgst, igst, totalTax: cgst + sgst + igst, grandTotal: subtotal + cgst + sgst + igst }
    }

    const handleCreate = async () => {
        if (!selectedCustomer) return alert("Please select a statutory customer profile")
        setLoading(true)
        const totals = calculateTotals()
        try {
            await createInvoice({
                customer_id: selectedCustomer.name,
                client_gstin: selectedCustomer.gstin,
                client_pan: selectedCustomer.pan,
                items,
                subtotal: totals.subtotal,
                tax_totals: {
                    cgst: totals.cgst,
                    sgst: totals.sgst,
                    igst: totals.igst,
                    total: totals.totalTax
                },
                grand_total: totals.grandTotal,
                notes,
                currency: currencySymbol,
                due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
            })
            setShowCreate(false)
            setItems([{ inventory_id: "", desc: "", qty: 1, price: 0, hsn: "", taxRate: 18 }])
            refreshData()
        } catch (e) {
            alert("Authorization Failure: Check statutory records")
        } finally {
            setLoading(false)
        }
    }

    const totals = calculateTotals()

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Enterprise Revenue Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-emerald)" }}>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Booked Revenue</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{currencySymbol}{invoices.reduce((a, b) => a + b.grand_total, 0).toLocaleString()}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-cyan)" }}>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total GST Collected</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-cyan)" }}>{currencySymbol}{invoices.reduce((a, b) => a + (b.total_tax || 0), 0).toLocaleString()}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-amber)" }}>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>O/S Receivables</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-amber)" }}>{currencySymbol}{invoices.filter(i => i.status === 'PENDING').reduce((a, b) => a + b.grand_total, 0).toLocaleString()}</p>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Tax Invoice Workplace (GST)</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Generate professional, audit-ready Indian Tax Invoices</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                    + Generate New Tax Invoice
                </button>
            </div>

            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="chart-card"
                        style={{ border: "1px solid var(--primary-500)", background: "rgba(99,102,241,0.02)", padding: "2rem" }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
                            <div>
                                <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--primary-400)" }}>TAX INVOICE</h3>
                                <div style={{ marginTop: "1rem" }}>
                                    <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block" }}>BILL TO (CUSTOMER)</label>
                                    <select
                                        className="input-base"
                                        style={{ marginTop: "0.5rem", minWidth: "250px", fontWeight: 800 }}
                                        value={selectedCustomer?.id || ""}
                                        onChange={(e) => {
                                            const cust = customers.find(c => String(c.id) === e.target.value)
                                            setSelectedCustomer(cust || null)
                                        }}
                                    >
                                        <option value="">Select Enterprise Client</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Inter-State Transaction (IGST)</span>
                                    <input type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
                                </div>
                                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>CGST and SGST will be applied otherwise.</p>
                            </div>
                        </div>

                        {selectedCustomer && (
                            <div style={{ marginBottom: "2rem", padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                                <p style={{ fontSize: "0.9rem", fontWeight: 700 }}>{selectedCustomer.name}</p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>GSTIN: <span style={{ color: "var(--text-main)" }}>{selectedCustomer.gstin || 'N/A'}</span></p>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>PAN: <span style={{ color: "var(--text-main)" }}>{selectedCustomer.pan || 'N/A'}</span></p>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", gridColumn: "span 2" }}>Address: {selectedCustomer.address || 'N/A'}</p>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: "2rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 0.8fr 1fr 1.2fr", gap: "1rem", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>Pick from Stock</span>
                                <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>Description</span>
                                <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>HSN</span>
                                <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>Qty</span>
                                <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>Price</span>
                                <span style={{ fontSize: "0.75rem", fontWeight: 800, textAlign: "right" }}>Amount</span>
                            </div>
                            {items.map((item, i) => (
                                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 0.8fr 1fr 1.2fr", gap: "1rem", marginBottom: "0.75rem" }}>
                                    <select
                                        value={item.inventory_id}
                                        onChange={(e) => updateItem(i, 'inventory_id', e.target.value)}
                                        className="input-base"
                                        style={{ background: "rgba(255,255,255,0.05)", fontSize: "0.7rem" }}
                                    >
                                        <option value="">Custom Item</option>
                                        {inventory.map(stock => <option key={stock.sku} value={stock.sku}>{stock.sku} - {stock.name}</option>)}
                                    </select>
                                    <input placeholder="Service/Product Desc" value={item.desc} onChange={(e) => updateItem(i, 'desc', e.target.value)} className="input-base" style={{ background: "rgba(255,255,255,0.03)" }} />
                                    <input placeholder="998311" value={item.hsn} onChange={(e) => updateItem(i, 'hsn', e.target.value)} className="input-base" style={{ background: "rgba(255,255,255,0.03)" }} />
                                    <input type="number" value={item.qty} onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 0)} className="input-base" style={{ background: "rgba(255,255,255,0.03)" }} />
                                    <input type="number" value={item.price} onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)} className="input-base" style={{ background: "rgba(255,255,255,0.03)" }} />
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", fontWeight: 700 }}>
                                        {currencySymbol}{((item.qty || 0) * (item.price || 0)).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                            <button onClick={addItem} style={{ fontSize: "0.75rem", color: "var(--primary-400)", background: "rgba(99,102,241,0.1)", border: "1px dashed var(--primary-500)", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer", width: "100%", marginTop: "1rem" }}>+ Add Invoice Line Item</button>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
                            <div style={{ width: "50%" }}>
                                <textarea placeholder="Special Instructions / Terms & Conditions" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-base" style={{ width: "100%", height: "100px", background: "rgba(0,0,0,0.2)", fontSize: "0.8rem" }} />
                            </div>
                            <div style={{ width: "40%", textAlign: "right", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Taxable Value:</span>
                                    <span>{currencySymbol}{totals.subtotal.toLocaleString()}</span>
                                </div>
                                {isInterState ? (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                                        <span style={{ color: "var(--text-muted)" }}>IGST (18%):</span>
                                        <span style={{ color: "var(--accent-amber)" }}>{currencySymbol}{totals.igst.toLocaleString()}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                                            <span style={{ color: "var(--text-muted)" }}>CGST (9%):</span>
                                            <span style={{ color: "var(--accent-amber)" }}>{currencySymbol}{totals.cgst.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                                            <span style={{ color: "var(--text-muted)" }}>SGST (9%):</span>
                                            <span style={{ color: "var(--accent-amber)" }}>{currencySymbol}{totals.sgst.toLocaleString()}</span>
                                        </div>
                                    </>
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 900, marginTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
                                    <span>Grand Total:</span>
                                    <span style={{ color: "var(--primary-400)" }}>{currencySymbol}{totals.grandTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "1rem", marginTop: "2.5rem" }}>
                            <button className="btn-primary" onClick={handleCreate} disabled={loading} style={{ flex: 2, padding: "1rem" }}>
                                {loading ? "Authorizing Invoice..." : "Authorize & Save Tax Invoice"}
                            </button>
                            <button className="btn-secondary" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>Discard Draft</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="chart-card">
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1.5rem" }}>Authorization History (GST Records)</h3>
                <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Entity</th>
                                <th>GSTIN</th>
                                <th>Taxable Val</th>
                                <th>Tax Liability</th>
                                <th>Grand Total</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No statutory records found. Authorize your first Tax Invoice to begin.</td></tr>
                            ) : invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 800, color: "var(--primary-400)", fontSize: "0.75rem" }}>{inv.id}</td>
                                    <td>{inv.customer_id}</td>
                                    <td style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{inv.customer_gstin || 'N/A'}</td>
                                    <td>{inv.currency}{inv.subtotal?.toLocaleString()}</td>
                                    <td style={{ color: "var(--accent-amber)" }}>{inv.currency}{(inv.total_tax || 0).toLocaleString()}</td>
                                    <td style={{ fontWeight: 800 }}>{inv.currency}{inv.grand_total.toLocaleString()}</td>
                                    <td>
                                        <button className="btn-secondary" style={{ padding: "0.3rem 0.7rem", fontSize: "0.7rem" }}>View IRN</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
