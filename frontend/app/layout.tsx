import "./globals.css"
import { ToastProvider } from "@/components/ui/Toast"

export const metadata = {
  title: "NeuralBI — AI Decision Intelligence Platform",
  description: "Advanced AI-powered business analytics, ML predictions, and strategic insights platform",
}

import ThemeInitializer from "@/components/ThemeInitializer"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeInitializer />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}