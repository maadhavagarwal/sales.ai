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
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
                            <div
                                style={{
                                    width: "72px",
                                    height: "72px",
                                    borderRadius: "var(--radius-xl)",
                                    background: "var(--gradient-surface)",
                                    border: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.75rem",
                                }}
                            >
                                💡
                            </div>
                            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No data loaded</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
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
