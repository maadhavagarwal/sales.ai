"use client"

import CurrencySelector from "@/components/ui/CurrencySelector"

interface PageHeaderProps {
    title: string
    subtitle?: React.ReactNode
    actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <header className="sticky top-0 z-40 bg-[--background]/80 backdrop-blur-xl border-b border-[--border-subtle] px-6 md:px-12 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left Section - Title & Subtitle */}
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl font-black text-[--text-primary] tracking-tight truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm font-medium text-[--text-muted] mt-1.5 flex items-center gap-2">
                            <span className="w-1 h-3 bg-[--primary]/40 rounded-full" />
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Right Section - Actions & Selector */}
                <div className="flex flex-wrap items-center gap-3 md:gap-6">
                    {actions && (
                        <div className="flex items-center gap-2 bg-[--surface-1] p-1 rounded-[--radius-sm] border border-[--border-strong]">
                            {actions}
                        </div>
                    )}

                    <div className="h-8 w-px bg-[--border-subtle] hidden sm:block" />

                    {/* Currency Selector */}
                    <div className="relative group">
                        <CurrencySelector />
                    </div>
                </div>
            </div>
        </header>
    )
}
