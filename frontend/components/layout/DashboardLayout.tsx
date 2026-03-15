"use client"

import Sidebar from "@/components/layout/Sidebar"
import PageHeader from "@/components/layout/PageHeader"

interface DashboardLayoutProps {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}

export default function DashboardLayout({
  title,
  subtitle,
  actions,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[--background] text-[--text-primary] relative overflow-hidden">
      {/* Animated Background blobs */}
      <div className="blob-container">
        <div className="blob" style={{ top: '-10%', left: '-10%', background: 'var(--mesh-1)' }} />
        <div className="blob" style={{ bottom: '-10%', right: '-10%', background: 'var(--mesh-2)', animationDelay: '-5s' }} />
        <div className="blob" style={{ top: '40%', left: '30%', width: '300px', height: '300px', background: 'var(--mesh-3)', animationDelay: '-10s' }} />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <PageHeader title={title} subtitle={subtitle} actions={actions} />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto scrollbar-pro">
          <div className="px-6 md:px-12 py-10 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
