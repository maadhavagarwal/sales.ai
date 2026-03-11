import "./globals.css"
import { ToastProvider } from "@/components/ui/Toast"

export const metadata = {
  title: "NeuralBI — AI Decision Intelligence Platform",
  description: "Advanced AI-powered business analytics, ML predictions, and strategic insights platform",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#030712",
}

import ThemeInitializer from "@/components/ThemeInitializer"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Geist+Mono:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-[--background] text-[--text-primary] antialiased selection:bg-[--primary]/30 font-jakarta">
        <ThemeInitializer />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}