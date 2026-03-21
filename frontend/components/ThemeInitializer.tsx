"use client"

import { useEffect } from "react"
import { useStore } from "@/store/useStore"

export default function ThemeInitializer() {
    const { theme, setTheme } = useStore()

    useEffect(() => {
        if (typeof window === 'undefined') return

        const savedTheme = localStorage.getItem('nb-enterprise-theme') as 'dark' | 'light' | null
        const initialTheme = savedTheme || 'dark'

        if (theme !== initialTheme) {
            setTheme(initialTheme)
        } else {
            document.documentElement.setAttribute('data-theme', theme)
        }

        document.documentElement.style.transition = 'background-color 0.4s ease, color 0.4s ease'
    }, [theme, setTheme])

    return null
}
