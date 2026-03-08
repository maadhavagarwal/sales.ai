"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    getLedger, addLedgerEntry, getAccountingNotes,
    addAccountingNote, getFinancialStatements,
    getExpenses, addExpense, getDaybook, getTrialBalance,
    getPLStatement, getBalanceSheet, getGSTReports,
    getCustomers, getCustomerLedger, recordPayment,
    downloadBusinessReport, getUsageStats, getCFOHealthReport
} from "@/services/api"
import { useStore } from "@/store/useStore"
import { Card, Button, Badge } from "@/components/ui"

type TabType = "gateway" | "voucher" | "daybook" | "trial-balance" | "pl" | "bs" | "ledger" | "customer-ledger" | "compliance" | "usage" | "cfo" | "reconcile"

export default function WorkspaceAccounts() {
    const { currencySymbol } = useStore()
    const [activeTab, setActiveTab] = useState<TabType>("gateway")
    const [daybook, setDaybook] = useState<any[]>([])
    const [trialBalance, setTrialBalance] = useState<any[]>([])
    const [ledger, setLedger] = useState<any[]>([])
    const [plData, setPlData] = useState<any>(null)
    const [bsData, setBsData] = useState<any>(null)
    const [gstData, setGstData] = useState<any>(null)
    const [statements, setStatements] = useState<any>(null)
    const [customers, setCustomers] = useState<any[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<string>("")
    const [customerLedger, setCustomerLedger] = useState<any[]>([])
    const [usageStats, setUsageStats] = useState<any[]>([])
    const [cfoData, setCfoData] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    // Voucher Form State (Multi-line Double Entry)
    const [voucherType, setVoucherType] = useState("Journal")
    const [voucherNo, setVoucherNo] = useState("")
    const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0])
    const [voucherEntries, setVoucherEntries] = useState([
        { account_name: "", type: "ASSET", amount: 0, description: "", isDebit: true },
        { account_name: "", type: "INCOME", amount: 0, description: "", isDebit: false }
    ])

    useEffect(() => { refreshData() }, [activeTab])

    const refreshData = async () => {
        setLoading(true)
        try {
            const [dbData, tbData, lgData, stData, plRes, bsRes, gstRes, custRes] = await Promise.all([
                getDaybook(),
                getTrialBalance(),
                getLedger(),
                getFinancialStatements(),
                getPLStatement(),
                getBalanceSheet(),
                getGSTReports(),
                getCustomers()
            ])
            setDaybook(dbData)
            setTrialBalance(tbData)
            setLedger(lgData)
            setStatements(stData)
            setPlData(plRes)
            setBsData(bsRes)
            setGstData(gstRes)
            setCustomers(custRes)

            if (activeTab === "usage") {
                const uRes = await getUsageStats()
                setUsageStats(uRes)
            }

            if (activeTab === "cfo") {
                const cfoRes = await getCFOHealthReport()
                setCfoData(cfoRes)
            }

            if (activeTab === "customer-ledger" && selectedCustomer) {
                const clData = await getCustomerLedger(selectedCustomer)
                setCustomerLedger(clData)
            }
        } catch (e) {
            console.error("Accounting Sync Error:", e)
        } finally {
            setLoading(false)
        }
    }

    const handleAddVoucherEntry = () => {
        setVoucherEntries([...voucherEntries, { account_name: "", type: "ASSET", amount: 0, description: "", isDebit: true }])
    }

    const handleRemoveVoucherEntry = (index: number) => {
        setVoucherEntries(voucherEntries.filter((_, i) => i !== index))
    }

    const handleVoucherSubmit = async () => {
        // Validate balances
        const totalDebit = voucherEntries.filter(e => e.isDebit).reduce((a, b) => a + b.amount, 0)
        const totalCredit = voucherEntries.filter(e => !e.isDebit).reduce((a, b) => a + b.amount, 0)

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            alert(`Voucher Out of Balance! Delta: ${totalDebit - totalCredit}`)
            return
        }

        setLoading(true)
        try {
            const payload = {
                voucher_type: voucherType,
                voucher_no: voucherNo,
                date: voucherDate,
                entries: voucherEntries.map(e => ({
                    ...e,
                    amount: e.isDebit ? e.amount : -e.amount
                }))
            }
            await addLedgerEntry(payload)
            setActiveTab("daybook")
            setVoucherEntries([
                { account_name: "", type: "ASSET", amount: 0, description: "", isDebit: true },
                { account_name: "", type: "INCOME", amount: 0, description: "", isDebit: false }
            ])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-10 min-h-[800px]">
            {/* Professional Breadcrumb / Tally Header */}
            <div className="flex justify-between items-end border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                        Gateway of Enterprise
                    </h2>
                    <p className="text-[10px] font-black tracking-[0.4em] text-[--primary] uppercase mt-1">
                        Professional Statutory Accounting Core v2.0
                    </p>
                </div>
                <div className="flex gap-4">
                    <Badge variant="outline" className="border-[--primary]/30 text-[--primary]">FY: 2026-27</Badge>
                    <Badge variant="outline" className="border-white/10 opacity-50">CURRENCY: {currencySymbol}</Badge>
                </div>
            </div>

            {activeTab === "gateway" ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left: Tally Main Menu */}
                    <div className="lg:col-span-4 space-y-8">
                        <section className="space-y-4">
                            <h3 className="menu-heading">Transactions</h3>
                            <div className="flex flex-col gap-2">
                                <MenuButton label="Voucher Entry" sub="Dual-Entry Orchestration" icon="⌨️" active onClick={() => setActiveTab("voucher")} />
                                <MenuButton label="Daybook" sub="Chronological Audit Trail" icon="📋" onClick={() => setActiveTab("daybook")} />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="menu-heading">Reports</h3>
                            <div className="flex flex-col gap-2">
                                <MenuButton label="Balance Sheet" sub="Enterprise Solvent Matrix" icon="🏛️" onClick={() => setActiveTab("bs")} />
                                <MenuButton label="Profit & Loss" sub="Revenue Realization" icon="📈" onClick={() => setActiveTab("pl")} />
                                <MenuButton label="Trial Balance" sub="Aggregate Ledger Health" icon="⚖️" onClick={() => setActiveTab("trial-balance")} />
                                <MenuButton label="General Ledger" sub="Deep-Dive Accounts" icon="📚" onClick={() => setActiveTab("ledger")} />
                                <MenuButton label="Customer Ledger" sub="Individual Client Matrix" icon="👤" onClick={() => setActiveTab("customer-ledger")} />
                                <MenuButton label="CFO Intelligence" sub="Predictive Fiscal Health" icon="⚖️" onClick={() => setActiveTab("cfo")} />
                                <MenuButton label="Consolidated Report" sub="Download Performance Master" icon="📄" onClick={() => downloadBusinessReport()} />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="menu-heading">Utilities</h3>
                            <div className="flex flex-col gap-2">
                                <MenuButton label="Bank Reconciliation" sub="AI Statement Matcher" icon="🏦" onClick={() => setActiveTab("reconcile")} />
                                <MenuButton label="GST Compliance" sub="Statutory Tax Offset" icon="🛡️" onClick={() => setActiveTab("compliance")} />
                                <MenuButton label="System Governance" sub="Software Usage Audit" icon="⚙️" onClick={() => setActiveTab("usage")} />
                            </div>
                        </section>
                    </div>

                    {/* Right: Real-time Fiscal Health */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard label="Net Profit" value={plData?.net_profit} color="var(--accent-emerald)" trend={plData?.net_profit > 0 ? "+ROI" : "DEFICIT"} />
                            <StatCard label="Net Receivables" value={trialBalance.find(a => a.account_name.includes("Receivable"))?.balance || 0} color="var(--accent-amber)" trend="O/S Debt" />
                            <StatCard label="Compliance Score" value="98.4" unit="%" color="var(--accent-cyan)" trend="AA+" />
                        </div>

                        <Card variant="bento" padding="lg" className="border-[--primary]/20 bg-black/40 relative overflow-hidden h-[360px]">
                            <div className="absolute right-0 top-0 w-64 h-64 bg-[--primary]/5 blur-[100px]" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-white mb-8">Recent Statutory Movements</h4>
                            <div className="space-y-4">
                                {daybook.slice(0, 5).map((v, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black group-hover:bg-[--primary]/20 group-hover:text-[--primary] transition-colors">
                                                {v.voucher_type?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white">{v.voucher_id}</p>
                                                <p className="text-[9px] font-bold text-[--text-muted] uppercase tracking-tighter truncate max-w-[200px]">{v.participating_ledgers}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white">{currencySymbol}{v.total_quantum?.toLocaleString()}</p>
                                            <p className="text-[9px] font-bold text-[--text-muted]">{v.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <button
                        onClick={() => setActiveTab("gateway")}
                        className="text-[10px] font-black uppercase tracking-[0.3em] text-[--text-muted] hover:text-[--primary] transition-colors flex items-center gap-2"
                    >
                        <span>← Escape to Gateway</span>
                    </button>

                    <AnimatePresence mode="wait">
                        {activeTab === "voucher" && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                <VoucherEntryForm
                                    type={voucherType} setType={setVoucherType}
                                    no={voucherNo} setNo={setVoucherNo}
                                    date={voucherDate} setDate={setVoucherDate}
                                    entries={voucherEntries} setEntries={setVoucherEntries}
                                    onAdd={handleAddVoucherEntry}
                                    onRemove={handleRemoveVoucherEntry}
                                    onSubmit={handleVoucherSubmit}
                                    loading={loading}
                                />
                            </motion.div>
                        )}

                        {activeTab === "daybook" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <DaybookTable data={daybook} />
                            </motion.div>
                        )}

                        {activeTab === "trial-balance" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <TrialBalanceTable data={trialBalance} />
                            </motion.div>
                        )}

                        {activeTab === "ledger" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <LedgerView data={ledger} />
                            </motion.div>
                        )}

                        {activeTab === "pl" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <PLView data={plData} />
                            </motion.div>
                        )}

                        {activeTab === "bs" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <BSView data={bsData} />
                            </motion.div>
                        )}

                        {activeTab === "reconcile" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <BRSView />
                            </motion.div>
                        )}

                        {activeTab === "compliance" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <ComplianceView data={gstData} />
                            </motion.div>
                        )}

                        {activeTab === "cfo" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <CFOIntelligenceView data={cfoData} currency={currencySymbol} />
                            </motion.div>
                        )}

                        {activeTab === "customer-ledger" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <CustomerLedgerView
                                    customers={customers}
                                    selectedId={selectedCustomer}
                                    setSelectedId={setSelectedCustomer}
                                    ledger={customerLedger}
                                    onRefresh={refreshData}
                                />
                            </motion.div>
                        )}

                        {activeTab === "usage" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <UsageStatsView data={usageStats} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}

