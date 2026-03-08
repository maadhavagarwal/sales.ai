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
    <div className="flex min-h-screen bg-[--background] text-[--text-primary]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-500">
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
