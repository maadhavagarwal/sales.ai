"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"

export default function AnalyticsDashboard({ analytics }: any) {

  if (!analytics?.region_sales) return null

  const data = Object.entries(analytics.region_sales).map(
    ([region, revenue]) => ({
      region,
      revenue
    })
  )

  return (
    <div>

      <h2 className="text-xl font-bold">Region Revenue</h2>

      <BarChart width={500} height={300} data={data}>
        <XAxis dataKey="region" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="revenue" fill="#8884d8" />
      </BarChart>

    </div>
  )
}