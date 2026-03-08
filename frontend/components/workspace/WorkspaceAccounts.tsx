"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getLedger, addLedgerEntry, getAccountingNotes, addAccountingNote, getFinancialStatements } from "@/services/api"
import { useStore } from "@/store/useStore"

type TabType = "ledger" | "statements" | "notes"

export default function WorkspaceAccounts() {
    const { currencySymbol, results } = useStore()
    const [activeTab, setActiveTab] = useState<TabType>("ledger")
    const [ledger, setLedger] = useState<any[]>([])
    const [notes, setNotes] = useState<any[]>([])
    const [statements, setStatements] = useState<any>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form states
    const [ledgerForm, setLedgerForm] = useState({ account_name: "", type: "INCOME", amount: 0, description: "" })
    const [noteForm, setNoteForm] = useState({ note_type: "DEBIT", customer_id: "", reference_invoice: "", amount: 0, tax_amount: 0, reason: "" })

    useEffect(() => { refreshData() }, [activeTab])

    const refreshData = async () => {
        setLoading(true)
        try {
            const [ledgerData, notesData, statsData] = await Promise.all([
                getLedger(),
                getAccountingNotes(),
                getFinancialStatements()
            ])
            setLedger(ledgerData)
            setNotes(notesData)
            setStatements(statsData)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handleAddLedger = async () => {
        if (!ledgerForm.account_name || !ledgerForm.amount) return alert("Account Name and Amount are mandatory")
        setLoading(true)
        try {
            await addLedgerEntry(ledgerForm)
            setShowAdd(false)
            setLedgerForm({ account_name: "", type: "INCOME", amount: 0, description: "" })
            refreshData()
        } catch (e) { alert("Authorization Failure: Ledger write protected") }
        finally { setLoading(false) }
    }

    const handleAddNote = async () => {
        if (!noteForm.customer_id || !noteForm.amount) return alert("Customer and Amount are mandatory")
        setLoading(true)
        try {
            await addAccountingNote(noteForm)
            setShowAdd(false)
            setNoteForm({ note_type: "DEBIT", customer_id: "", reference_invoice: "", amount: 0, tax_amount: 0, reason: "" })
            refreshData()
        } catch (e) { alert("Failed to record statutory note") }
        finally { setLoading(false) }
    }

    const aiFinancialTip = results?.strategic_plan || "Autonomous Analyst: Ensure liquid assets exceed short-term liabilities by 150% to maintain statutory resilience during scaling."

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Executive Corporate Overview */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }}>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-emerald)" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Net Enterprise Income</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: (statements?.net_profit || 0) >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                        {currencySymbol}{(statements?.net_profit || 0).toLocaleString()}
                    </p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-cyan)" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Capital Assets</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800 }}>{currencySymbol}{(statements?.assets || 0).toLocaleString()}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-amber)" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Statutory Liabilities</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-amber)" }}>{currencySymbol}{(statements?.liabilities || 0).toLocaleString()}</p>
                </div>
                <div className="metric-card" style={{ borderLeft: "4px solid var(--accent-indigo)" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Equity Valuation</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800 }}>{currencySymbol}{(statements?.equity || 0).toLocaleString()}</p>
                </div>
            </div>

            {/* AI Asset Management Directive */}
            <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                className="chart-card"
                style={{ borderLeft: "4px solid var(--primary-500)", background: "rgba(99,102,241,0.05)", padding: "1.5rem" }}
            >
                <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "2rem" }}>🏛️</div>
                    <div>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary-400)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI FINANCIAL SYNCHRONIZATION DIRECTIVE</h4>
                        <div style={{ fontSize: "1rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.6 }}>
                            {aiFinancialTip}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
                {(["ledger", "statements", "notes"] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: "0.75rem 1.5rem",
                            borderRadius: "12px",
                            background: activeTab === tab ? "var(--primary-500)" : "transparent",
                            color: activeTab === tab ? "white" : "var(--text-muted)",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            textTransform: "capitalize",
                            transition: "all 0.3s"
                        }}
                    >
                        {tab === "notes" ? "Statutory Notes" : tab === "statements" ? "Financial Books" : "General Ledger"}
                    </button>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                        {activeTab === 'ledger' ? 'Enterprise Ledger' : activeTab === 'statements' ? 'Corporate Balance Sheet' : 'Debit & Credit Records'}
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {activeTab === 'ledger' ? 'Record and track multi-entry financial movements' : activeTab === 'statements' ? 'Real-time statement of financial position and P&L' : 'Maintain statutory corrections and value replacements'}
                    </p>
                </div>
                {activeTab !== 'statements' && (
                    <button className="btn-primary" onClick={() => setShowAdd(true)}>
                        + {activeTab === 'ledger' ? 'New Entry' : 'Issue Note'}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="chart-card"
                        style={{ border: "1px solid var(--primary-500)", padding: "2rem" }}
                    >
                        {activeTab === 'ledger' ? (
                            <>
                                <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1.5rem" }}>Record Financial Movement</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                                    <div className="input-group">
                                        <label className="label-stat">Account Name</label>
                                        <input placeholder="HDFC Current Account" value={ledgerForm.account_name} onChange={(e) => setLedgerForm({ ...ledgerForm, account_name: e.target.value })} className="input-base" style={{ width: "100%" }} />
                                    </div>
                                    <div className="input-group">
                                        <label className="label-stat">Type</label>
                                        <select value={ledgerForm.type} onChange={(e) => setLedgerForm({ ...ledgerForm, type: e.target.value })} className="input-base" style={{ width: "100%" }}>
                                            <option value="INCOME">Income / Revenue</option>
                                            <option value="EXPENSE">Expense / CapEx</option>
                                            <option value="ASSET">Fixed Asset</option>
                                            <option value="LIABILITY">Liablity</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="label-stat">Amount ({currencySymbol})</label>
                                        <input type="number" value={ledgerForm.amount} onChange={(e) => setLedgerForm({ ...ledgerForm, amount: parseFloat(e.target.value) || 0 })} className="input-base" style={{ width: "100%" }} />
                                    </div>
                                </div>
                                <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                                    <label className="label-stat">Entry Description</label>
                                    <input placeholder="Internal fund transfer or statutory payment" value={ledgerForm.description} onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })} className="input-base" style={{ width: "100%" }} />
                                </div>
                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <button className="btn-primary" onClick={handleAddLedger} disabled={loading} style={{ flex: 1 }}>Finalize Ledger</button>
                                    <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1.5rem" }}>Issue Statutory Note</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                                    <div className="input-group">
                                        <label className="label-stat">Note Type</label>
                                        <select value={noteForm.note_type} onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })} className="input-base" style={{ width: "100%" }}>
                                            <option value="DEBIT">Debit Note (Increase Liablity)</option>
                                            <option value="CREDIT">Credit Note (Decrease Liablity)</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="label-stat">Client Name/ID</label>
                                        <input placeholder="Search Client..." value={noteForm.customer_id} onChange={(e) => setNoteForm({ ...noteForm, customer_id: e.target.value })} className="input-base" style={{ width: "100%" }} />
                                    </div>
                                    <div className="input-group">
                                        <label className="label-stat">Ref Invoice #</label>
                                        <input placeholder="INV-2026-001" value={noteForm.reference_invoice} onChange={(e) => setNoteForm({ ...noteForm, reference_invoice: e.target.value })} className="input-base" style={{ width: "100%" }} />
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                                    <div className="input-group">
                                        <label className="label-stat">Base Amount</label>
                                        <input type="number" value={noteForm.amount} onChange={(e) => setNoteForm({ ...noteForm, amount: parseFloat(e.target.value) || 0 })} className="input-base" style={{ width: "100%" }} />
                                    </div>
                                    <div className="input-group">
                                        <label className="label-stat">Tax Adjust</label>
                                        <input type="number" value={noteForm.tax_amount} onChange={(e) => setNoteForm({ ...noteForm, tax_amount: parseFloat(e.target.value) || 0 })} className="input-base" style={{ width: "100%" }} />
                                    </div>
                                    <div className="input-group">
                                        <label className="label-stat">Reason for Issuance</label>
                                        <input placeholder="Returns, pricing errors, or statutory adjustment" value={noteForm.reason} onChange={(e) => setNoteForm({ ...noteForm, reason: e.target.value })} className="input-base" style={{ width: "100%" }} />
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <button className="btn-primary" onClick={handleAddNote} disabled={loading} style={{ flex: 1 }}>Issue Note</button>
                                    <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {activeTab === 'ledger' && (
                <div className="chart-card" style={{ padding: "0" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Account</th>
                                <th>Classification</th>
                                <th>Memo</th>
                                <th style={{ textAlign: "right" }}>Flow ({currencySymbol})</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.map((entry) => (
                                <tr key={entry.id}>
                                    <td style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>#{entry.id}</td>
                                    <td>{entry.date}</td>
                                    <td style={{ fontWeight: 700 }}>{entry.account_name}</td>
                                    <td>
                                        <span className={`badge ${entry.type === 'INCOME' ? 'badge-success' : entry.type === 'EXPENSE' ? 'badge-danger' : 'badge-primary'}`}>
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: "0.85rem", opacity: 0.7 }}>{entry.description}</td>
                                    <td style={{ textAlign: "right", fontWeight: 900, color: entry.amount >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                                        {entry.amount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="chart-card" style={{ padding: "0" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Note ID</th>
                                <th>Issued On</th>
                                <th>Compliance Type</th>
                                <th>Client / Entity</th>
                                <th>Ref Invoice</th>
                                <th style={{ textAlign: "right" }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notes.map((note) => (
                                <tr key={note.id}>
                                    <td style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>NT-{note.id}</td>
                                    <td>{note.date}</td>
                                    <td>
                                        <span className={`badge ${note.note_type === 'CREDIT' ? 'badge-success' : 'badge-danger'}`}>
                                            {note.note_type} NOTE
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{note.customer_id}</td>
                                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{note.reference_invoice}</td>
                                    <td style={{ textAlign: "right", fontWeight: 900 }}>
                                        {currencySymbol}{note.amount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'statements' && (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                        {/* Simplified Balance Sheet */}
                        <div className="chart-card">
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "2rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>Balance Sheet (Consolidated)</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                <StatementLine label="Capital Assets (Bank & Inventory)" value={statements?.assets} />
                                <StatementLine label="Short-Term Liabilities (GST Output)" value={statements?.liabilities} isRed />
                                <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0.5rem 0" }} />
                                <StatementLine label="Enterprise Equity (Reserves)" value={statements?.equity} isBold />
                            </div>
                        </div>
                        {/* Simplified P&L */}
                        <div className="chart-card">
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "2rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>Profit & Loss Statement</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                <StatementLine label="Gross Operating Revenue" value={statements?.revenue} />
                                <StatementLine label="Direct & Indirect Expenses" value={statements?.expenses} isRed />
                                <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0.5rem 0" }} />
                                <StatementLine label="Net Taxable Profit" value={statements?.net_profit} isBold isGreen />
                            </div>
                        </div>
                    </div>

                    <div className="chart-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border-subtle)" }}>
                        <h4 style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "1.5rem" }}>FINANCIAL HEALTH CHECK</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            <div style={{ padding: "1rem", background: "rgba(16,185,129,0.05)", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.1)" }}>
                                <p style={{ fontSize: "0.7rem", color: "var(--accent-emerald)", fontWeight: 800 }}>PROFITABILITY MARGIN</p>
                                <p style={{ fontSize: "1.25rem", fontWeight: 900 }}>
                                    {statements?.revenue > 0 ? ((statements.net_profit / statements.revenue) * 100).toFixed(1) : 0}%
                                </p>
                            </div>
                            <div style={{ padding: "1rem", background: "rgba(59,130,246,0.05)", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.1)" }}>
                                <p style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: 800 }}>LIQUIDITY RATIO</p>
                                <p style={{ fontSize: "1.25rem", fontWeight: 900 }}>
                                    {statements?.liabilities > 0 ? (statements.assets / statements.liabilities).toFixed(2) : '∞'}
                                </p>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                                <p>This Overview is synchronized with your <strong>Double-Entry Ledger</strong>. Any change in Invoicing, Marketing Spend, or Inventory Acquisition is automatically reflected across all books.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Styles Injection */}
            <style jsx>{`
                .label-stat {
                    font-size: 0.65rem; 
                    fontWeight: 700; 
                    color: var(--text-muted); 
                    text-transform: uppercase; 
                    margin-bottom: 0.4rem; 
                    display: block;
                }
            `}</style>
        </div>
    )
}

function StatementLine({ label, value, isRed, isGreen, isBold }: any) {
    const { currencySymbol } = useStore()
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: isBold ? 900 : 400 }}>{label}</span>
            <span style={{
                fontSize: "1.1rem",
                fontWeight: 900,
                color: isRed ? "var(--accent-rose)" : isGreen ? "var(--accent-emerald)" : "var(--text-primary)"
            }}>
                {currencySymbol}{(value || 0).toLocaleString()}
            </span>
        </div>
    )
}
