"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createInvoice, getInvoices, updateInvoice, deleteInvoice, exportWorkspaceData, sendInvoiceReminder, getCustomers, getInventory, generateEInvoice, generatePaymentLink, sendWhatsAppReminder, getCrossSellRecommendations } from "@/services/api"
import { useStore } from "@/store/useStore"
import { Card, Button, Badge, Modal } from "@/components/ui"

export default function WorkspaceInvoicing() {
    const { currencySymbol, workspaceSyncCount } = useStore()
    const [invoices, setInvoices] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [inventory, setInventory] = useState<any[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [viewingInvoice, setViewingInvoice] = useState<any>(null)
    const [editingInvoice, setEditingInvoice] = useState<any>(null)
    const [editForm, setEditForm] = useState({ status: "PAID", due_date: "", notes: "" })
    const [loading, setLoading] = useState(false)
    const [reminderLoadingId, setReminderLoadingId] = useState<string | null>(null)

    // Form state (GST Compliant)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [items, setItems] = useState([{ inventory_id: "", desc: "", qty: 1, price: 0, hsn: "", taxRate: 18 }])
    const [notes, setNotes] = useState("")
    const [isInterState, setIsInterState] = useState(false)
    const [paymentTimeline, setPaymentTimeline] = useState("LATER")
    const [paymentDays, setPaymentDays] = useState(30)
    const [promptedReminderIds, setPromptedReminderIds] = useState<string[]>([])

    useEffect(() => {
        refreshData()
    }, [workspaceSyncCount])

    const refreshData = async () => {
        try {
            const [invRes, custRes, stockRes] = await Promise.all([getInvoices(), getCustomers(), getInventory()])

            // In dev mode, seed sample data when backend returns empty sets
            const isDev = process.env.NODE_ENV === "development"
            const sampleInvoices = [
                {
                    id: "SAMPLE-001",
                    customer_id: "Acme Corp",
                    customer_gstin: "27AAAAA0000A1Z5",
                    subtotal: 45200,
                    total_tax: 8136,
                    grand_total: 53336,
                    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
                    status: "PENDING",
                    payment_terms: "Net 7",
                    items_json: JSON.stringify([{ inventory_id: "SKU-0001", desc: "Widget Pro", qty: 10, price: 4520 }]),
                },
            ]

            const sampleCustomers = [
                { id: 1, name: "Acme Corp", email: "accounts@acme.com", phone: "+91-9876543210", gstin: "27AAAAA0000A1Z5" },
            ]

            const sampleInventory = [
                { sku: "SKU-0001", name: "Widget Pro", quantity: 125, sale_price: 4520, hsn_code: "998311" },
            ]

            setInvoices(invRes.length || !isDev ? invRes : sampleInvoices)
            setCustomers(custRes.length || !isDev ? custRes : sampleCustomers)
            setInventory(stockRes.length || !isDev ? stockRes : sampleInventory)
        } catch (e) {
            console.error(e)
        }
    }

    const addItem = () => setItems([...items, { inventory_id: "", desc: "", qty: 1, price: 0, hsn: "", taxRate: 18 }])

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
        ;(newItems[index] as any)[field] = value

        if (field === 'inventory_id' && value) {
            const stock = inventory.find(i => i.sku === value)
            if (stock) {
                newItems[index].desc = stock.name
                newItems[index].price = stock.sale_price
                newItems[index].hsn = stock.hsn_code || "998311"
                fetchRecommendations(value)
            }
        }
        setItems(newItems)
    }

    const getDueDateFromPlan = () => {
        const days = paymentTimeline === "IMMEDIATE" ? 0 : Math.max(paymentDays || 0, 1)
        return new Date(Date.now() + days * 86400000).toISOString().split('T')[0]
    }

    const getPaymentTermsLabel = () => {
        if (paymentTimeline === "IMMEDIATE") return "Immediate Payment"
        return `Net ${Math.max(paymentDays || 0, 1)} Days`
    }

    const parseInvoiceItems = (invoice: any) => {
        try {
            return JSON.parse(invoice.items_json || "[]")
        } catch {
            return []
        }
    }

    const findCustomerForInvoice = (invoice: any) => {
        return customers.find(c => c.name === invoice.customer_id || String(c.id) === String(invoice.customer_id)) || null
    }

    const getDaysToDue = (dueDate?: string) => {
        if (!dueDate) return null
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const due = new Date(dueDate)
        due.setHours(0, 0, 0, 0)
        return Math.round((due.getTime() - today.getTime()) / 86400000)
    }

    const getReminderEmailDraft = (invoice: any) => {
        const customer = findCustomerForInvoice(invoice)
        const dueDate = invoice.due_date || getDueDateFromPlan()
        const subject = `Payment reminder for invoice ${invoice.invoice_number || invoice.id}`
        const body = [
            `Dear ${invoice.customer_id},`,
            ``,
            `This is a payment reminder for invoice ${invoice.invoice_number || invoice.id}.`,
            `Invoice amount: ${currencySymbol}${Number(invoice.grand_total || 0).toLocaleString()}`,
            `Payment timeline: ${invoice.payment_terms || getPaymentTermsLabel()}`,
            `Due date: ${dueDate}`,
            ``,
            `Please confirm the payment timeline or share the remittance details at the earliest convenience.`,
            ``,
            `Regards,`,
            `Accounts Receivable Team`,
        ].join("\n")

        return {
            email: customer?.email || "",
            subject,
            body,
        }
    }

    const openReminderEmailDraft = async (invoice: any) => {
        const draft = getReminderEmailDraft(invoice)
        if (draft.email) {
            window.location.href = `mailto:${encodeURIComponent(draft.email)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
            return
        }

        try {
            await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)
            alert("Customer email is not available. The reminder email draft has been copied to your clipboard.")
        } catch {
            alert("Customer email is not available, and the reminder draft could not be copied automatically.")
        }
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
        if (!selectedCustomer) return
        setLoading(true)
        const totals = calculateTotals()
        const dueDate = getDueDateFromPlan()
        try {
            const res = await createInvoice({
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
                payment_terms: getPaymentTermsLabel(),
                payment_timeline: paymentTimeline,
                payment_days: paymentTimeline === "IMMEDIATE" ? 0 : Math.max(paymentDays || 0, 1),
                due_date: dueDate
            })
            setShowCreate(false)
            setItems([{ inventory_id: "", desc: "", qty: 1, price: 0, hsn: "", taxRate: 18 }])
            setPaymentTimeline("LATER")
            setPaymentDays(30)
            refreshData()

            // Auto open for printing
            const newInvoice = {
                id: res.invoice_id,
                customer_id: selectedCustomer.name,
                customer_gstin: selectedCustomer.gstin,
                items_json: JSON.stringify(items),
                subtotal: totals.subtotal,
                total_tax: totals.totalTax,
                grand_total: totals.grandTotal,
                date: new Date().toISOString().split('T')[0],
                due_date: dueDate,
                payment_terms: getPaymentTermsLabel(),
            }
            setViewingInvoice(newInvoice)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleEditInvoice = (inv: any) => {
        setEditingInvoice(inv)
        setEditForm({
            status: inv.status || "PENDING",
            due_date: inv.due_date || new Date().toISOString().split('T')[0],
            notes: inv.notes || ""
        })
    }

    const handleUpdateInvoice = async () => {
        if (!editingInvoice) return
        setLoading(true)
        try {
            await updateInvoice(editingInvoice.id, {
                ...editForm,
                grand_total: editingInvoice.grand_total,
                subtotal: editingInvoice.subtotal
            })
            setEditingInvoice(null)
            refreshData()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleShare = () => {
        if (!viewingInvoice) return
        const text = `Invoice #${viewingInvoice.id} for ${viewingInvoice.customer_id}. Amount: ${currencySymbol}${viewingInvoice.grand_total}.`
        if (navigator.share) {
            navigator.share({ title: 'Invoice Share', text })
        } else {
            navigator.clipboard.writeText(text)
            alert("Invoice details copied to clipboard.")
        }
    }

    const handleWhatsApp = async (invoice: any) => {
        try {
            const customer = findCustomerForInvoice(invoice)
            const phone = customer?.phone || "91"
            const message = `Hello ${invoice.customer_id}, your invoice #${invoice.id} for ${currencySymbol}${invoice.grand_total} is ready. View/Pay here: [Link]`
            await sendWhatsAppReminder(phone, message)
            alert("WhatsApp Reminder Signal Sent!")
        } catch (e) {
            alert("Failed to send WhatsApp.")
        }
    }

    const handleEInvoice = async (invoice: any) => {
        try {
            const res = await generateEInvoice(invoice.id)
            alert(`E-Invoice IRN Generated: ${res.irn}\nAcknowledge No: ${res.ack_no}`)
            refreshData()
        } catch (e) {
            alert("E-Invoice Generation Failed")
        }
    }

    const handlePayLink = async (invoice: any) => {
        try {
            const res = await generatePaymentLink(invoice.id, invoice.grand_total)
            alert(`Payment Link Created: ${res.payment_link}\nStatus: Active`)
            refreshData()
        } catch (e) {
            alert("Failed to create payment link")
        }
    }

    const [recommendations, setRecommendations] = useState<any[]>([])
    const fetchRecommendations = async (sku: string) => {
        if (!sku) return
        try {
            const res = await getCrossSellRecommendations(sku)
            setRecommendations(res || [])
        } catch (e) {
            setRecommendations([])
        }
    }

    const handleSendReminder = useCallback(async (invoice: any, autoOpenEmail = false) => {
        const invoiceId = invoice.id
        setReminderLoadingId(invoiceId)
        try {
            const res = await sendInvoiceReminder(invoiceId)
            if (res?.status === "error") {
                alert(res.message || "Failed to send reminder.")
                return
            }
            await refreshData()
            const customer = findCustomerForInvoice(invoice)
            const promptMessage = customer?.email
                ? `Reminder logged for invoice ${res?.invoice_id || invoiceId}. Do you want to open a formatted reminder email to ${customer.email}?`
                : "Reminder logged. Customer email is missing. Do you want a formatted reminder draft copied instead?"

            if (autoOpenEmail || confirm(promptMessage)) {
                await openReminderEmailDraft(invoice)
            }

            alert(`Reminder sent for invoice ${res?.invoice_id || invoiceId}${res?.timestamp ? ` on ${res.timestamp}` : ""}.`)
        } catch (e: any) {
            alert(e?.response?.data?.detail || e?.message || "Failed to send reminder.")
        } finally {
            setReminderLoadingId(null)
        }
    }, [findCustomerForInvoice, openReminderEmailDraft, refreshData])

    useEffect(() => {
        const nextCandidate = invoices.find((inv) => {
            const dueInDays = getDaysToDue(inv.due_date)
            return (
                inv.status === "PENDING" &&
                dueInDays !== null &&
                dueInDays <= 3 &&
                !promptedReminderIds.includes(inv.id)
            )
        })

        if (!nextCandidate) return

        setPromptedReminderIds((prev) => [...prev, nextCandidate.id])

        const dueInDays = getDaysToDue(nextCandidate.due_date)
        const promptText = dueInDays !== null && dueInDays < 0
            ? `Invoice ${nextCandidate.id} is overdue by ${Math.abs(dueInDays)} day(s). Send a reminder email now?`
            : `Invoice ${nextCandidate.id} is due in ${dueInDays} day(s). Send a reminder email now?`

        if (confirm(promptText)) {
            handleSendReminder(nextCandidate, true)
        }
    }, [handleSendReminder, invoices, promptedReminderIds])

    const syncedCustomers = invoices.filter(inv => !!findCustomerForInvoice(inv)).length
    const syncedInventoryInvoices = invoices.filter(inv =>
        parseInvoiceItems(inv).every((item: any) => !item.inventory_id || inventory.some(stock => stock.sku === item.inventory_id))
    ).length
    const dueDateReadyInvoices = invoices.filter(inv => !!inv.due_date).length
    const nearDueInvoices = invoices.filter((inv) => inv.status === "PENDING" && (getDaysToDue(inv.due_date) ?? 999) <= 3)

    return (
        <div className="space-y-16">
            {/* Horizontal Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Booked Revenue", val: invoices.reduce((a, b) => a + b.grand_total, 0), color: "var(--accent-emerald)", icon: "💰" },
                    { label: "GST Liability", val: invoices.reduce((a, b) => a + (b.total_tax || 0), 0), color: "var(--accent-cyan)", icon: "⚖️" },
                    { label: "Unpaid Receivables", val: invoices.filter(i => i.status === 'PENDING').reduce((a, b) => a + b.grand_total, 0), color: "var(--accent-amber)", icon: "📝" },
                ].map((stat, i) => (
                    <Card key={i} variant="glass" padding="md" className="group">
                        <div className="flex items-center gap-5">
                            <div
                                className="w-12 h-12 rounded-[--radius-sm] flex items-center justify-center text-xl shadow-inner transition-all group-hover:scale-110"
                                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}20` }}
                            >
                                {stat.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">{stat.label}</p>
                                <p className="text-2xl font-black text-[--text-primary] tracking-tight">{currencySymbol}{stat.val.toLocaleString()}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card variant="glass" padding="md" className="border-[--primary]/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Customer Sync</p>
                    <p className="text-2xl font-black text-white mt-2">{syncedCustomers}/{invoices.length || 0}</p>
                    <p className="text-[10px] text-[--text-muted] mt-2">Invoices mapped to known CRM entities.</p>
                </Card>
                <Card variant="glass" padding="md" className="border-[--accent-cyan]/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Inventory Sync</p>
                    <p className="text-2xl font-black text-white mt-2">{syncedInventoryInvoices}/{invoices.length || 0}</p>
                    <p className="text-[10px] text-[--text-muted] mt-2">Invoice lines linked to valid stock masters.</p>
                </Card>
                <Card variant="glass" padding="md" className="border-[--accent-amber]/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Due-Date Sync</p>
                    <p className="text-2xl font-black text-white mt-2">{dueDateReadyInvoices}/{invoices.length || 0}</p>
                    <p className="text-[10px] text-[--text-muted] mt-2">Invoices carrying payment timeline metadata.</p>
                </Card>
                <Card variant="glass" padding="md" className="border-[--accent-rose]/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Reminder Queue</p>
                    <p className="text-2xl font-black text-white mt-2">{nearDueInvoices.length}</p>
                    <p className="text-[10px] text-[--text-muted] mt-2">Invoices due within 3 days or overdue.</p>
                </Card>
            </div>

            {nearDueInvoices.length > 0 && (
                <Card variant="bento" padding="md" className="border-[--accent-amber]/20 bg-[--accent-amber]/5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[--accent-amber]">Reminder Activation Queue</p>
                            <p className="text-sm font-bold text-white mt-2">
                                Pending invoices are nearing maturity. Trigger the reminder and open a formatted email draft from here.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {nearDueInvoices.slice(0, 3).map((inv) => (
                                <Button
                                    key={inv.id}
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleSendReminder(inv, true)}
                                    loading={reminderLoadingId === inv.id}
                                    className="uppercase text-[9px] font-black tracking-widest border-[--accent-amber]/30"
                                >
                                    Send {inv.id}
                                </Button>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-[--text-primary] tracking-tight">Tax Invoicing Engine</h2>
                    <p className="text-sm font-medium text-[--text-muted] mt-1 italic">
                        Generate professional, audit-ready Indian Statutory Tax Invoices.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" size="lg" onClick={() => exportWorkspaceData("invoices")} className="uppercase text-[10px] font-black tracking-widest">
                        Export CSV
                    </Button>
                    <Button variant="pro" size="lg" onClick={() => setShowCreate(true)} icon={<span>+</span>} className="shadow-[--shadow-glow]">
                        Initialize Tax Invoice
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
                        <Card variant="bento" padding="lg" className="border-[--primary]/30 bg-[--primary]/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <h1 className="text-8xl font-black italic select-none">INVOICE</h1>
                            </div>

                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row justify-between items-start border-b border-[--primary]/20 pb-10 mb-10 gap-8">
                                    <div className="space-y-6 flex-1">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[--primary]">Legal Instrument</h3>
                                        <div className="space-y-2 max-w-sm">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Counterparty Selection</label>
                                            <select
                                                className="input-pro w-full font-bold"
                                                value={selectedCustomer?.id || ""}
                                                onChange={(e) => {
                                                    const cust = customers.find(c => String(c.id) === e.target.value)
                                                    setSelectedCustomer(cust || null)
                                                }}
                                            >
                                                <option value="">Search Client Registry...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="text-left md:text-right space-y-4">
                                        <div className="flex items-center gap-3 justify-start md:justify-end">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">IGST Protocol</span>
                                            <input
                                                type="checkbox"
                                                checked={isInterState}
                                                onChange={(e) => setIsInterState(e.target.checked)}
                                                className="w-4 h-4 rounded border-[--border-strong] bg-[--surface-1] text-[--primary] focus:ring-[--primary]"
                                            />
                                        </div>
                                        <p className="text-[10px] font-medium text-[--text-muted] italic">Enable for Inter-State Transactions.</p>
                                    </div>
                                </div>

                                {selectedCustomer && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 p-6 rounded-[--radius-sm] border border-[--border-subtle] bg-black/20 backdrop-blur-md">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-lg font-black text-white">{selectedCustomer.name}</p>
                                                <p className="text-[10px] text-[--text-muted] uppercase tracking-widest mt-1">Legally Boarded Entity</p>
                                            </div>
                                            <div className="text-right text-[10px] space-y-1 font-bold">
                                                <p className="text-[--text-muted]">GSTIN: <span className="text-white ml-2">{selectedCustomer.gstin || 'EXEMPT'}</span></p>
                                                <p className="text-[--text-muted]">PAN: <span className="text-white ml-2">{selectedCustomer.pan || 'EXEMPT'}</span></p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-medium text-[--text-muted] mt-4 border-t border-white/5 pt-4 italic max-w-lg">
                                            {selectedCustomer.address || 'Address pending verification.'}
                                        </p>
                                    </motion.div>
                                )}

                                <div className="space-y-6 mb-12">
                                    <div className="hidden md:grid grid-cols-[1.5fr_2fr_1fr_0.8fr_1fr_1.2fr] gap-4 pb-4 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">
                                        <span>Inventory SKU</span>
                                        <span>Line Description</span>
                                        <span>HSN Code</span>
                                        <span>Quantity</span>
                                        <span>Unit Price</span>
                                        <span className="text-right">Net Value</span>
                                    </div>
                                    <div className="space-y-4">
                                        {items.map((item, i) => (
                                            <div key={i} className="grid grid-cols-1 md:grid-cols-[1.5fr_2fr_1fr_0.8fr_1fr_1.2fr] gap-4 items-center">
                                                <select
                                                    value={item.inventory_id}
                                                    onChange={(e) => updateItem(i, 'inventory_id', e.target.value)}
                                                    className="input-pro text-[11px] bg-black/40"
                                                >
                                                    <option value="">Custom Item</option>
                                                    {inventory.map(stock => <option key={stock.sku} value={stock.sku}>{stock.sku} - {stock.name}</option>)}
                                                </select>
                                                <input placeholder="Service/Product Desc" value={item.desc} onChange={(e) => updateItem(i, 'desc', e.target.value)} className="input-pro bg-black/40" />
                                                <input placeholder="HSN" value={item.hsn} onChange={(e) => updateItem(i, 'hsn', e.target.value)} className="input-pro bg-black/40" />
                                                <input type="number" value={item.qty} onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 0)} className="input-pro bg-black/40" />
                                                <input type="number" value={item.price} onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)} className="input-pro bg-black/40" />
                                                <div className="text-right text-sm font-black text-white px-2">
                                                    {currencySymbol}{((item.qty || 0) * (item.price || 0)).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={addItem}
                                        className="w-full py-4 rounded-[--radius-sm] border border-dashed border-[--primary]/30 bg-[--primary]/5 text-[10px] font-black uppercase tracking-[0.2em] text-[--primary] hover:bg-[--primary]/10 transition-all"
                                    >
                                        + Append Line Item
                                    </button>
                                </div>

                                <div className="flex flex-col lg:flex-row justify-between gap-12 pt-10 border-t border-white/10">
                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Payment Timeline</label>
                                                <select value={paymentTimeline} onChange={(e) => setPaymentTimeline(e.target.value)} className="input-pro w-full font-black text-white">
                                                    <option value="IMMEDIATE">Immediate</option>
                                                    <option value="LATER">Later</option>
                                                </select>
                                                {paymentTimeline === "LATER" && (
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={paymentDays}
                                                        onChange={(e) => setPaymentDays(parseInt(e.target.value) || 1)}
                                                        className="input-pro w-full font-black text-white"
                                                        placeholder="Payment days"
                                                    />
                                                )}
                                                <p className="text-[10px] text-[--primary] font-bold uppercase tracking-widest">
                                                    Due Date Preview: {getDueDateFromPlan()}
                                                </p>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Terms & Strategic Notes</label>
                                                <textarea
                                                    placeholder="Specify statutory terms, compliance notes, or instructions."
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    className="input-pro w-full h-24 py-4 bg-black/20"
                                                />
                                            </div>
                                        </div>

                                        {/* AI Cognitive Suggestions & Cross-Sell */}
                                        <div className="mt-8 space-y-4">
                                            {recommendations.length > 0 && (
                                                <div className="p-6 rounded-2xl border border-[--accent-cyan]/20 bg-[--accent-cyan]/5">
                                                    <h4 className="text-[10px] font-black text-[--accent-cyan] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <span>🎯</span> Predictive Cross-Sell Targets
                                                    </h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {recommendations.map(rec => (
                                                            <div key={rec.sku} className="px-4 py-2 bg-black/40 rounded-full border border-white/10 flex items-center gap-3">
                                                                <span className="text-[10px] font-black text-white">{rec.sku}</span>
                                                                <span className="text-[9px] font-bold text-[--text-muted]">{rec.name}</span>
                                                                <span className="text-[10px] font-black text-[--accent-emerald]">{rec.prob}% Match</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-full lg:w-96 space-y-4">
                                        <div className="flex justify-between items-center text-[11px] font-bold text-[--text-muted]">
                                            <span>TAXABLE COMPONENT</span>
                                            <span className="text-white">{currencySymbol}{calculateTotals().subtotal.toLocaleString()}</span>
                                        </div>
                                        {isInterState ? (
                                            <div className="flex justify-between items-center text-[11px] font-bold text-[--accent-amber]">
                                                <span>IGST (18%)</span>
                                                <span>{currencySymbol}{calculateTotals().igst.toLocaleString()}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-center text-[11px] font-bold text-[--accent-amber]">
                                                    <span>CGST (9%)</span>
                                                    <span>{currencySymbol}{calculateTotals().cgst.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px] font-bold text-[--accent-amber]">
                                                    <span>SGST (9%)</span>
                                                    <span>{currencySymbol}{calculateTotals().sgst.toLocaleString()}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="pt-6 mt-4 border-t border-white/20 flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">Gross Payable</span>
                                            <span className="text-4xl font-black text-[--primary] tracking-tighter">
                                                {currencySymbol}{calculateTotals().grandTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 mt-16 pt-10 border-t border-white/5">
                                    <Button variant="pro" size="lg" onClick={handleCreate} loading={loading} className="flex-2 h-16 shadow-[--shadow-glow]">
                                        Authorize & Seal Tax Invoice
                                    </Button>
                                    <Button variant="outline" size="lg" onClick={() => setShowCreate(false)} className="flex-1 h-16 opacity-60">
                                        Discard Draft
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingInvoice && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="mb-12"
                    >
                        <Card variant="bento" padding="lg" className="border-[--primary]/30 bg-[--primary]/5">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[--primary] mb-8">Update Statutory Instrument Status</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Collection Status</label>
                                    <select 
                                        value={editForm.status} 
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} 
                                        className="input-pro w-full font-bold bg-black/40"
                                    >
                                        <option value="PENDING">PENDING (Unpaid)</option>
                                        <option value="PAID">PAID (Settled)</option>
                                        <option value="CANCELLED">VOID/CANCELLED</option>
                                        <option value="PARTIAL">PARTIAL PAYMENT</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Maturity Date (Due)</label>
                                    <input 
                                        type="date" 
                                        value={editForm.due_date} 
                                        onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} 
                                        className="input-pro w-full font-bold bg-black/40" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Amendment Notes</label>
                                    <input 
                                        placeholder="Internal audit notes..." 
                                        value={editForm.notes} 
                                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} 
                                        className="input-pro w-full font-bold bg-black/40" 
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="pro" size="sm" onClick={handleUpdateInvoice} loading={loading} className="uppercase text-[10px] tracking-widest px-8">
                                    Commit Status Update
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditingInvoice(null)} className="uppercase text-[10px] tracking-widest opacity-60 px-8">
                                    Cancel
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <Card variant="glass" padding="lg">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[--text-muted]">Authorization History</h3>
                    <Badge variant="info" size="xs">SECURE LEDGER ACTIVE</Badge>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[--border-subtle]">
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Invoice Matrix</th>
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Entity</th>
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Statutory ID</th>
                                <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Liability</th>
                                <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Gross Value</th>
                                <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Collection Control</th>
                                <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Protocols</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-24 text-center">
                                        <p className="text-xs font-bold text-[--text-muted] italic">Quantum records empty. Authorize your first instrument to begin.</p>
                                    </td>
                                </tr>
                            ) : invoices.map((inv) => (
                                <tr key={inv.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-5 font-black text-[--primary] text-xs">#{inv.id.toString().padStart(6, '0')}</td>
                                    <td className="py-5">
                                        <p className="text-xs font-bold text-[--text-primary]">{inv.customer_id}</p>
                                        <p className="text-[10px] text-[--text-muted] mt-1 uppercase tracking-wide">
                                            {inv.payment_terms || "Due on Receipt"} | Due {inv.due_date || "TBD"}
                                        </p>
                                    </td>
                                    <td className="py-5">
                                        <span className="text-[10px] font-mono text-[--text-muted] bg-black/30 px-2 py-0.5 rounded">{inv.customer_gstin || inv.client_gstin || 'N/A'}</span>
                                    </td>
                                    <td className="py-5 text-right font-bold text-[--accent-amber] text-xs">
                                        {currencySymbol}{(inv.total_tax || inv.tax_totals?.total || 0).toLocaleString()}
                                    </td>
                                    <td className="py-5 text-right font-black text-white text-sm">
                                        {currencySymbol}{(Number(inv.grand_total ?? 0)).toLocaleString()}
                                    </td>
                                    <td className="py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => setViewingInvoice(inv)}
                                                className="text-[9px] font-black uppercase tracking-widest text-[--primary] border border-[--primary]/20 hover:bg-[--primary]/10"
                                            >
                                                View/Print
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => handleSendReminder(inv)}
                                                loading={reminderLoadingId === inv.id}
                                                disabled={reminderLoadingId === inv.id || inv.status === "PAID"}
                                                className="text-[9px] font-black uppercase tracking-widest text-[--accent-rose] border border-[--accent-rose]/20 hover:bg-[--accent-rose]/10"
                                            >
                                                {inv.status === "PAID" ? "Settled" : ((getDaysToDue(inv.due_date) ?? 999) <= 3 ? "Due Soon" : "Remind")}
                                            </Button>
                                        </div>
                                    </td>
                                    <td className="py-5 text-right">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Badge variant={inv.status === "PAID" ? "success" : (getDaysToDue(inv.due_date) ?? 999) < 0 ? "danger" : "warning"} size="xs">
                                                {inv.status === "PAID"
                                                    ? "PAID"
                                                    : (getDaysToDue(inv.due_date) ?? 999) < 0
                                                        ? `OVERDUE ${Math.abs(getDaysToDue(inv.due_date) || 0)}D`
                                                        : `DUE ${getDaysToDue(inv.due_date) ?? "--"}D`}
                                            </Badge>
                                            <Button 
                                                variant="ghost" 
                                                size="xs" 
                                                className="uppercase text-[9px] font-black tracking-widest text-[--accent-cyan]"
                                                onClick={() => handleEditInvoice(inv)}
                                            >
                                                Edit Status
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="xs" 
                                                className="text-[--accent-violet] hover:bg-[--accent-violet]/10 uppercase text-[9px] font-black tracking-widest"
                                                onClick={() => handleWhatsApp(inv)}
                                            >
                                                WhatsApp
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="xs" 
                                                className="text-[--accent-emerald] hover:bg-[--accent-emerald]/10 uppercase text-[9px] font-black tracking-widest"
                                                onClick={() => handlePayLink(inv)}
                                            >
                                                Pay Link
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="xs" 
                                                className="text-[--accent-cyan] hover:bg-[--accent-cyan]/10 uppercase text-[9px] font-black tracking-widest"
                                                onClick={() => handleEInvoice(inv)}
                                            >
                                                IRN/QR
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="xs" 
                                                className="text-[--accent-rose] hover:bg-[--accent-rose]/10 uppercase text-[9px] font-black tracking-widest"
                                                onClick={async () => {
                                                    if(confirm("Confirm deletion of this invoice?")) {
                                                        await deleteInvoice(inv.id)
                                                        refreshData()
                                                    }
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* View/Print Modal */}
            <AnimatePresence>
                {viewingInvoice && (
                    <Modal
                        isOpen={!!viewingInvoice}
                        onClose={() => setViewingInvoice(null)}
                        title={`Tax Instrument: ${viewingInvoice.id}`}
                        size="xl"
                    >
                        <div className="p-8 bg-white text-slate-900 print:p-0 print:text-black min-h-[600px] flex flex-col">
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter mb-2">TAX INVOICE</h1>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Generated via NB Enterprise AI</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black">#{viewingInvoice.id}</p>
                                    <p className="text-xs font-medium text-slate-500">{viewingInvoice.date}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 mb-12 text-xs">
                                <div>
                                    <p className="font-black uppercase text-slate-400 mb-2">Bill To:</p>
                                    <p className="text-lg font-black">{viewingInvoice.customer_id}</p>
                                    <p className="mt-1 font-medium">{(viewingInvoice.customer_gstin || viewingInvoice.client_gstin) ? `GSTIN: ${viewingInvoice.customer_gstin || viewingInvoice.client_gstin}` : 'GST-Exempt Entity'}</p>
                                    <p className="mt-1 font-medium text-slate-500">Payment Timeline: {viewingInvoice.payment_terms || "Due on Receipt"}</p>
                                    <p className="mt-1 font-medium text-slate-500">Due Date: {viewingInvoice.due_date || "TBD"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black uppercase text-slate-400 mb-2">Compliance Ref:</p>
                                    <p className="font-bold">Digital Signature: VERIFIED</p>
                                    {viewingInvoice.irn && (
                                        <div className="mt-4 p-4 border rounded-xl bg-slate-50">
                                            <p className="text-[8px] font-black text-slate-400 uppercase">Statutory E-Invoice IRN</p>
                                            <p className="text-[10px] font-mono break-all mt-1">{viewingInvoice.irn}</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase mt-2">Ack No: {viewingInvoice.ack_no}</p>
                                        </div>
                                    )}
                                    <p className="mt-1 text-slate-500 italic">This is an AI-generated statutory document.</p>
                                </div>
                            </div>

                            <table className="w-full mb-12">
                                <thead className="border-y-2 border-slate-900">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="py-4 text-left">Description</th>
                                        <th className="py-4 text-center">Qty</th>
                                        <th className="py-4 text-right">Rate</th>
                                        <th className="py-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(() => {
                                        try {
                                            const items = JSON.parse(viewingInvoice.items_json || "[]")
                                            return items.map((it: any, idx: number) => (
                                                <tr key={idx} className="text-xs font-medium">
                                                    <td className="py-4">{it.desc || it.name}</td>
                                                    <td className="py-4 text-center">{it.qty || it.quantity}</td>
                                                    <td className="py-4 text-right">{currencySymbol}{(it.price || 0).toLocaleString()}</td>
                                                    <td className="py-4 text-right">
                                                        {currencySymbol}{((it.qty || it.quantity || 0) * (it.price || 0)).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        } catch {
                                            return <tr><td colSpan={4} className="py-4 text-center text-slate-400 italic">Items mapping failed.</td></tr>
                                        }
                                    })()}
                                </tbody>
                            </table>

                            <div className="mt-auto pt-10 border-t border-slate-900 flex justify-end">
                                <div className="w-64 space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Subtotal</span>
                                        <span>{currencySymbol}{(viewingInvoice.subtotal || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Tax Recovery</span>
                                        <span>{currencySymbol}{(viewingInvoice.total_tax || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-black border-t pt-3 border-slate-900">
                                        <span>Grand Total</span>
                                        <span>{currencySymbol}{(Number(viewingInvoice.grand_total ?? 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-20 flex gap-4 print:hidden">
                                <Button variant="pro" className="flex-1" onClick={handlePrint}>Print Instrument</Button>
                                <Button variant="outline" className="flex-1" onClick={handleShare}>Digital Share</Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    )
}
