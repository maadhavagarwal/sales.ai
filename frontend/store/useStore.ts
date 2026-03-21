import { create } from "zustand"

export interface AnalyticsData {
    total_revenue?: number
    average_revenue?: number
    total_profit?: number
    top_products?: Record<string, number>
    region_sales?: Record<string, number>
    average_margin?: number
    working_capital?: any
    predictive_liquidity?: any
}

export interface SimulationResult {
    scenario: string
    estimated_revenue: number
    error?: string
}

export interface AnalystReport {
    profile: {
        rows: number
        columns: string[]
        missing_values: Record<string, number>
    }
    simulations: SimulationResult[]
    insights: string[]
    report: string
}

export interface DatasetSummary {
    total_rows: number
    total_columns: number
    columns: string[]
    numeric_columns: string[]
    categorical_columns: string[]
    date_columns: string[]
    missing_values: Record<string, number>
    numeric_stats: Record<string, {
        mean: number
        median: number
        min: number
        max: number
        std: number
        sum: number
    }>
    categorical_stats: Record<string, {
        unique_count: number
        top_values: Record<string, number>
    }>
}

export interface UploadResults {
    dataset_id?: string
    rows: number
    analytics: AnalyticsData
    ml_predictions: Record<string, any>
    simulation_results: SimulationResult[]
    recommendations: string[]
    strategy: string[]
    insights: string[]
    explanations: string[]
    analyst_report: AnalystReport
    dataset_summary?: DatasetSummary
    raw_data?: Record<string, any>[]
    columns?: string[]
    numeric_columns?: string[]
    categorical_columns?: string[]
    clustering?: Record<string, { count: number; total_value: number; top_example: string }>
    anomalies?: any[]
    working_capital?: any
    predictive_liquidity?: any
    data_quality?: number
    confidence_score?: number
    summary?: Record<string, any>
    strategic_plan?: string
    available_sheets?: string[]
    dataset_type?: string
    market_intelligence?: {
        pcr: {
            pcr_oi: number
            pcr_vol: number
            sentiment: string
        }
        indicators: any[]
    }
    forecast?: {
        forecast: Array<{ date: string; predicted_revenue: number }>
        model_info: string
        r2_score: number
    }
}

// Dashboard widget configuration
export interface DashboardWidget {
    id: string
    type: "bar" | "line" | "pie" | "area" | "scatter" | "donut" | "kpi" | "table"
    title: string
    xColumn: string
    yColumn: string
    aggregation: "sum" | "mean" | "count" | "min" | "max"
    width: "half" | "full" | "third"
    color: string
}

export const CURRENCIES = [
    { code: "INR", symbol: "₹", label: "Indian Rupee (₹)" },
    { code: "USD", symbol: "$", label: "US Dollar ($)" },
    { code: "EUR", symbol: "€", label: "Euro (€)" },
    { code: "GBP", symbol: "£", label: "British Pound (£)" },
    { code: "JPY", symbol: "¥", label: "Japanese Yen (¥)" },
    { code: "AED", symbol: "د.إ", label: "UAE Dirham (د.إ)" },
    { code: "SGD", symbol: "S$", label: "Singapore Dollar (S$)" },
]

interface AppState {
    // Data state
    results: UploadResults | null
    datasetId: string | null
    isUploading: boolean
    uploadProgress: number
    fileName: string | null

    // Currency
    currencySymbol: string
    currencyCode: string

    // Dashboard state
    widgets: DashboardWidget[]
    editingWidget: string | null

    // UI state
    sidebarCollapsed: boolean
    theme: "dark" | "light"

    // Auth state
    userRole: string | null
    userEmail: string | null
    onboardingComplete: boolean

    // Actions
    setUser: (email: string | null, role: string | null) => void
    setOnboardingComplete: (complete: boolean) => void
    setResults: (results: UploadResults) => void
    setDatasetId: (id: string | null) => void
    setIsUploading: (loading: boolean) => void
    setUploadProgress: (progress: number) => void
    setFileName: (name: string | null) => void
    toggleSidebar: () => void
    setTheme: (theme: "dark" | "light") => void
    toggleTheme: () => void
    clearResults: () => void
    setCurrency: (code: string, symbol: string) => void

    // Dashboard actions
    addWidget: (widget: DashboardWidget) => void
    updateWidget: (id: string, updates: Partial<DashboardWidget>) => void
    removeWidget: (id: string) => void
    setEditingWidget: (id: string | null) => void
    setWidgets: (widgets: DashboardWidget[]) => void

