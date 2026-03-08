"use client"

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
            {actions && <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>{actions}</div>}
        </div>
    )
}
