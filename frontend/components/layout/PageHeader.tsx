"use client"

import CurrencySelector from "@/components/ui/CurrencySelector"

interface PageHeaderProps {
    title: string
    subtitle?: string
    actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <div className="page-header">
            <div>
                <h1 className="page-title">{title}</h1>
                {subtitle && (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {subtitle}
                    </p>
                )}
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                {actions && <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>{actions}</div>}

                <div style={{ width: "1px", height: "24px", background: "var(--border-subtle)" }} />
                <CurrencySelector />
            </div>
        </div>
    )
}
