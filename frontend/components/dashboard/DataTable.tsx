"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, Button } from "@/components/ui"

interface DataTableProps {
    data: Record<string, any>[]
    columns: string[]
}

export default function DataTable({ data, columns }: DataTableProps) {
    const [sortCol, setSortCol] = useState("")
    const [sortAsc, setSortAsc] = useState(true)
    const [page, setPage] = useState(0)
    const pageSize = 15

    const sorted = useMemo(() => {
        if (!sortCol) return data
        return [...data].sort((a, b) => {
            const va = a[sortCol]; const vb = b[sortCol]
            if (va == null) return 1; if (vb == null) return -1
            if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va
            return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
        })
    }, [data, sortCol, sortAsc])

    const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize)
    const totalPages = Math.ceil(sorted.length / pageSize)

    const handleSort = (col: string) => {
        if (sortCol === col) setSortAsc(!sortAsc)
        else { setSortCol(col); setSortAsc(true) }
    }

    const fmtVal = (v: any) => {
        if (v == null) return "—"
        if (typeof v === "number") return v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v.toString()
        return String(v).length > 30 ? String(v).slice(0, 30) + "…" : String(v)
    }

    return (
        <Card variant="glass" padding="none" className="overflow-hidden border-[--border-subtle] flex flex-col">
            <div className="px-8 py-8 border-b border-[--border-subtle] bg-[--surface-0]/40 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-[--text-primary] tracking-tight">Intelligence Ledger</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[--text-muted] mt-1 italic">
                        Raw Sales Data Stream • {data.length.toLocaleString()} Total Records
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="xs" onClick={() => { }} icon={<span className="text-xs">💿</span>}>CSV</Button>
                    <Button variant="outline" size="xs" onClick={() => { }} icon={<span className="text-xs">📑</span>}>PDF</Button>
                </div>
            </div>

            <div className="overflow-x-auto scrollbar-pro flex-1">
                <table className="w-full text-left border-collapse min-w-200">
                    <thead>
                        <tr className="bg-[--surface-1]/50">
                            {columns.slice(0, 15).map((col) => (
                                <th
                                    key={col}
                                    onClick={() => handleSort(col)}
                                    className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-[--text-muted] cursor-pointer hover:bg-[--surface-2] hover:text-[--primary] transition-all border-b border-[--border-strong] whitespace-nowrap"
                                >
                                    <div className="flex items-center gap-2">
                                        {col}
                                        {sortCol === col ? (
                                            <span className="text-[--primary] text-sm">{sortAsc ? "↓" : "↑"}</span>
                                        ) : (
                                            <span className="opacity-0 group-hover:opacity-30">↕</span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[--border-subtle]">
                        {pageData.map((row, i) => (
                            <tr
                                key={i}
                                className="hover:bg-[--surface-2]/30 transition-colors group"
                            >
                                {columns.slice(0, 15).map((col) => (
                                    <td key={col} className="px-6 py-5 text-xs font-bold text-[--text-secondary] group-hover:text-[--text-primary] transition-colors truncate max-w-50">
                                        {fmtVal(row[col])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-8 py-6 border-t border-[--border-strong] bg-[--surface-0]/40 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[--text-muted]">
                    Showing <span className="text-[--primary]">{page * pageSize + 1}</span> to <span className="text-[--primary]">{Math.min((page + 1) * pageSize, data.length)}</span> of <span className="text-[--primary]">{data.length}</span> records
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-6 h-10 border border-[--border-strong] hover:brightness-125"
                    >
                        Previous
                    </Button>
                    <div className="flex gap-2">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const p = i
                            return (
                                <button
                                    key={i}
                                    onClick={() => setPage(p)}
                                    className={`w-10 h-10 rounded-[--radius-xs] text-xs font-black transition-all ${page === p ? 'bg-[--primary] text-white' : 'bg-[--surface-1] border border-[--border-strong] text-[--text-muted] hover:bg-[--surface-2]'}`}
                                >
                                    {p + 1}
                                </button>
                            )
                        })}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-6 h-10 border border-[--border-strong] hover:brightness-125"
                    >
                        Next Cycle
                    </Button>
                </div>
            </div>
        </Card>
    )
}