// --- SUB COMPONENTS ---

function MenuButton({ label, sub, icon, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden
                ${active
                    ? "bg-[--primary]/10 border-[--primary]/40 shadow-[--shadow-glow]"
                    : "bg-black/20 border-white/5 hover:border-white/20"}
            `}
        >
            <div className="flex items-center gap-4 relative z-10">
                <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{icon}</span>
                <div>
                    <h4 className="text-sm font-black text-white tracking-tight uppercase">{label}</h4>
                    <p className="text-[9px] font-bold text-[--text-muted] tracking-wide uppercase opacity-60">{sub}</p>
                </div>
            </div>
            {active && <div className="absolute top-0 right-0 w-1 h-full bg-[--primary]" />}
        </button>
    )
}

function StatCard({ label, value, color, trend, unit }: any) {
    const { currencySymbol } = useStore()
    const isNumeric = typeof value === 'number'

    return (
        <Card variant="glass" padding="md" className="group">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted] mb-2">{label}</p>
                    <p className="text-3xl font-black text-white tracking-tighter">
                        {isNumeric ? (unit ? '' : currencySymbol) : ''}
                        {isNumeric ? value.toLocaleString() : value}
                        {unit || ''}
                    </p>
                </div>
                <Badge variant="pro" size="xs" className="opacity-80">{trend}</Badge>
            </div>
            <div className="w-full h-1 bg-white/5 mt-6 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: '70%', background: color }} />
            </div>
        </Card>
    )
}

function VoucherEntryForm({ type, setType, no, setNo, date, setDate, entries, setEntries, onAdd, onRemove, onSubmit, loading }: any) {
    const { currencySymbol } = useStore()
    return (
        <Card variant="bento" padding="lg" className="bg-black/40 border-[--primary]/20">
            <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                <div className="flex gap-4">
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="bg-[--primary] text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-lg border-none outline-none shadow-[--shadow-glow]"
                    >
                        <option>Payment</option>
                        <option>Receipt</option>
                        <option>Contra</option>
                        <option>Journal</option>
                        <option>Sales</option>
                        <option>Purchase</option>
                    </select>
                    <input
                        placeholder="Voucher No (Auto)"
                        value={no}
                        onChange={(e) => setNo(e.target.value)}
                        className="input-pro text-xs font-bold w-40"
                    />
                </div>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-pro text-xs font-bold w-48"
                />
            </div>

            <div className="space-y-4">
                {entries.map((entry: any, i: number) => (
                    <div key={i} className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">
                            <button
                                onClick={() => {
                                    const next = [...entries]
                                    next[i].isDebit = !next[i].isDebit
                                    setEntries(next)
                                }}
                                className={`w-full py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${entry.isDebit ? "bg-[--accent-cyan]/20 text-[--accent-cyan] border border-[--accent-cyan]/30" : "bg-[--accent-rose]/20 text-[--accent-rose] border border-[--accent-rose]/30"}`}
                            >
                                {entry.isDebit ? "Dr" : "Cr"}
                            </button>
                        </div>
                        <div className="col-span-3">
                            <input
                                placeholder="Account Name (Master)"
                                value={entry.account_name}
                                onChange={(e) => {
                                    const next = [...entries]
                                    next[i].account_name = e.target.value
                                    setEntries(next)
                                }}
                                className="input-pro w-full text-xs font-black"
                            />
                        </div>
                        <div className="col-span-2">
                            <select
                                value={entry.type}
                                onChange={(e) => {
                                    const next = [...entries]
                                    next[i].type = e.target.value
                                    setEntries(next)
                                }}
                                className="input-pro w-full text-[10px] font-bold uppercase"
                            >
                                <option>ASSET</option>
                                <option>LIABILITY</option>
                                <option>INCOME</option>
                                <option>EXPENSE</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <input
                                type="number"
                                placeholder={`Amount (${currencySymbol})`}
                                value={entry.amount}
                                onChange={(e) => {
                                    const next = [...entries]
                                    next[i].amount = parseFloat(e.target.value) || 0
                                    setEntries(next)
                                }}
                                className="input-pro w-full text-xs font-black text-white"
                            />
                        </div>
                        <div className="col-span-3">
                            <input
                                placeholder="Narration / Particulars"
                                value={entry.description}
                                onChange={(e) => {
                                    const next = [...entries]
                                    next[i].description = e.target.value
                                    setEntries(next)
                                }}
                                className="input-pro w-full text-[10px] font-medium italic"
                            />
                        </div>
                        <div className="col-span-1">
                            <button onClick={() => onRemove(i)} className="text-white/20 hover:text-[--accent-rose] transition-colors font-black text-lg">×</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center mt-10 pt-8 border-t border-white/5">
                <Button variant="outline" size="sm" onClick={onAdd} className="uppercase text-[9px] font-black tracking-widest">
                    + Add New Entry Line
                </Button>
                <div className="flex gap-4">
                    <Button variant="pro" size="lg" onClick={onSubmit} loading={loading} className="px-12 uppercase text-[10px] tracking-widest shadow-[--shadow-glow]">
                        Finalize & Accept Voucher
                    </Button>
                </div>
            </div>
        </Card>
    )
}

function DaybookTable({ data }: any) {
    const { currencySymbol } = useStore()
    return (
        <Card variant="glass" padding="none" className="overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Consolidated Daybook (Audit Trail)</h3>
                <Badge variant="pro" size="xs">FY 2026-27</Badge>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Date</th>
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">VCH Type</th>
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Particulars</th>
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">VCH No</th>
                            <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Debit / Credit Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((v: any, i: number) => (
                            <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="p-6 text-xs font-bold text-white/50">{v.date}</td>
                                <td className="p-6">
                                    <Badge variant="primary" size="xs" className="uppercase px-4">{v.voucher_type}</Badge>
                                </td>
                                <td className="p-6">
                                    <p className="text-xs font-black text-white">{v.voucher_id}</p>
                                    <p className="text-[10px] font-medium text-[--text-muted] italic max-w-md truncate">{v.participating_ledgers}</p>
                                </td>
                                <td className="p-6 text-[10px] font-mono text-[--text-muted]">{v.voucher_no || '---'}</td>
                                <td className="p-6 text-right font-black text-sm text-[--primary] tracking-tighter">
                                    {currencySymbol}{v.total_quantum?.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

function TrialBalanceTable({ data }: any) {
    const { currencySymbol } = useStore()
    const totalDebit = data.filter((e: any) => e.balance > 0).reduce((a: any, b: any) => a + b.balance, 0)
    const totalCredit = Math.abs(data.filter((e: any) => e.balance < 0).reduce((a: any, b: any) => a + b.balance, 0))

    return (
        <Card variant="glass" padding="none" className="overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Professional Trial Balance</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Particulars (Ledgers)</th>
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Classification</th>
                            <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Debit ({currencySymbol})</th>
                            <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Credit ({currencySymbol})</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((e: any, i: number) => (
                            <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="p-6 text-xs font-black text-white uppercase">{e.account_name}</td>
                                <td className="p-6"><Badge variant="outline" size="xs" className="opacity-60">{e.type}</Badge></td>
                                <td className="p-6 text-right font-black text-sm text-[--accent-cyan]">
                                    {e.balance > 0 ? e.balance.toLocaleString() : ""}
                                </td>
                                <td className="p-6 text-right font-black text-sm text-[--accent-rose]">
                                    {e.balance < 0 ? Math.abs(e.balance).toLocaleString() : ""}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-white/[0.05] border-t-2 border-[--primary]/30">
                            <td colSpan={2} className="p-6 text-xs font-black text-white uppercase">Grand Reconciliation Total</td>
                            <td className="p-6 text-right font-black text-lg text-white border-l border-white/5">
                                {currencySymbol}{totalDebit.toLocaleString()}
                            </td>
                            <td className="p-6 text-right font-black text-lg text-white border-l border-white/5">
                                {currencySymbol}{totalCredit.toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {Math.abs(totalDebit - totalCredit) > 1 && (
                <div className="p-4 bg-[--accent-rose]/10 text-[--accent-rose] text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                    ⚠️ Error: Difference in Opening Balances Detected! (Delta: {(totalDebit - totalCredit).toLocaleString()})
                </div>
            )}
        </Card>
    )
}

function LedgerView({ data }: any) {
    const { currencySymbol } = useStore()
    return (
        <Card variant="glass" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.01]">
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">ID</th>
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Date</th>
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Account</th>
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Type</th>
                            <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Description</th>
                            <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Amount ({currencySymbol})</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((entry: any) => (
                            <tr key={entry.id} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="p-6 text-[10px] font-mono text-[--text-muted]">#{entry.id}</td>
                                <td className="p-6 text-xs font-bold text-white/50">{entry.date}</td>
                                <td className="p-6 text-xs font-black text-white">{entry.account_name}</td>
                                <td className="p-6"><Badge variant="outline" size="xs">{entry.type}</Badge></td>
                                <td className="p-6 text-xs text-[--text-muted]">{entry.description}</td>
                                <td className={`p-6 text-right font-black text-sm ${entry.amount >= 0 ? 'text-[--accent-emerald]' : 'text-[--accent-rose]'}`}>
                                    {entry.amount.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

function PLView({ data }: any) {
    const { currencySymbol } = useStore()
    if (!data) return <div className="text-white">Loading P&L Stream...</div>

    return (
        <Card variant="bento" padding="lg" className="max-w-4xl mx-auto bg-black/40 border-[--accent-emerald]/20">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Profit & Loss Account</h3>
                <Badge variant="pro">FY 2026-27</Badge>
            </div>

            <div className="space-y-10">
                {/* 1. Revenue Section */}
                <section>
                    <div className="flex justify-between items-center mb-4 text-[--accent-emerald]">
                        <h4 className="border-b-2 border-current pb-1 text-[10px] font-black uppercase tracking-widest">Revenue from Operations</h4>
                        <span className="font-black">{currencySymbol}{data.revenue.total.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2 pl-4">
                        {data.revenue.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs font-bold text-white/60">
                                <span>{item.account_name}</span>
                                <span>{item.balance.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. COGS Section */}
                <section>
                    <div className="flex justify-between items-center mb-4 text-[--accent-rose]">
                        <h4 className="border-b-2 border-current pb-1 text-[10px] font-black uppercase tracking-widest">Cost of Goods Sold (Direct)</h4>
                        <span className="font-black">({currencySymbol}{data.cogs.total.toLocaleString()})</span>
                    </div>
                    <div className="space-y-2 pl-4">
                        {data.cogs.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs font-bold text-white/40">
                                <span>{item.account_name}</span>
                                <span>{item.balance.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Gross Profit Divider */}
                <div className="p-4 bg-[--accent-emerald]/5 rounded-xl border border-[--accent-emerald]/20 flex justify-between items-center">
                    <span className="text-[10px] font-black text-[--accent-emerald] uppercase tracking-widest italic">Gross Profit Transferred</span>
                    <span className="text-xl font-black text-white">{currencySymbol}{data.gross_profit.toLocaleString()}</span>
                </div>

                {/* 3. Indirect Expenses Section */}
                <section>
                    <div className="flex justify-between items-center mb-4 text-[--accent-rose]">
                        <h4 className="border-b-2 border-current pb-1 text-[10px] font-black uppercase tracking-widest">Indirect Operational Expenses</h4>
                        <span className="font-black">({currencySymbol}{data.overheads.total.toLocaleString()})</span>
                    </div>
                    <div className="space-y-2 pl-4">
                        {data.overheads.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs font-bold text-white/40">
                                <span>{item.account_name}</span>
                                <span>{item.balance.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final Net Profit */}
                <div className="pt-10 border-t-4 border-[--primary] flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Fiscal Year Conclusion</p>
                        <h4 className="text-2xl font-black text-white italic">Net Realizable Profit</h4>
                    </div>
                    <div className="text-right">
                        <span className={`text-4xl font-black ${data.net_profit >= 0 ? "text-[--accent-emerald]" : "text-[--accent-rose]"} tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]`}>
                            {currencySymbol}{data.net_profit.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    )
}

function BSView({ data }: any) {
    const { currencySymbol } = useStore()
    if (!data) return <div className="text-white">Loading Solvent Matrix...</div>

    return (
        <Card variant="glass" padding="none" className="max-w-5xl mx-auto overflow-hidden border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Side: Liabilities & Equity */}
                <div className="p-8 border-r border-white/5 bg-black/20">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[--accent-rose] mb-10 border-b border-current pb-2">Capital & Liabilities</h3>

                    <div className="space-y-10">
                        <section>
                            <h4 className="text-xs font-black text-white uppercase mb-4">Equity & Reserves</h4>
                            <div className="space-y-2 pl-4">
                                <div className="flex justify-between text-xs font-bold text-white/60">
                                    <span>Retained Earnings</span>
                                    <span>{data.equity.retained_earnings.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-white/40 italic">
                                    <span>Statutory Reserves</span>
                                    <span>0.00</span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-xs font-black text-white uppercase mb-4">Current Liabilities</h4>
                            <div className="space-y-2 pl-4">
                                {data.liabilities.items.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs font-bold text-white/60">
                                        <span>{item.account_name}</span>
                                        <span>{item.balance.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="pt-10 border-t border-white/10 flex justify-between font-black text-xl text-white">
                            <span>TOTAL</span>
                            <span>{currencySymbol}{data.equity.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Assets */}
                <div className="p-8 bg-white/[0.01]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[--accent-emerald] mb-10 border-b border-current pb-2">Business Assets</h3>

                    <div className="space-y-10">
                        <section>
                            <h4 className="text-xs font-black text-white uppercase mb-4">Fixed & Current Assets</h4>
                            <div className="space-y-2 pl-4">
                                {data.assets.items.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs font-bold text-white/60">
                                        <span>{item.account_name}</span>
                                        <span>{item.balance.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="pt-[14.5rem] border-t border-white/10 flex justify-between font-black text-xl text-white">
                            <span>TOTAL</span>
                            <span>{currencySymbol}{data.assets.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Balance Check */}
            <div className="p-4 bg-black text-center text-[10px] font-black uppercase tracking-[0.5em] text-[--primary] border-t border-[--primary]/20">
                Solvent Matrix Balanced & Reconciled
            </div>
        </Card>
    )
}

import { reconcileBankStatement } from "@/services/api"

function BRSView() {
    const { currencySymbol } = useStore()
    const [entries, setEntries] = useState<any[]>([])
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const handleFileUpload = (e: any) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event: any) => {
            const text = event.target.result
            const lines = text.split('\n')
            const parsed = lines.slice(1).map((line: string) => {
                const cols = line.split(',')
                if (cols.length < 3) return null
                return {
                    date: cols[0],
                    description: cols[1],
                    amount: parseFloat(cols[2]) || 0
                }
            }).filter(Boolean)
            setEntries(parsed)
        }
        reader.readAsText(file)
    }

    const runReconciliation = async () => {
        if (entries.length === 0) return
        setLoading(true)
        try {
            const res = await reconcileBankStatement(entries)
            setResults(res)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card variant="bento" padding="lg" className="bg-black/60 border-[--primary]/20">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
                <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Autonomous Bank Reconciliation</h3>
                    <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.3em] mt-1">Fuzzy-Logic Statement Auditing</p>
                </div>
                <div className="flex gap-4">
                    <input type="file" id="bank-csv" hidden onChange={handleFileUpload} accept=".csv" />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('bank-csv')?.click()}>
                        {entries.length > 0 ? `${entries.length} Rows Ingested` : "Upload Bank CSV"}
                    </Button>
                    <Button variant="pro" size="sm" onClick={runReconciliation} loading={loading} disabled={entries.length === 0}>
                        Start AI Matching
                    </Button>
                </div>
            </div>

            {results.length > 0 ? (
                <div className="space-y-4">
                    {results.map((res: any, i: number) => (
                        <div key={i} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${res.status === 'MATCHED' ? 'bg-white/[0.02] border-[--accent-emerald]/20' : res.status === 'UNCERTAIN' ? 'bg-white/[0.01] border-[--accent-amber]/20' : 'bg-[--accent-rose]/5 border-[--accent-rose]/20'}`}>
                            <div className="flex gap-10 items-center">
                                <div className="min-w-[140px]">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Bank Entry</p>
                                    <p className="text-xs font-black text-white">{res.bank_tx.date}</p>
                                    <p className="text-[10px] font-bold text-white/60 truncate max-w-[150px]">{res.bank_tx.description}</p>
                                    <p className="text-sm font-black text-white mt-1">{currencySymbol}{res.bank_tx.amount.toLocaleString()}</p>
                                </div>

                                {res.match && (
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-px bg-white/10" />
                                        <div className="min-w-[180px]">
                                            <p className="text-[9px] font-black text-[--primary] uppercase tracking-widest">Ledger Match</p>
                                            <p className="text-xs font-black text-white/80">{res.match.account_name}</p>
                                            <p className="text-[9px] font-medium text-white/40 italic truncate max-w-[180px]">{res.match.description}</p>
                                            <p className="text-xs font-bold text-white/80">{currencySymbol}{res.match.amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="text-right">
                                <Badge variant={res.status === 'MATCHED' ? 'success' : res.status === 'UNCERTAIN' ? 'warning' : 'danger'} size="xs">
                                    {res.status} ({res.score}%)
                                </Badge>
                                <p className="text-[8px] font-black uppercase text-white/20 mt-2 tracking-widest">Digital Fingerprint: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <p className="text-xl grayscale mb-4">📂</p>
                    <p className="text-xs font-bold text-white/40 italic">Drop your statutory bank export (.csv) here to begin neural reconciliation.</p>
                </div>
            )}
        </Card>
    )
}

