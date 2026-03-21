"use client"

import CurrencySelector from "@/components/ui/CurrencySelector"

interface PageHeaderProps {
    title: string
    subtitle?: React.ReactNode
    actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <header className="sticky top-0 z-40 bg-[--surface-1]/80 backdrop-blur-xl border-b border-[--border-subtle] px-5 sm:px-8 lg:px-12 py-4 lg:py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-[1.75rem] font-extrabold text-[--text-primary] tracking-tight truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <div className="text-sm font-medium text-[--text-muted] mt-1.5 flex items-center gap-2">
                            <span className="w-1 h-3 bg-[--primary]/70 rounded-full" />
                            {subtitle}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-6">
                    {actions && (
                        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-[--border-default]">
                            {actions}
                        </div>
                    )}

                    <div className="h-8 w-px bg-[--border-subtle] hidden sm:block" />

                    <div className="relative group">
                        <CurrencySelector />
                    </div>
                </div>
            </div>
        </header>
    )
}
