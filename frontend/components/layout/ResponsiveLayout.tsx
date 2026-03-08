"use client"

import React from "react"

interface ResponsiveLayoutProps {
  sidebar?: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
  showSidebar?: boolean
  onToggleSidebar?: () => void
}

export default function ResponsiveLayout({
  sidebar,
  header,
  children,
  showSidebar = true,
  onToggleSidebar,
}: ResponsiveLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar - Hidden on mobile, visible on md and up */}
      <div
        className={`
          fixed md:relative md:w-64 lg:w-72 h-full
          transition-all duration-300 z-40
          ${mobileMenuOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0"}
          bg-slate-900 border-r border-slate-800
          overflow-y-auto
        `}
      >
        {showSidebar && sidebar}
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm md:hidden z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 h-16 sm:h-20">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Header content */}
            <div className="flex-1 md:flex-none">{header}</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
