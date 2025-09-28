import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { WalletProvider } from "@/lib/wallet-context"
import { LanguageProvider } from "@/lib/language-context"
import { Toaster } from "@/components/ui/toaster"
import { Header } from "@/components/header"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "SignChain - AI-assisted Algorand e-sign platform",
  description: "Generate, sign and verify contracts with instant finality & low fees on Algorand blockchain",
  generator: "SignChain",
  keywords: ["Algorand", "smart contracts", "e-signature", "AI", "blockchain"],
  openGraph: {
    title: "SignChain - AI-assisted Contract Signing on Algorand",
    description: "Generate, sign and verify contracts with instant finality & low fees",
    type: "website",
  },
  robots: "index, follow",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <LanguageProvider>
            <WalletProvider>
              <Suspense fallback={null}>
                <div className="min-h-screen bg-background">
                  <Header />
                  <main className="flex-1">{children}</main>
                </div>
                <Toaster />
              </Suspense>
            </WalletProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
