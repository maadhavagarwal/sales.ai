"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import DataIntelligencePanel from "./analytics/DataIntelligencePanel"
import AnalystReportPanel from "./analytics/AnalystReportPanel"
import RevenueForecastChart from "./analytics/RevenueForecastChart"
import StrategicInsightsPanel from "./analytics/StrategicInsightsPanel"
import AnomalyAlertPanel from "./analytics/AnomalyAlertPanel"
import TradingIntelligencePanel from "./analytics/TradingIntelligencePanel"

interface AnalyticsDashboardProps {
  results: any
}

export default function AnalyticsDashboard({ results }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")

  if (!results) return null

  const {
    dataset_type,
    analytics,
    ml_predictions,
    insights,
    analyst_report,
    market_intelligence,
    data_quality,
    confidence_score,
    summary
  } = results

  const isMarketData = dataset_type === "market_dataset"

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "intelligence", label: isMarketData ? "Trading Pulse" : "Data Intelligence", icon: isMarketData ? "📈" : "🛡️" },
    { id: "strategy", label: "Strategic Plan", icon: "💎" },
  ]

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header / Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.25rem",
                borderRadius: "12px",
                background: activeTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent",
                border: activeTab === tab.id ? "1px solid var(--border-subtle)" : "1px solid transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-muted)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {isMarketData ? (
                  <TradingIntelligencePanel
                    marketIntelligence={market_intelligence}
                    report={analyst_report.report}
                  />
                ) : (
                  <>
                    <RevenueForecastChart data={ml_predictions.time_series_forecast} />
                    <AnomalyAlertPanel anomalies={results.anomalies} />
                  </>
                )}
              </div>
              {!isMarketData && <AnalystReportPanel report={analyst_report} />}
            </div>
          )}

          {activeTab === "intelligence" && (
            <DataIntelligencePanel
              dataQuality={data_quality}
              confidence={confidence_score}
              summary={summary}
            />
          )}

          {activeTab === "strategy" && (
            <StrategicInsightsPanel
              insights={insights}
              recommendations={results.recommendations}
              strategy={results.strategy}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
