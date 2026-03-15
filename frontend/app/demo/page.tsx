"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Card, Button, Badge } from "@/components/ui"
import { useToast } from "@/components/ui/Toast"
import { useStore } from "@/store/useStore"
import { loadDemoData, enableDemoMode, isDemoMode, demoResults, demoIntelligence } from "@/services/demoData"

interface DemoStep {
  id: string
  title: string
  description: string
  icon: string
  module: string
  path: string
  features: string[]
  estimatedTime: string
}

const demoSteps: DemoStep[] = [
  {
    id: "welcome",
    title: "Welcome to NeuralBI Demo",
    description: "Experience the power of AI-driven business intelligence with our comprehensive demo",
    icon: "🎯",
    module: "Overview",
    path: "/demo",
    features: ["Interactive Dashboard", "AI-Powered Analytics", "Real-time Insights"],
    estimatedTime: "2 minutes"
  },
  {
    id: "overview",
    title: "System Overview",
    description: "Get a comprehensive view of all platform modules and their current status",
    icon: "🏠",
    module: "Overview",
    path: "/overview",
    features: ["Module Status", "System Health", "Quick Actions"],
    estimatedTime: "1 minute"
  },
  {
    id: "analytics",
    title: "AI Analytics Engine",
    description: "Explore predictive analytics, anomaly detection, and automated insights",
    icon: "📊",
    module: "Analytics",
    path: "/analytics",
    features: ["Predictive Forecasting", "Anomaly Detection", "Trend Analysis"],
    estimatedTime: "3 minutes"
  },
  {
    id: "workspace",
    title: "Business Operations Hub",
    description: "Manage invoicing, inventory, CRM, and accounting operations",
    icon: "🏢",
    module: "Workspace",
    path: "/workspace",
    features: ["Invoice Management", "Inventory Tracking", "Customer Database"],
    estimatedTime: "5 minutes"
  },
  {
    id: "datasets",
    title: "Data Management",
    description: "Upload, process, and analyze business datasets with AI assistance",
    icon: "💾",
    module: "Datasets",
    path: "/datasets",
    features: ["File Upload", "Data Processing", "AI Insights"],
    estimatedTime: "4 minutes"
  },
  {
    id: "copilot",
    title: "AI Copilot",
    description: "Ask natural language questions and get instant visualizations",
    icon: "🤖",
    module: "Copilot",
    path: "/copilot",
    features: ["Natural Language Queries", "Auto-Generated Charts", "Conversational AI"],
    estimatedTime: "3 minutes"
  },
  {
    id: "crm",
    title: "Customer Relationship Management",
    description: "Track customers, leads, and sales opportunities",
    icon: "👥",
    module: "CRM",
    path: "/crm",
    features: ["Customer Database", "Lead Tracking", "Sales Pipeline"],
    estimatedTime: "2 minutes"
  },
  {
    id: "simulations",
    title: "Financial Simulations",
    description: "Run scenario planning and predictive modeling",
    icon: "🔬",
    module: "Simulations",
    path: "/simulations",
    features: ["Scenario Planning", "Risk Analysis", "Forecast Modeling"],
    estimatedTime: "3 minutes"
  },
  {
    id: "operations",
    title: "Operations Center",
    description: "Monitor workflows, automation, and operational efficiency",
    icon: "⚙️",
    module: "Operations",
    path: "/operations",
    features: ["Workflow Monitoring", "Automation Rules", "Performance Metrics"],
    estimatedTime: "2 minutes"
  },
  {
    id: "portal",
    title: "Executive Portal",
    description: "Strategic insights and executive decision support",
    icon: "👔",
    module: "Portal",
    path: "/portal",
    features: ["Executive Reports", "Strategic Insights", "Decision Support"],
    estimatedTime: "2 minutes"
  }
]

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [demoDataLoaded, setDemoDataLoaded] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()
  const { setResults, setIntelligenceData } = useStore()

  useEffect(() => {
    // Load demo data on mount
    initializeDemoData()
  }, [])

  const initializeDemoData = async () => {
    setIsLoading(true)
    try {
      // Load demo data and enable demo mode
      await loadDemoData()
      enableDemoMode()
      
      // Populate store with demo results and intelligence
      setResults(demoResults)
      setIntelligenceData(demoIntelligence)
      
      setDemoDataLoaded(true)
      showToast("success", "Demo Data Loaded", "All modules are now populated with sample data")
    } catch (error) {
      console.error("Demo load failed:", error)
      showToast("error", "Demo Load Failed", "Unable to load demo data")
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  const startModuleDemo = (path: string) => {
    router.push(path)
  }

  const currentDemoStep = demoSteps[currentStep]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[--primary] mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Loading NeuralBI Demo</h2>
            <p className="text-[--text-secondary]">Preparing sample data and initializing modules...</p>
          </div>
          <div className="flex justify-center space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-2 h-2 bg-[--primary] rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout
      title="NeuralBI Interactive Demo"
      subtitle="Step-by-step guided tour of all platform features"
      actions={
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/overview')}
          >
            Skip to Overview
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => startModuleDemo(currentDemoStep.path)}
          >
            Start {currentDemoStep.module} Demo
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Progress Bar */}
        <div className="w-full bg-white/5 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-[--primary] to-[--accent-violet] h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Step Counter */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-[--text-secondary]">
            Step {currentStep + 1} of {demoSteps.length}
          </div>
          <div className="flex space-x-2">
            {demoSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-[--primary]'
                    : index < currentStep
                    ? 'bg-[--primary]/50'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Demo Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Step Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-8">
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-[--primary]/20 rounded-2xl flex items-center justify-center text-3xl">
                    {currentDemoStep.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white mb-4">
                      {currentDemoStep.title}
                    </h2>
                    <p className="text-xl text-[--text-secondary] mb-6 leading-relaxed">
                      {currentDemoStep.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Key Features</h4>
                        <ul className="space-y-2">
                          {currentDemoStep.features.map((feature, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-[--primary] rounded-full"></div>
                              <span className="text-[--text-secondary]">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Demo Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-[--text-secondary]">Module:</span>
                            <Badge variant="info">{currentDemoStep.module}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[--text-secondary]">Duration:</span>
                            <span className="text-white font-medium">{currentDemoStep.estimatedTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[--text-secondary]">Data Status:</span>
                            <Badge variant={demoDataLoaded ? "success" : "warning"}>
                              {demoDataLoaded ? "Loaded" : "Loading"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Interactive Demo Preview */}
              <Card className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">What You'll Experience</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="w-8 h-8 bg-[--primary]/20 rounded-lg flex items-center justify-center mb-3">
                      📊
                    </div>
                    <h4 className="text-white font-semibold mb-2">Interactive Dashboard</h4>
                    <p className="text-sm text-[--text-secondary]">Real-time metrics and visualizations with AI-powered insights</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="w-8 h-8 bg-[--primary]/20 rounded-lg flex items-center justify-center mb-3">
                      🤖
                    </div>
                    <h4 className="text-white font-semibold mb-2">AI Assistance</h4>
                    <p className="text-sm text-[--text-secondary]">Natural language queries and automated recommendations</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="w-8 h-8 bg-[--primary]/20 rounded-lg flex items-center justify-center mb-3">
                      📱
                    </div>
                    <h4 className="text-white font-semibold mb-2">Mobile Responsive</h4>
                    <p className="text-sm text-[--text-secondary]">Optimized experience across all devices and screen sizes</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="w-8 h-8 bg-[--primary]/20 rounded-lg flex items-center justify-center mb-3">
                      🔄
                    </div>
                    <h4 className="text-white font-semibold mb-2">Real-time Sync</h4>
                    <p className="text-sm text-[--text-secondary]">Live data synchronization with enterprise systems</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Navigation Sidebar */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Demo Navigation</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {demoSteps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => goToStep(index)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        index === currentStep
                          ? 'bg-[--primary]/20 border border-[--primary]/50'
                          : index < currentStep
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{step.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {step.title}
                          </div>
                          <div className="text-xs text-[--text-secondary]">
                            {step.module} • {step.estimatedTime}
                          </div>
                        </div>
                        {index < currentStep && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white">✓</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => startModuleDemo(currentDemoStep.path)}
                  disabled={!demoDataLoaded}
                >
                  🚀 Start {currentDemoStep.module} Demo
                </Button>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={nextStep}
                    disabled={currentStep === demoSteps.length - 1}
                  >
                    Next →
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push('/overview')}
                >
                  Skip Demo
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Demo Tips */}
        <Card className="p-6 bg-gradient-to-r from-[--primary]/10 to-[--accent-violet]/10 border-[--primary]/20">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-[--primary]/20 rounded-lg flex items-center justify-center">
              💡
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Demo Tips</h3>
              <ul className="text-[--text-secondary] space-y-1">
                <li>• All modules are pre-loaded with realistic sample data</li>
                <li>• Try asking the AI Copilot questions about your business data</li>
                <li>• Upload your own CSV files to see real-time processing</li>
                <li>• Explore different chart types and AI-generated insights</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}