"use client"

import { useEffect } from "react"
import { useStore } from "@/store/useStore"

export default function ThemeInitializer() {
    const { theme } = useStore()

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return

        // Get theme from localStorage or default to dark
        const savedTheme = localStorage.getItem('nb-enterprise-theme') as 'dark' | 'light' | null
        const initialTheme = savedTheme || 'dark'

        // If the theme in store doesn't match saved theme, update it
        if (theme !== initialTheme) {
            // This will trigger the effect again, but that's fine
            document.documentElement.setAttribute('data-theme', initialTheme)
            // We need to update the store, but since we're in useEffect, we can't call toggleTheme
            // Instead, we'll just set the attribute and let the component handle it
        } else {
            // Enforce the theme attribute on the document root for CSS variable scoping
            document.documentElement.setAttribute('data-theme', theme)
        }

        // Premium transition effect for theme switching
        document.documentElement.style.transition = 'background-color 0.4s ease, color 0.4s ease'
    }, [theme])

    return null
}
