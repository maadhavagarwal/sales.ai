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

      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <PageHeader title={title} subtitle={subtitle} actions={actions} />

        <div className="flex-1 overflow-y-auto scrollbar-pro">
          <div className="px-5 sm:px-8 lg:px-10 py-6 lg:py-8 max-w-[1680px] mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
