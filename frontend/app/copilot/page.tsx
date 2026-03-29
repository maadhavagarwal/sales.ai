"use client"

import DashboardLayout from "@/components/layout/DashboardLayout"
import UnifiedChatComponent from "@/components/UnifiedChat"
import { useStore } from "@/store/useStore"
import { Badge } from "@/components/ui"

export default function CopilotPage() {
    const { results, datasetId } = useStore()

    return (
        <DashboardLayout
            title="Neural Intelligence Hub"
            subtitle="Unified AI assistant for data analysis and charting"
            actions={
                <div className="flex items-center gap-4">
                    <Badge variant={datasetId ? "success" : "warning"} pulse={!!datasetId}>
                        {datasetId ? "Aura Brain Linked" : "No Neural Context"}
                    </Badge>
                </div>
            }
        >
            <div className="h-[calc(100vh-250px)] min-h-[600px] rounded-3xl overflow-hidden border border-[--border-subtle]">
                <UnifiedChatComponent />
            </div>
        </DashboardLayout>
    )
}
