import { create } from "zustand"
import { clearAuthToken } from "@/lib/session"

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

export interface Entitlements {
    plan: string
    status: string
    features: string[]
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
    entitlements: Entitlements

    // Actions
    setUser: (email: string | null, role: string | null) => void
    setOnboardingComplete: (complete: boolean) => void
    setEntitlements: (entitlements: Partial<Entitlements>) => void
    logout: () => void
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

const _readStoredFeatures = (): string[] => {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem("subscription_features") || "[]"
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

// Read persisted sync count from localStorage (safe for SSR)
const _initSyncCount = (): number => {
    if (typeof window === "undefined") return 0
    return Number(localStorage.getItem("ws_sync_count") || "0")
}

const _initDatasetId = (): string | null => {
    if (typeof window === "undefined") return null
    const value = localStorage.getItem("dataset_id")
    return value && value.trim() ? value : null
}

const _initFileName = (): string | null => {
    if (typeof window === "undefined") return null
    const value = localStorage.getItem("dataset_file_name")
    return value && value.trim() ? value : null
}

const _initResults = (): UploadResults | null => {
    if (typeof window === "undefined") return null
    try {
        const raw = localStorage.getItem("dashboard_results")
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== "object") return null
        return parsed as UploadResults
    } catch {
        return null
    }
}

const _nextUniqueWidgetId = (baseId: string, takenIds: Set<string>): string => {
    let candidate = baseId
    let suffix = 2
    while (takenIds.has(candidate)) {
        candidate = `${baseId}-${suffix}`
        suffix += 1
    }
    return candidate
}

const _dedupeWidgetsById = (widgets: DashboardWidget[]): DashboardWidget[] => {
    const takenIds = new Set<string>()
    return widgets.map((widget) => {
        const nextId = _nextUniqueWidgetId(widget.id, takenIds)
        takenIds.add(nextId)
        return nextId === widget.id ? widget : { ...widget, id: nextId }
    })
}

export const useStore = create<AppState>((set) => ({
    results: _initResults(),
    datasetId: _initDatasetId(),
    isUploading: false,
    uploadProgress: 0,
    fileName: _initFileName(),
    currencySymbol: "₹",
    currencyCode: "INR",
    sidebarCollapsed: false,
    theme: "light",
    widgets: [],
    editingWidget: null,
    workspaceSyncCount: _initSyncCount(),
    onboardingComplete: typeof window !== "undefined" ? localStorage.getItem("onboarding_complete") === "true" : false,
    userRole: typeof window !== "undefined" ? localStorage.getItem("user_role") : null,
    userEmail: typeof window !== "undefined" ? localStorage.getItem("user_email") : null,
    entitlements: {
        plan: typeof window !== "undefined" ? (localStorage.getItem("subscription_plan") || "FREE") : "FREE",
        status: typeof window !== "undefined" ? (localStorage.getItem("subscription_status") || "ACTIVE") : "ACTIVE",
        features: _readStoredFeatures(),
    },

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

    setEntitlements: (entitlements) => {
        const next = {
            plan: String(entitlements.plan || "FREE").toUpperCase(),
            status: String(entitlements.status || "ACTIVE").toUpperCase(),
            features: Array.isArray(entitlements.features) ? entitlements.features : [],
        }
        if (typeof window !== "undefined") {
            localStorage.setItem("subscription_plan", next.plan)
            localStorage.setItem("subscription_status", next.status)
            localStorage.setItem("subscription_features", JSON.stringify(next.features))
        }
        set({ entitlements: next })
    },

    logout: () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("user_email")
            localStorage.removeItem("user_role")
            clearAuthToken()
            localStorage.removeItem("onboarding_complete")
            localStorage.removeItem("nb-enterprise-theme")
            localStorage.removeItem("subscription_plan")
            localStorage.removeItem("subscription_status")
            localStorage.removeItem("subscription_features")
            localStorage.removeItem("dataset_id")
            localStorage.removeItem("dataset_file_name")
            localStorage.removeItem("dashboard_results")
        }
        set({ 
            userEmail: null, 
            userRole: null, 
            onboardingComplete: false,
            entitlements: { plan: "FREE", status: "ACTIVE", features: [] },
            results: null,
            datasetId: null,
            fileName: null,
            uploadProgress: 0,
            widgets: []
        })
    },

    setResults: (results) => {
        const nextDatasetId = results.dataset_id || null
        if (typeof window !== "undefined") {
            if (nextDatasetId) localStorage.setItem("dataset_id", nextDatasetId)
            else localStorage.removeItem("dataset_id")
            localStorage.setItem("dashboard_results", JSON.stringify(results))
        }
        set({ results, datasetId: nextDatasetId })
    },
    setDatasetId: (datasetId) => {
        if (typeof window !== "undefined") {
            if (datasetId) localStorage.setItem("dataset_id", datasetId)
            else localStorage.removeItem("dataset_id")
        }
        set({ datasetId })
    },
    setIsUploading: (isUploading) => set({ isUploading }),
    setUploadProgress: (uploadProgress) => set({ uploadProgress }),
    setFileName: (fileName) => {
        if (typeof window !== "undefined") {
            if (fileName) localStorage.setItem("dataset_file_name", fileName)
            else localStorage.removeItem("dataset_file_name")
        }
        set({ fileName })
    },
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
    clearResults: () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("dataset_id")
            localStorage.removeItem("dataset_file_name")
            localStorage.removeItem("dashboard_results")
        }
        set({ results: null, datasetId: null, fileName: null, uploadProgress: 0, widgets: [] })
    },
    setCurrency: (code, symbol) => set({ currencyCode: code, currencySymbol: symbol }),

    addWidget: (widget) => set((state) => {
        const takenIds = new Set(state.widgets.map((w) => w.id))
        const nextId = _nextUniqueWidgetId(widget.id, takenIds)
        return {
            widgets: [...state.widgets, nextId === widget.id ? widget : { ...widget, id: nextId }],
        }
    }),
    updateWidget: (id, updates) => set((state) => {
        const updatedWidgets = state.widgets.map((w) => w.id === id ? { ...w, ...updates } : w)
        return { widgets: _dedupeWidgetsById(updatedWidgets) }
    }),
    removeWidget: (id) => set((state) => ({
        widgets: state.widgets.filter((w) => w.id !== id),
    })),
    setEditingWidget: (editingWidget) => set({ editingWidget }),
    setWidgets: (widgets) => set({ widgets: _dedupeWidgetsById(widgets) }),

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