    // Workspace sync – persisted so cross-page uploads trigger re-fetch
    workspaceSyncCount: number
    incrementSyncCount: () => void

    // Intelligence state
    intelligenceData: {
        anomalies: any[]
        cashFlow: any
        scenarios: any[]
        leaderboard: any[]
    } | null
    setIntelligenceData: (data: any) => void

    fetchForecast: (datasetId: string, periods?: number) => Promise<void>
}

const CHART_COLORS = [
    "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
    "#f43f5e", "#ec4899", "#14b8a6", "#a855f7", "#3b82f6",
]

// Read persisted sync count from localStorage (safe for SSR)
const _initSyncCount = (): number => {
    if (typeof window === "undefined") return 0
    return Number(localStorage.getItem("ws_sync_count") || "0")
}

export const useStore = create<AppState>((set) => ({
    results: null,
    datasetId: null,
    isUploading: false,
    uploadProgress: 0,
    fileName: null,
    currencySymbol: "₹",
    currencyCode: "INR",
    sidebarCollapsed: false,
    theme: "dark",
    widgets: [],
    editingWidget: null,
    workspaceSyncCount: _initSyncCount(),
    onboardingComplete: typeof window !== "undefined" ? localStorage.getItem("onboarding_complete") === "true" : false,
    userRole: typeof window !== "undefined" ? localStorage.getItem("user_role") : null,
    userEmail: typeof window !== "undefined" ? localStorage.getItem("user_email") : null,

    setUser: (email, role) => {
        if (typeof window !== "undefined") {
            if (email) localStorage.setItem("user_email", email)
            else localStorage.removeItem("user_email")
            if (role) localStorage.setItem("user_role", role)
            else localStorage.removeItem("user_role")
        }
        set({ userEmail: email, userRole: role })
    },

    setOnboardingComplete: (complete) => {
        if (typeof window !== "undefined") {
            localStorage.setItem("onboarding_complete", String(complete))
        }
        set({ onboardingComplete: complete })
    },

    setResults: (results) => set({ results, datasetId: results.dataset_id || null }),
    setDatasetId: (datasetId) => set({ datasetId }),
    setIsUploading: (isUploading) => set({ isUploading }),
    setUploadProgress: (uploadProgress) => set({ uploadProgress }),
    setFileName: (fileName) => set({ fileName }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setTheme: (theme) => {
        if (typeof window !== "undefined") {
            localStorage.setItem("nb-enterprise-theme", theme)
            document.documentElement.setAttribute("data-theme", theme)
        }
        set({ theme })
    },
    toggleTheme: () => set((state) => {
        const next = state.theme === "dark" ? "light" : "dark"
        if (typeof window !== "undefined") {
            localStorage.setItem("nb-enterprise-theme", next)
            document.documentElement.setAttribute("data-theme", next)
        }
        return { theme: next }
    }),
    clearResults: () => set({ results: null, datasetId: null, fileName: null, uploadProgress: 0, widgets: [] }),
    setCurrency: (code, symbol) => set({ currencyCode: code, currencySymbol: symbol }),

    addWidget: (widget) => set((state) => ({ widgets: [...state.widgets, widget] })),
    updateWidget: (id, updates) => set((state) => ({
        widgets: state.widgets.map((w) => w.id === id ? { ...w, ...updates } : w),
    })),
    removeWidget: (id) => set((state) => ({
        widgets: state.widgets.filter((w) => w.id !== id),
    })),
    setEditingWidget: (editingWidget) => set({ editingWidget }),
    setWidgets: (widgets) => set({ widgets }),

    incrementSyncCount: () => set((state) => {
        const next = state.workspaceSyncCount + 1
        if (typeof window !== "undefined") localStorage.setItem("ws_sync_count", String(next))
        return { workspaceSyncCount: next }
    }),

    intelligenceData: null,
    setIntelligenceData: (data) => set((state) => ({
        intelligenceData: state.intelligenceData ? { ...state.intelligenceData, ...data } : { 
            anomalies: [], cashFlow: null, scenarios: [], leaderboard: [], ...data 
        }
    })),

    fetchForecast: async (datasetId, periods = 12) => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/backend"
            const response = await fetch(`${apiBase}/forecast/${datasetId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ periods })
            })
            const data = await response.json()
            if (data.error) throw new Error(data.error)
            set((state) => ({
                results: state.results ? { ...state.results, forecast: data } : null
            }))
        } catch (error) {
            console.error("Forecast fetch failed:", error)
        }
    }
}))

export { CHART_COLORS }