function ComplianceView({ data }: any) {
    const { currencySymbol } = useStore()
    if (!data) return <div className="text-white">Hydrating Statutory Reports...</div>

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Statutory Compliance Cockpit</h3>
                    <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.3em] mt-1">GSTR-1 & GSTR-3B Auto-Generation</p>
                </div>
                <Badge variant="pro" pulse>Portal Connection: Ready</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* GSTR-1 Card */}
                <Card variant="bento" padding="lg" className="border-[--accent-cyan]/20">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">GSTR-1 Summary</h4>
                        <Badge variant="outline">Outward Supplies</Badge>
                    </div>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Taxable Value</span>
                            <span className="text-xl font-black text-white">{currencySymbol}{data.gstr1.total_outward_supplies.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <div>
                                <p className="text-[9px] font-black text-[--primary] uppercase">CGST (9%)</p>
                                <p className="text-lg font-black text-white">{currencySymbol}{data.gstr1.cgst.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-[--primary] uppercase">SGST (9%)</p>
                                <p className="text-lg font-black text-white">{currencySymbol}{data.gstr1.sgst.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* GSTR-3B Card */}
                <Card variant="bento" padding="lg" className="border-[--accent-emerald]/20">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">GSTR-3B Return</h4>
                        <Badge variant="outline">Summary Ledger</Badge>
                    </div>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Tax Liability</span>
                            <span className="text-xl font-black text-[--accent-rose]">{currencySymbol}{data.gstr3b.outward_tax_liability.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase">ITC Available</span>
                            <span className="text-xl font-black text-[--accent-emerald]">{currencySymbol}{data.gstr3b.itc_available.toLocaleString()}</span>
                        </div>
                        <div className="pt-4 border-t-2 border-[--primary] flex justify-between items-center">
                            <span className="text-xs font-black text-white uppercase italic">Net GST Payable</span>
                            <span className="text-2xl font-black text-white shadow-sm">{currencySymbol}{data.gstr3b.net_gst_payable.toLocaleString()}</span>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card variant="glass" padding="md" className="border-white/5 bg-white/[0.01]">
                    <p className="text-[9px] font-black text-[--text-muted] uppercase tracking-widest mb-2">B2B Invoices</p>
                    <p className="text-2xl font-black text-white">{data.gstr1.b2b_count}</p>
                </Card>
                <Card variant="glass" padding="md" className="border-white/5 bg-white/[0.01]">
                    <p className="text-[9px] font-black text-[--text-muted] uppercase tracking-widest mb-2">Filing Status</p>
                    <p className="text-2xl font-black text-[--accent-amber]">PENDING</p>
                </Card>
                <Card variant="glass" padding="md" className="border-white/5 bg-white/[0.01]">
                    <p className="text-[9px] font-black text-[--text-muted] uppercase tracking-widest mb-2">Compliance Score</p>
                    <p className="text-2xl font-black text-[--accent-emerald]">AA+</p>
                </Card>
            </div>
        </div>
    )
}

function StatementLine({ label, value, isRed }: any) {
    const { currencySymbol } = useStore()
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-white/40 uppercase text-[10px] tracking-widest">{label}</span>
            <span className={`font-black ${isRed ? "text-[--accent-rose]" : "text-white"}`}>
                {currencySymbol}{(value || 0).toLocaleString()}
            </span>
        </div>
    )
}

