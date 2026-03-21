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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.12),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(99,102,241,0.12),transparent_42%)]" />
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-size-[32px_32px]" />
      </div>

      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <PageHeader title={title} subtitle={subtitle} actions={actions} />

        <div className="flex-1 overflow-y-auto scrollbar-pro">
          <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-10 max-w-400 mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
