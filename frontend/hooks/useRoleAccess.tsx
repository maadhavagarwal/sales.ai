import { useRouter } from "next/navigation"
import { useStore } from "@/store/useStore"
import { useEffect, useState } from "react"

/**
 * Hook to protect pages based on user role
 * @param allowedRoles - Array of roles allowed to access the page
 * @param redirectTo - Path to redirect unauthorized users (default: /dashboard)
 */
export function useRoleAccess(allowedRoles: string[], redirectTo: string = "/dashboard") {
    const router = useRouter()
    const { userRole } = useStore()
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        setIsLoading(true)

        // Check if user has required role
        if (userRole && allowedRoles.includes(userRole)) {
            setIsAuthorized(true)
            setIsLoading(false)
        } else if (userRole) {
            // User exists but doesn't have required role
            setIsAuthorized(false)
            router.push(redirectTo)
            setIsLoading(false)
        } else {
            // User not logged in
            setIsAuthorized(false)
            router.push("/login")
            setIsLoading(false)
        }
    }, [userRole, allowedRoles, router, redirectTo])

    return { isAuthorized, isLoading, userRole }
}

/**
 * Component wrapper that enforces role-based access
 */
export function RoleGate({
    allowedRoles,
    children,
    fallback = null,
}: {
    allowedRoles: string[]
    children: React.ReactNode
    fallback?: React.ReactNode
}) {
    const { userRole } = useStore()
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        if (userRole && allowedRoles.includes(userRole)) {
            setIsAuthorized(true)
        }
    }, [userRole, allowedRoles])

    if (!isAuthorized) {
        return fallback || null
    }

    return <>{children}</>
}

/**
 * Get role-based display name
 */
export const getRoleDisplayName = (role?: string | null): string => {
    const roleMap: Record<string, string> = {
        ADMIN: "Administrator",
        SALES: "Sales Manager",
        FINANCE: "Finance Manager",
        WAREHOUSE: "Warehouse Manager",
        HR: "HR Manager",
    }
    return roleMap[role || "ADMIN"] || "User"
}

/**
 * Get role-based color
 */
export const getRoleColor = (role?: string | null): string => {
    const roleColorMap: Record<string, string> = {
        ADMIN: "bg-red-500/20 text-red-200 border-red-500/30",
        SALES: "bg-blue-500/20 text-blue-200 border-blue-500/30",
        FINANCE: "bg-green-500/20 text-green-200 border-green-500/30",
        WAREHOUSE: "bg-yellow-500/20 text-yellow-200 border-yellow-500/30",
        HR: "bg-purple-500/20 text-purple-200 border-purple-500/30",
    }
    return roleColorMap[role || "ADMIN"] || ""
}

/**
 * Check if user has any of the allowed roles
 */
export const hasRole = (role: string | null, allowedRoles: string[]): boolean => {
    return role ? allowedRoles.includes(role) : false
}
