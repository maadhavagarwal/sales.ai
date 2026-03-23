/**
 * UNIFIED DATA SYNCHRONIZATION STORE
 * Manages all entity data across pages (HR, Expenses, Segments, CRM, Portal)
 * Any changes in one page are automatically reflected in all other pages
 */

import { create } from "zustand"

// Entity Types
export interface Employee {
    id: number | string
    name: string
    email: string
    role: string
    department?: string
    status?: string
    salary?: number
    created_at?: string
}

export interface Expense {
    id: string
    amount: number
    category: string
    date: string
    description: string
    employee_id?: string
    status: "pending" | "approved" | "rejected"
    created_at?: string
}

export interface Segment {
    id: string
    name: string
    description?: string
    rule_count: number
    customer_count: number
    value: number
    created_at?: string
}

export interface CRMDeal {
    id: string
    customer_name: string
    amount: number
    stage: string
    probability: number
    close_date?: string
    created_at?: string
}

export interface PortalUser {
    id: string
    name: string
    email: string
    role: string
    access_level: string
    last_login?: string
}

// Main Sync Store State
interface SyncStoreState {
    // Entity data
    employees: Employee[]
    expenses: Expense[]
    segments: Segment[]
    crmDeals: CRMDeal[]
    portalUsers: PortalUser[]

    // Sync metadata
    lastSyncTime: Record<string, number> // timestamp of last sync per entity
    isRefreshing: Record<string, boolean> // is currently refreshing per entity
    syncErrors: Record<string, string | null> // errors per entity

    // Global sync counter
    globalSyncVersion: number

    // Setters for each entity
    setEmployees: (employees: Employee[]) => void
    addEmployee: (employee: Employee) => void
    updateEmployee: (id: string | number, updates: Partial<Employee>) => void
    deleteEmployee: (id: string | number) => void

    setExpenses: (expenses: Expense[]) => void
    addExpense: (expense: Expense) => void
    updateExpense: (id: string, updates: Partial<Expense>) => void
    deleteExpense: (id: string) => void

    setSegments: (segments: Segment[]) => void
    addSegment: (segment: Segment) => void
    updateSegment: (id: string, updates: Partial<Segment>) => void
    deleteSegment: (id: string) => void

    setCRMDeals: (deals: CRMDeal[]) => void
    addDeal: (deal: CRMDeal) => void
    updateDeal: (id: string, updates: Partial<CRMDeal>) => void
    deleteDeal: (id: string) => void

    setPortalUsers: (users: PortalUser[]) => void
    addPortalUser: (user: PortalUser) => void
    updatePortalUser: (id: string, updates: Partial<PortalUser>) => void
    deletePortalUser: (id: string) => void

    // Sync control
    markRefreshing: (entity: string, isRefreshing: boolean) => void
    setSyncError: (entity: string, error: string | null) => void
    updateSyncTime: (entity: string) => void
    triggerGlobalSync: () => void

    // Queries
    getEmployee: (id: string | number) => Employee | undefined
    getExpense: (id: string) => Expense | undefined
    getSegment: (id: string) => Segment | undefined
    getDeal: (id: string) => CRMDeal | undefined
    getPortalUser: (id: string) => PortalUser | undefined

    // Statistics
    getEmployeeCount: () => number
    getExpenseTotal: () => number
    getSegmentCount: () => number
    getDealCount: () => number
    getTotalDealValue: () => number
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
    // Initial state
    employees: [],
    expenses: [],
    segments: [],
    crmDeals: [],
    portalUsers: [],
    lastSyncTime: {},
    isRefreshing: {},
    syncErrors: {},
    globalSyncVersion: 0,

