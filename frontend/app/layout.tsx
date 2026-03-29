import type { Metadata, Viewport } from "next"
import "./globals.css"
import ThemeInitializer from "@/components/ThemeInitializer"
import { ToastProvider } from "@/components/ui/Toast"
import NavigationGuard from "@/components/NavigationGuard"

export const metadata: Metadata = {
  title: "NeuralBI - AI Decision Intelligence Platform",
  description: "Advanced AI-powered business analytics, ML predictions, and strategic insights platform",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f7f2e8",
}

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
           <NavigationGuard>
              {children}
           </NavigationGuard>
        </ToastProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
