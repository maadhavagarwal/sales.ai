"use client"

import Sidebar from "@/components/layout/Sidebar"
import PageHeader from "@/components/layout/PageHeader"
import NLBIChart from "@/components/nlbi/NLBIChart"
import { useStore } from "@/store/useStore"

export default function DatasetsPage() {
    const { results } = useStore()

    return (
        <>
            <Sidebar />
            <div className="main-content">
                <PageHeader
                    title="NLBI Charts"
                    subtitle="Generate charts from natural language"
                    actions={
                        results ? (
                            <span className="badge badge-success">Dataset ready</span>
                        ) : (
                            <span className="badge badge-warning">No dataset</span>
                        )
                    }
                />

                <div className="page-body">
                    {!results ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                            <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 border border-slate-600 flex items-center justify-center text-2xl">
                                💡
                            </div>
                            <p className="font-semibold text-slate-200">No data loaded</p>
                            <p className="text-sm text-slate-400">
                                Upload a CSV from the Dashboard to generate NLBI charts
                            </p>
                        </div>
                    ) : (
                        <NLBIChart />
                    )}
                </div>
            </div>
        </>
    )
}
