"use client"

import React from "react"

interface BreadcrumbProps {
  items: { label: string; href?: string }[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-slate-500">/</span>}
          {item.href ? (
            <a
              href={item.href}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-slate-300">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
