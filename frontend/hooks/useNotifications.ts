import { useState, useCallback } from "react"

export interface Notification {
  id: string
  title: string
  message: string
  type: "success" | "error" | "warning" | "info"
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      const id = Date.now().toString()
      const newNotification = { ...notification, id }

      setNotifications((prev) => [...prev, newNotification])

      // Auto-remove after duration
      const duration = notification.duration || 5000
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id)
        }, duration)
      }

      return id
    },
    [removeNotification]
  )

  const success = useCallback(
    (title: string, message: string, duration = 5000) => {
      return addNotification({ title, message, type: "success", duration })
    },
    [addNotification]
  )

  const error = useCallback(
    (title: string, message: string, duration = 7000) => {
      return addNotification({ title, message, type: "error", duration })
    },
    [addNotification]
  )

  const warning = useCallback(
    (title: string, message: string, duration = 6000) => {
      return addNotification({ title, message, type: "warning", duration })
    },
    [addNotification]
  )

  const info = useCallback(
    (title: string, message: string, duration = 4000) => {
      return addNotification({ title, message, type: "info", duration })
    },
    [addNotification]
  )

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  }
}
