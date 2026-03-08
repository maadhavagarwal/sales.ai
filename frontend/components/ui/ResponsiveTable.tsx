"use client"

import React from "react"

interface ResponsiveTableProps {
  headers: string[]
  rows: (string | number | React.ReactNode)[][]
  className?: string
}

export default function ResponsiveTable({
  headers,
  rows,
  className = "",
}: ResponsiveTableProps) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full px-4 sm:px-0">
        <table className={`data-table w-full ${className}`}>
          <thead>
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className="text-left">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
