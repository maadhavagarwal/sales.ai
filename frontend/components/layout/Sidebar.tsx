"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useStore } from "@/store/useStore"

const navItems = [
    {
        section: "Overview",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: "📊" },
            { href: "/analytics", label: "Analytics", icon: "📈" },
        ],
    },
    {
        section: "AI Tools",
        items: [
            { href: "/copilot", label: "AI Copilot", icon: "🤖" },
            { href: "/datasets", label: "NLBI Charts", icon: "💡" },
        ],
    },
    {
        section: "Advanced",
        items: [
            { href: "/simulations", label: "Simulations", icon: "🔬" },
        ],
    },
    {
        section: "Enterprise",
        items: [
            { href: "/workspace", label: "Workplace", icon: "🏢" },
        ],
    },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { fileName, results, theme, toggleTheme } = useStore()

    return (
        <aside className="sidebar">
            <Link href="/" style={{ textDecoration: "none" }}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">AI</div>
                    <span className="sidebar-logo-text">NeuralBI</span>
                </div>
            </Link>

            <nav className="sidebar-nav">
                {navItems.map((section) => (
                    <div key={section.section}>
                        <div className="sidebar-section-label">{section.section}</div>
                        {section.items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-link ${pathname === item.href ? "active" : ""}`}
                            >
                                <span className="nav-link-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                ))}
            </nav>

            <div
                style={{
                    padding: "1rem 1.25rem",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem"
                }}
            >
                <button
                    onClick={toggleTheme}
                    style={{
                        padding: "0.6rem 1rem",
                        borderRadius: "10px",
                        background: "var(--surface-3)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    <span style={{ fontSize: "1.1rem" }}>{theme === 'dark' ? "🌙" : "☀️"}</span>
                    <span>{theme === 'dark' ? "Dark Mode" : "Light Mode"}</span>
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                        className="pulse-dot"
                        style={{
                            background: results
                                ? "var(--accent-emerald)"
                                : "var(--text-muted)",
                        }}
                    />
                    <span
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {fileName ? fileName : "No dataset loaded"}
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                        className="pulse-dot"
                        style={{
                            background: "var(--accent-indigo)",
                        }}
                    />
                    <span
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontWeight: 600
                        }}
                    >
                        Telemetry: Live
                    </span>
                </div>
            </div>
        </aside>
    )
}
