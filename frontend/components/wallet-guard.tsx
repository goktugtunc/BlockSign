"use client"

import type React from "react"

import { useWallet } from "@/lib/wallet-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WalletConnectDialog } from "@/components/wallet-connect-dialog"
import { Wallet, ArrowLeft } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

interface WalletGuardProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function WalletGuard({ children, title, description }: WalletGuardProps) {
  const { wallet } = useWallet()
  const { language } = useLanguage()
  const { t } = useTranslation(language)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)

  if (!wallet.isConnected) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8 text-emerald-500" />
              </div>
              <CardTitle className="text-xl">{title || t("walletRequired")}</CardTitle>
              <CardDescription className="text-center">{description || t("walletRequiredDashboard")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={() => setWalletDialogOpen(true)}>
                <Wallet className="mr-2 h-4 w-4" />
                {t("connectWallet")}
              </Button>
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("backToHome")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
      </>
    )
  }

  return <>{children}</>
}
