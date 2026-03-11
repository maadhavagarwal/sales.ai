import { create } from "zustand"

export interface AnalyticsData {
    total_revenue?: number
    average_revenue?: number
    total_profit?: number
    top_products?: Record<string, number>
    region_sales?: Record<string, number>
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
    // New: for editable dashboard
    dataset_summary?: DatasetSummary
    raw_data?: Record<string, any>[]
    columns?: string[]
    numeric_columns?: string[]
    categorical_columns?: string[]
    clustering?: Record<string, { count: number; total_value: number; top_example: string }>
    anomalies?: string[]
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

    // Actions
    setResults: (results: UploadResults) => void
    setIsUploading: (loading: boolean) => void
    setUploadProgress: (progress: number) => void
    setFileName: (name: string | null) => void
    toggleSidebar: () => void
    toggleTheme: () => void
    clearResults: () => void
    setCurrency: (code: string, symbol: string) => void

    // Dashboard actions
    addWidget: (widget: DashboardWidget) => void
    updateWidget: (id: string, updates: Partial<DashboardWidget>) => void
    removeWidget: (id: string) => void
    setEditingWidget: (id: string | null) => void
    setWidgets: (widgets: DashboardWidget[]) => void
    workspaceSyncCount: number
    incrementSyncCount: () => void
    fetchForecast: (datasetId: string, periods?: number) => Promise<void>
}

const CHART_COLORS = [
    "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
    "#f43f5e", "#ec4899", "#14b8a6", "#a855f7", "#3b82f6",
]

export const useStore = create<AppState>((set) => ({
    results: null,
    datasetId: null,
    isUploading: false,
    uploadProgress: 0,
    fileName: null,
    currencySymbol: "₹",
    currencyCode: "INR",
    sidebarCollapsed: false,
    theme: "dark", // Default to dark, will be updated on client
    widgets: [],
    editingWidget: null,

    setResults: (results) => set({ results, datasetId: results.dataset_id || null }),
    setIsUploading: (isUploading) => set({ isUploading }),
    setUploadProgress: (uploadProgress) => set({ uploadProgress }),
    setFileName: (fileName) => set({ fileName }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    toggleTheme: () => set((state) => {
        const next = state.theme === "dark" ? "light" : "dark"
        if (typeof window !== 'undefined') {
            localStorage.setItem('nb-enterprise-theme', next)
            document.documentElement.setAttribute('data-theme', next)
        }
        return { theme: next }
    }),
    workspaceSyncCount: 0,
    incrementSyncCount: () => set((state: any) => ({ workspaceSyncCount: (state.workspaceSyncCount || 0) + 1 })),
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
    fetchForecast: async (datasetId, periods = 12) => {
        try {
            const response = await fetch(`http://localhost:8000/forecast/${datasetId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periods })
            })
            const data = await response.json()
            if (data.error) throw new Error(data.error)
            set((state) => ({
                results: state.results ? { ...state.results, forecast: data } : null
            }))
        } catch (error) {
            console.error('Forecast fetch failed:', error)
        }
    }
}))

export { CHART_COLORS }
