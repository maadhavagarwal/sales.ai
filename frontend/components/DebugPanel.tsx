"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface DebugPanelProps {
  results: any
  datasetId?: string
}

export default function DebugPanel({ results, datasetId }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!results) return null

  // Check what data is available
  const hasAnalytics = !!results.analytics && Object.keys(results.analytics).length > 0
  const hasInsights = Array.isArray(results.insights) && results.insights.length > 0
  const hasStrategy = Array.isArray(results.strategy) && results.strategy.length > 0
  const hasExplanations = Array.isArray(results.explanations) && results.explanations.length > 0
  const hasReport = !!results.analyst_report?.report
  const hasPlan = !!results.strategic_plan
  const hasML = !!results.ml_predictions && Object.keys(results.ml_predictions).length > 0

  const checks = [
    { label: "Analytics", available: hasAnalytics, icon: "📊" },
    { label: "Insights", available: hasInsights, icon: "💡" },
    { label: "Strategy", available: hasStrategy, icon: "🎯" },
    { label: "Explanations", available: hasExplanations, icon: "📖" },
    { label: "Report", available: hasReport, icon: "📋" },
    { label: "Strategic Plan", available: hasPlan, icon: "🗺️" },
    { label: "ML Predictions", available: hasML, icon: "🤖" },
  ]

  const allAvailable = checks.every((c) => c.available)

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition-all ${
          allAvailable
            ? "bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30"
            : "bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/30"
        }`}
        title={allAvailable ? "All systems operational" : "Some features missing"}
      >
        🔍
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-16 right-0 bg-slate-900/95 backdrop-blur border border-white/10 rounded-lg p-4 w-80 text-sm"
          >
            <h4 className="font-bold text-white mb-3">Data Availability</h4>
            <div className="space-y-2">
              {checks.map((check) => (
                <div key={check.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{check.icon}</span>
                    <span className="text-gray-300">{check.label}</span>
                  </div>
                  <span className={check.available ? "text-green-400" : "text-red-400"}>
                    {check.available ? "✓" : "✗"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-gray-400 text-xs mb-2">Dataset ID:</p>
              <p className="text-gray-300 font-mono text-xs break-all bg-black/40 p-2 rounded">
                {datasetId || "None"}
              </p>
            </div>

            <div className="mt-4 text-xs text-gray-400">
              {allAvailable ? (
                <p className="text-green-400">✓ All features are available!</p>
              ) : (
                <p className="text-yellow-400">
                  ⚠️ Some features are missing. Check backend logs if data isn't loading.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
