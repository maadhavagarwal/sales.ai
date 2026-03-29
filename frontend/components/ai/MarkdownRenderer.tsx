"use client"

import React from "react"

export default function MarkdownRenderer({ text }: { text: string }) {
    if (!text) return null

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {text.split("\n").map((line, i) => {
                // Headers
                if (line.startsWith("### ")) {
                    return (
                        <h3
                            key={i}
                            style={{
                                fontSize: "1.25rem",
                                fontWeight: 800,
                                marginTop: "1.5rem",
                                marginBottom: "0.5rem",
                                color: "var(--primary-400)",
                                borderBottom: "1px solid var(--border-subtle)",
                                paddingBottom: "0.5rem"
                            }}
                        >
                            {line.replace("### ", "")}
                        </h3>
                    )
                }
                if (line.startsWith("## ")) {
                    return (
                        <h2
                            key={i}
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: 900,
                                marginTop: "2rem",
                                marginBottom: "1rem",
                                color: "var(--text-primary)"
                            }}
                        >
                            {line.replace("## ", "")}
                        </h2>
                    )
                }
                if (line.startsWith("### ")) {
                    return (
                        <h3
                            key={i}
                            style={{
                                fontSize: "1.25rem",
                                fontWeight: 800,
                                marginTop: "1.5rem",
                                marginBottom: "0.5rem",
                                color: "var(--primary-400)"
                            }}
                        >
                            {line.replace("### ", "")}
                        </h3>
                    )
                }
                if (line.startsWith("# ")) {
                    return (
                        <h1
                            key={i}
                            style={{
                                fontSize: "1.75rem",
                                fontWeight: 900,
                                marginTop: "2rem",
                                marginBottom: "1.25rem",
                                color: "var(--text-primary)",
                                background: "var(--gradient-primary)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent"
                            }}
                        >
                            {line.replace("# ", "")}
                        </h1>
                    )
                }

                // Bullets
                if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                    const content = line.trim().substring(2)
                    const parts = content.split(/(\*\*.*?\*\*)/g)
                    return (
                        <div key={i} style={{ display: "flex", gap: "0.75rem", paddingLeft: "0.5rem" }}>
                            <span style={{ color: "var(--primary-500)", fontWeight: 900 }}>•</span>
                            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                {parts.map((part, index) => {
                                    if (part.startsWith("**") && part.endsWith("**")) {
                                        return <strong key={index} style={{ color: "var(--text-primary)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>
                                    }
                                    return part
                                })}
                            </p>
                        </div>
                    )
                }

                if (line.trim() === "") return <div key={i} style={{ height: "0.5rem" }} />

                // Normal Paragraph with bold support
                const parts = line.split(/(\*\*.*?\*\*)/g)
                return (
                    <p key={i} style={{ fontSize: "0.925rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                        {parts.map((part, index) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                                return <strong key={index} style={{ color: "var(--text-primary)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>
                            }
                            return part
                        })}
                    </p>
                )
            })}
        </div>
    )
}
