/**
 * USE_SYNCHRONIZED_DATA Hook
 * Auto-syncs data across all pages when any page makes changes
 * 
 * @example
 * const { employees, loading, error, refresh, create, update, delete: remove } = useSynchronizedData('employees')
 * useEffect(() => {
 *   refresh()
 * }, [])
 */

import { useEffect, useState, useCallback } from "react"
import { useSyncStore } from "./useSyncStore"
import { useStore } from "./useStore"

interface SyncOptions {
  apiBasePath?: string
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
}

export function useSynchronizedData<T>(
  entity: "employees" | "expenses" | "segments" | "crmDeals" | "portalUsers",
  options: SyncOptions = {}
) {
  const {
    apiBasePath = "/workspace",
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
  } = options

  const syncStore = useSyncStore()
  const { workspaceSyncCount, incrementSyncCount } = useStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get data from sync store
  const data = syncStore
    ? (syncStore[entity as keyof typeof syncStore] as T[])
    : []
  const isRefreshing = syncStore?.isRefreshing?.[entity] || false
  const lastSync = syncStore?.lastSyncTime?.[entity] || 0
  const globalSyncVersion = syncStore?.globalSyncVersion || 0

  // API endpoint mapping
  const getApiEndpoint = useCallback(() => {
    const endpoints: Record<string, string> = {
      employees: `${apiBasePath}/hr/employees`,
      expenses: `${apiBasePath}/expenses`,
      segments: "/api/v1/segments",
      crmDeals: `${apiBasePath}/crm/deals`,
      portalUsers: `${apiBasePath}/portal/users`,
    }
    return endpoints[entity]
  }, [entity, apiBasePath])

  // Refresh data from API
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const endpoint = getApiEndpoint()
      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error(`Failed to fetch ${entity}: ${response.statusText}`)
      }

      const fetchedData = await response.json()

      // Update sync store
      const setter = `set${entity.charAt(0).toUpperCase()}${entity.slice(1)}`
      const setterFunc = syncStore[setter as keyof typeof syncStore]
      if (typeof setterFunc === "function") {
        setterFunc(fetchedData)
      }

      syncStore.updateSyncTime(entity)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      syncStore.setSyncError(entity, errorMsg)
      console.error(`Error refreshing ${entity}:`, err)
    } finally {
      setLoading(false)
    }
  }, [entity, getApiEndpoint, syncStore])

  // Create new item
  const create = useCallback(
    async (itemData: Partial<T>) => {
      try {
        const endpoint = getApiEndpoint()
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        })

        if (!response.ok) {
          throw new Error(`Failed to create ${entity}`)
        }

        const newItem = await response.json()

        // Add to sync store
        const adderFunc = `add${entity.charAt(0).toUpperCase()}${entity.slice(1)}`
        const adder = syncStore[adderFunc as keyof typeof syncStore]
        if (typeof adder === "function") {
          adder(newItem)
        }

        // Notify other pages via increment
        incrementSyncCount()

        return newItem
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setError(errorMsg)
        throw err
      }
    },
    [entity, getApiEndpoint, syncStore, incrementSyncCount]
  )

  // Update item
  const update = useCallback(
    async (id: string | number, updates: Partial<T>) => {
      try {
        const endpoint = `${getApiEndpoint()}/${id}`
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error(`Failed to update ${entity}`)
        }

        const updatedItem = await response.json()

        // Update in sync store
        const updateFunc = `update${entity.charAt(0).toUpperCase()}${entity.slice(1)}`
        const updater = syncStore[updateFunc as keyof typeof syncStore]
        if (typeof updater === "function") {
          updater(id, updates)
        }

        // Notify other pages
        incrementSyncCount()

        return updatedItem
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setError(errorMsg)
        throw err
      }
    },
    [entity, getApiEndpoint, syncStore, incrementSyncCount]
  )

  // Delete item
  const deleteItem = useCallback(
    async (id: string | number) => {
      try {
        const endpoint = `${getApiEndpoint()}/${id}`
        const response = await fetch(endpoint, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error(`Failed to delete ${entity}`)
        }

        // Remove from sync store
        const deleteFunc = `delete${entity.charAt(0).toUpperCase()}${entity.slice(1)}`
        const deleter = syncStore[deleteFunc as keyof typeof syncStore]
        if (typeof deleter === "function") {
          deleter(id)
        }

        // Notify other pages
        incrementSyncCount()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setError(errorMsg)
        throw err
      }
    },
    [entity, getApiEndpoint, syncStore, incrementSyncCount]
  )

  // Auto-refresh on mount and when global sync version changes
  useEffect(() => {
    if (autoRefresh) {
      refresh()
    }
  }, [autoRefresh, refresh, globalSyncVersion])

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refresh])

  return {
    data,
    loading: loading || isRefreshing,
    error,
    lastSync,
    refresh,
    create,
    update,
    delete: deleteItem,
  }
}

/**
 * SYNC LISTENER HOOK - Listen for changes on specific entity across all pages
 * Triggers callback when any page updates the entity
 * 
 * @example
 * useSyncListener('employees', () => {
 *   console.log('Employees updated on another page!')
 * })
 */
export function useSyncListener(
  entity: "employees" | "expenses" | "segments" | "crmDeals" | "portalUsers",
  onSync: () => void
) {
  const { globalSyncVersion } = useSyncStore()

  useEffect(() => {
    onSync()
  }, [globalSyncVersion, onSync])
}

/**
 * WORKSPACE SYNC LISTENER - Listen for any changes across entire workspace
 */
export function useWorkspaceSyncListener(onSync: () => void) {
  const { workspaceSyncCount } = useStore()

  useEffect(() => {
    onSync()
  }, [workspaceSyncCount, onSync])
}
