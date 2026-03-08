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

interface AppState {
    // Data state
    results: UploadResults | null
    datasetId: string | null
    isUploading: boolean
    uploadProgress: number
    fileName: string | null

    // Dashboard state
    widgets: DashboardWidget[]
    editingWidget: string | null

    // UI state
    sidebarCollapsed: boolean

    // Actions
    setResults: (results: UploadResults) => void
    setIsUploading: (loading: boolean) => void
    setUploadProgress: (progress: number) => void
    setFileName: (name: string | null) => void
    toggleSidebar: () => void
    clearResults: () => void

    // Dashboard actions
    addWidget: (widget: DashboardWidget) => void
    updateWidget: (id: string, updates: Partial<DashboardWidget>) => void
    removeWidget: (id: string) => void
    setEditingWidget: (id: string | null) => void
    setWidgets: (widgets: DashboardWidget[]) => void
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
    sidebarCollapsed: false,
    widgets: [],
    editingWidget: null,

    setResults: (results) => set({ results, datasetId: results.dataset_id || null }),
    setIsUploading: (isUploading) => set({ isUploading }),
    setUploadProgress: (uploadProgress) => set({ uploadProgress }),
    setFileName: (fileName) => set({ fileName }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    clearResults: () => set({ results: null, datasetId: null, fileName: null, uploadProgress: 0, widgets: [] }),

    addWidget: (widget) => set((state) => ({ widgets: [...state.widgets, widget] })),
    updateWidget: (id, updates) => set((state) => ({
        widgets: state.widgets.map((w) => w.id === id ? { ...w, ...updates } : w),
    })),
    removeWidget: (id) => set((state) => ({
        widgets: state.widgets.filter((w) => w.id !== id),
    })),
    setEditingWidget: (editingWidget) => set({ editingWidget }),
    setWidgets: (widgets) => set({ widgets })
}))

export { CHART_COLORS }