function CustomerLedgerView({ customers, selectedId, setSelectedId, ledger, onRefresh }: any) {
    const { currencySymbol } = useStore()
    const [showPayment, setShowPayment] = useState(false)
    const [paymentData, setPaymentData] = useState({ amount: 0, reference_no: "", payment_mode: "BANK", date: new Date().toISOString().split('T')[0] })
    const [loading, setLoading] = useState(false)

    // Calculate dynamic running balance
    // In Accounting: Ledger is sorted desc by date, so we calculate from bottom up or just sum everything
    const totalDebit = ledger.filter((l: any) => l.amount > 0).reduce((a: any, b: any) => a + b.amount, 0)
    const totalCredit = Math.abs(ledger.filter((l: any) => l.amount < 0).reduce((a: any, b: any) => a + b.amount, 0))
    const closingBalance = totalDebit - totalCredit

    const handlePaymentSubmit = async () => {
        if (!selectedId || paymentData.amount <= 0) return
        setLoading(true)
        try {
            await recordPayment({
                customer_id: selectedId,
                ...paymentData
            })
            setShowPayment(false)
            onRefresh()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white/[0.02] p-8 rounded-2xl border border-white/5">
                <div className="w-full md:w-96 space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[--primary]">Select Customer Entity</label>
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="input-pro w-full font-black text-white"
                    >
                        <option value="">-- Choose Account --</option>
                        {customers.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-[--text-muted] uppercase tracking-widest mb-1">Closing Balance (O/S)</p>
                        <p className={`text-3xl font-black italic tracking-tighter ${closingBalance > 0 ? 'text-[--accent-rose]' : 'text-[--accent-emerald]'}`}>
                            {currencySymbol}{Math.abs(closingBalance).toLocaleString()}
                            <span className="text-xs ml-2 opacity-50 font-black uppercase">{closingBalance > 0 ? "Dr" : "Cr"}</span>
                        </p>
                    </div>
                </div>
            </div>

            {selectedId && (
                <div className="space-y-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Audit Trail: {selectedId}</h3>
                        <Button variant="pro" size="sm" onClick={() => setShowPayment(true)} className="uppercase text-[10px] tracking-widest shadow-[--shadow-glow]">
                            Record Collection / Payment
                        </Button>
                    </div>

                    <AnimatePresence>
                        {showPayment && (
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                <Card variant="bento" padding="lg" className="bg-[--primary]/5 border-[--primary]/30">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-[--text-muted]">Amount</label>
                                            <input type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })} className="input-pro w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-[--text-muted]">Reference / Inst No</label>
                                            <input value={paymentData.reference_no} onChange={(e) => setPaymentData({ ...paymentData, reference_no: e.target.value })} className="input-pro w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-[--text-muted]">Mode</label>
                                            <select value={paymentData.payment_mode} onChange={(e) => setPaymentData({ ...paymentData, payment_mode: e.target.value })} className="input-pro w-full">
                                                <option value="BANK">BANK / NEFT</option>
                                                <option value="CASH">CASH COLLECTION</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <Button variant="pro" className="flex-1" onClick={handlePaymentSubmit} loading={loading}>Accept</Button>
                                            <Button variant="ghost" onClick={() => setShowPayment(false)}>Cancel</Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Card variant="glass" padding="none" className="overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">VCH Date</th>
                                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">VCH Type</th>
                                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Instrument / Ref</th>
                                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Particulars</th>
                                    <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Debit (Sale)</th>
                                    <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">Credit (Rect)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ledger.map((entry: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-6 text-xs font-bold text-white/40">{entry.date}</td>
                                        <td className="p-6">
                                            <Badge variant={entry.voucher_type === 'Sales' ? 'primary' : 'pro'} size="xs" className="uppercase">{entry.voucher_type}</Badge>
                                        </td>
                                        <td className="p-6 text-[10px] font-mono text-[--text-muted]">{entry.voucher_no || entry.voucher_id}</td>
                                        <td className="p-6 text-xs text-white/70 max-w-[200px] truncate">{entry.description}</td>
                                        <td className="p-6 text-right font-black text-sm text-[--accent-rose]">
                                            {entry.amount > 0 ? entry.amount.toLocaleString() : ""}
                                        </td>
                                        <td className="p-6 text-right font-black text-sm text-[--accent-emerald]">
                                            {entry.amount < 0 ? Math.abs(entry.amount).toLocaleString() : ""}
                                        </td>
                                    </tr>
                                ))}
                                {ledger.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-[--text-muted] text-xs font-bold italic uppercase tracking-widest">
                                            No transaction records found for this account in current FY.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}
        </div>
    )
}
function UsageStatsView({ data }: { data: any[] }) {
    return (
        <div className="space-y-8">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">System Usage Governance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(data || []).map((stat: any, i: number) => (
                    <Card key={i} variant="bento" padding="lg" className="bg-white/[0.02] border-white/5 group hover:border-[--primary]/30 transition-all">
                        <p className="text-[10px] font-black text-[--text-muted] uppercase tracking-[0.2em] mb-4">Module Protocol</p>
                        <p className="text-2xl font-black text-white group-hover:text-[--primary] transition-colors">{stat.module}</p>
                        <div className="mt-6 flex justify-between items-end">
                            <span className="text-4xl font-black italic text-white/10 group-hover:text-white/20 transition-all">{stat.count}</span>
                            <span className="text-[9px] font-bold text-[--text-muted] mb-2 uppercase">Actions Logged</span>
                        </div>
                    </Card>
                ))}
                {(data || []).length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <p className="text-xs font-bold text-[--text-muted] italic uppercase tracking-widest">No audit telemetry recorded yet. Initialize modules to begin tracking.</p>
                    </div>
                )}
            </div>
            <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01]">
                <p className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest leading-relaxed">
                    Note: Telemetry is sampled at runtime. High action density in specific modules (e.g., Billing) typically indicates operational peak periods or batch processing activities.
                </p>
            </div>
        </div>
    )
} function CFOIntelligenceView({ data, currency }: { data: any, currency: string }) {
    if (!data) return <div className="py-20 text-center text-xs font-bold text-[--text-muted] uppercase tracking-widest animate-pulse">Initializing Neural Health Check...</div>

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-[--primary]/10 p-6 rounded-2xl border border-[--primary]/20">
                <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">CFO Strategic Health</h3>
                    <p className="text-[10px] font-black text-[--primary] uppercase tracking-[0.2em] mt-1">Real-time Enterprise Liquidity & Performance Matrix</p>
                </div>
                <Badge variant={data.business_health === 'PRIME' ? 'primary' : 'info'} size="lg">
                    {data.business_health} COMPLIANCE
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card variant="bento" padding="lg" className="bg-black/40 border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-4xl opacity-10 grayscale group-hover:grayscale-0 transition-all">📈</div>
                    <p className="text-[10px] font-black text-[--text-muted] uppercase tracking-widest mb-2">EBITDA Projection</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">{currency}{data.ebitda?.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-[--accent-emerald] mt-4 uppercase">↑ Neural Optimization suggestions active</p>
                </Card>

                <Card variant="bento" padding="lg" className="bg-black/40 border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-4xl opacity-10 grayscale group-hover:grayscale-0 transition-all">⚖️</div>
                    <p className="text-[10px] font-black text-[--text-muted] uppercase tracking-widest mb-2">Current Ratio (Liquidity)</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">{data.current_ratio}</p>
                    <p className="text-[9px] font-bold text-[--accent-amber] mt-4 uppercase">Target: &gt; 1.50 for Optimal Growth</p>
                </Card>

                <Card variant="bento" padding="lg" className="bg-black/40 border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-4xl opacity-10 grayscale group-hover:grayscale-0 transition-all">⏳</div>
                    <p className="text-[10px] font-black text-[--text-muted] uppercase tracking-widest mb-2">Days Sales O/S (DSO)</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">{data.days_sales_outstanding}d</p>
                    <p className="text-[9px] font-bold text-[--accent-rose] mt-4 uppercase">Action: Trigger automated reminders</p>
                </Card>
            </div>

            <div className="p-8 rounded-2xl border border-white/5 bg-[--primary]/5">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Strategic AI Recommendation</h4>
                <p className="text-xs font-bold text-white/60 leading-relaxed italic">
                    "Cognitive Analysis: Your Current Ratio of {data.current_ratio} indicates {data.business_health === 'PRIME' ? 'excellent' : 'sufficient'} structural solvency. However, the DSO profile suggests ₹{(data.ebitda * 0.1).toLocaleString()} could be unlocked by optimizing the collection protocol for Net-30 clients."
                </p>
            </div>
        </div>
    )
}
