"use client"

import Sidebar from "@/components/layout/Sidebar"
import PageHeader from "@/components/layout/PageHeader"
import SimulationsPanel from "@/components/simulations/SimulationsPanel"
import PricingOptimizationPanel from "@/components/simulations/PricingOptimizationPanel"
import { useStore } from "@/store/useStore"

export default function SimulationsPage() {
    const { results } = useStore()

    return (
        <>
            <Sidebar />
            <div className="main-content">
                <PageHeader
                    title="Simulations"
                    subtitle="What-if scenario analysis"
                    actions={
                        results ? (
                            <span className="badge badge-success">
                                {results.simulation_results?.length || 0} scenarios
                            </span>
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
                                🔬
                            </div>
                            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No simulations available</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                Upload a CSV from the Dashboard to run simulations
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                            <SimulationsPanel simulations={results.simulation_results} />
                            <PricingOptimizationPanel />
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