    // ============ EMPLOYEE OPERATIONS ============
    setEmployees: (employees) =>
        set((state) => ({
            employees,
            lastSyncTime: { ...state.lastSyncTime, employees: Date.now() },
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    addEmployee: (employee) =>
        set((state) => ({
            employees: [...state.employees, employee],
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    updateEmployee: (id, updates) =>
        set((state) => ({
            employees: state.employees.map((emp) =>
                (emp.id === id ? { ...emp, ...updates } : emp)
            ),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    deleteEmployee: (id) =>
        set((state) => ({
            employees: state.employees.filter((emp) => emp.id !== id),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    // ============ EXPENSE OPERATIONS ============
    setExpenses: (expenses) =>
        set((state) => ({
            expenses,
            lastSyncTime: { ...state.lastSyncTime, expenses: Date.now() },
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    addExpense: (expense) =>
        set((state) => ({
            expenses: [...state.expenses, expense],
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    updateExpense: (id, updates) =>
        set((state) => ({
            expenses: state.expenses.map((exp) =>
                exp.id === id ? { ...exp, ...updates } : exp
            ),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    deleteExpense: (id) =>
        set((state) => ({
            expenses: state.expenses.filter((exp) => exp.id !== id),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    // ============ SEGMENT OPERATIONS ============
    setSegments: (segments) =>
        set((state) => ({
            segments,
            lastSyncTime: { ...state.lastSyncTime, segments: Date.now() },
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    addSegment: (segment) =>
        set((state) => ({
            segments: [...state.segments, segment],
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    updateSegment: (id, updates) =>
        set((state) => ({
            segments: state.segments.map((seg) =>
                seg.id === id ? { ...seg, ...updates } : seg
            ),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    deleteSegment: (id) =>
        set((state) => ({
            segments: state.segments.filter((seg) => seg.id !== id),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    // ============ CRM DEALS OPERATIONS ============
    setCRMDeals: (deals) =>
        set((state) => ({
            crmDeals: deals,
            lastSyncTime: { ...state.lastSyncTime, crmDeals: Date.now() },
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    addDeal: (deal) =>
        set((state) => ({
            crmDeals: [...state.crmDeals, deal],
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    updateDeal: (id, updates) =>
        set((state) => ({
            crmDeals: state.crmDeals.map((deal) =>
                deal.id === id ? { ...deal, ...updates } : deal
            ),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    deleteDeal: (id) =>
        set((state) => ({
            crmDeals: state.crmDeals.filter((deal) => deal.id !== id),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    // ============ PORTAL USERS OPERATIONS ============
    setPortalUsers: (users) =>
        set((state) => ({
            portalUsers: users,
            lastSyncTime: { ...state.lastSyncTime, portalUsers: Date.now() },
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    addPortalUser: (user) =>
        set((state) => ({
            portalUsers: [...state.portalUsers, user],
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    updatePortalUser: (id, updates) =>
        set((state) => ({
            portalUsers: state.portalUsers.map((user) =>
                user.id === id ? { ...user, ...updates } : user
            ),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    deletePortalUser: (id) =>
        set((state) => ({
            portalUsers: state.portalUsers.filter((user) => user.id !== id),
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    // ============ SYNC CONTROL ============
    markRefreshing: (entity, isRefreshing) =>
        set((state) => ({
            isRefreshing: { ...state.isRefreshing, [entity]: isRefreshing },
        })),

    setSyncError: (entity, error) =>
        set((state) => ({
            syncErrors: { ...state.syncErrors, [entity]: error },
        })),

    updateSyncTime: (entity) =>
        set((state) => ({
            lastSyncTime: { ...state.lastSyncTime, [entity]: Date.now() },
        })),

    triggerGlobalSync: () =>
        set((state) => ({
            globalSyncVersion: state.globalSyncVersion + 1,
        })),

    // ============ QUERY OPERATIONS ============
    getEmployee: (id) => get().employees.find((emp) => emp.id === id),
    getExpense: (id) => get().expenses.find((exp) => exp.id === id),
    getSegment: (id) => get().segments.find((seg) => seg.id === id),
    getDeal: (id) => get().crmDeals.find((deal) => deal.id === id),
    getPortalUser: (id) => get().portalUsers.find((user) => user.id === id),

    // ============ STATISTICS ============
    getEmployeeCount: () => get().employees.length,
    getExpenseTotal: () => get().expenses.reduce((sum, exp) => sum + exp.amount, 0),
    getSegmentCount: () => get().segments.length,
    getDealCount: () => get().crmDeals.length,
    getTotalDealValue: () => get().crmDeals.reduce((sum, deal) => sum + deal.amount, 0),
}))

/**
 * SYNC HOOK - Use in any page to keep data in sync
 * @example
 * const { employees, refreshEmployees } = useSyncData("employees")
 * useEffect(() => {
 *   refreshEmployees()
 * }, [])
 */
export function useSyncData(entity: keyof SyncStoreState) {
    const store = useSyncStore()

    const refresh = async (apiUrl: string) => {
        store.markRefreshing(entity, true)
        store.setSyncError(entity, null)

        try {
            const response = await fetch(apiUrl)
            if (!response.ok) throw new Error(`Failed to fetch ${entity}`)

            const data = await response.json()

            // Update store based on entity type
            switch (entity) {
                case "employees":
                    store.setEmployees(data)
                    break
                case "expenses":
                    store.setExpenses(data)
                    break
                case "segments":
                    store.setSegments(data)
                    break
                case "crmDeals":
                    store.setCRMDeals(data)
                    break
                case "portalUsers":
                    store.setPortalUsers(data)
                    break
            }

            store.updateSyncTime(entity)
        } catch (error) {
            store.setSyncError(entity, String(error))
            console.error(`Failed to sync ${entity}:`, error)
        } finally {
            store.markRefreshing(entity, false)
        }
    }

    return {
        [entity]: store[entity as keyof typeof store],
        isRefreshing: store.isRefreshing[entity] || false,
        error: store.syncErrors[entity] || null,
        lastSync: store.lastSyncTime[entity] || 0,
        refresh,
        globalSyncVersion: store.globalSyncVersion,
    }
}
