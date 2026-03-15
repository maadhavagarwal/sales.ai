import { Suspense } from 'react'
import WorkspaceContent from "@/components/workspace/WorkspaceContent"

export const dynamic = 'force-dynamic'

export default function WorkspacePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WorkspaceContent />
        </Suspense>
    )
}
