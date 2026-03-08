"use client"

import Sidebar from "@/components/layout/Sidebar"
import PageHeader from "@/components/layout/PageHeader"
import CopilotChat from "@/components/ai/CopilotChat"
import { useStore } from "@/store/useStore"

export default function CopilotPage() {
    const { results } = useStore()

    return (
        <>
            <Sidebar />
            <div className="main-content">
                <PageHeader
                    title="AI Copilot"
                    subtitle="Ask anything about your data"
                    actions={
                        results ? (
                            <span className="badge badge-success">Dataset ready</span>
                        ) : (
                            <span className="badge badge-warning">No dataset</span>
                        )
                    }
                />

                <div style={{ height: "calc(100vh - 73px)" }}>
                    <CopilotChat />
                </div>
            </div>
        </>
    )
}
