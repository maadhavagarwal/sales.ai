"use client"

import { useEffect } from "react"
import { useStore } from "@/store/useStore"

export default function ThemeInitializer() {
    const { theme } = useStore()

    useEffect(() => {
        // Enforce the theme attribute on the document root for CSS variable scoping
        document.documentElement.setAttribute('data-theme', theme)

        // Premium transition effect for theme switching
        document.documentElement.style.transition = 'background-color 0.4s ease, color 0.4s ease'
    }, [theme])

    return null
}
