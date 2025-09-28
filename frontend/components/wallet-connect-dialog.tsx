"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"

interface WalletConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletConnectDialog({ open, onOpenChange }: WalletConnectDialogProps) {
  const { connectWallet } = useWallet()
  const { toast } = useToast()
  const { language } = useLanguage()
  const { t } = useTranslation(language)
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    try {
      await connectWallet()
      toast({
        title: language === "tr" ? "Cüzdan Bağlandı" : "Wallet Connected",
        description: language === "tr" ? "Lute cüzdanı başarıyla bağlandı" : "Lute wallet connected successfully",
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: language === "tr" ? "Bağlantı Hatası" : "Connection Error",
        description:
          language === "tr" ? "Cüzdan bağlanırken bir hata oluştu" : "An error occurred while connecting wallet",
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t("selectWallet")}
          </DialogTitle>
          <DialogDescription>{t("selectWalletDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 bg-transparent"
            onClick={handleConnect}
            disabled={connecting}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="text-2xl">🎵</div>
              <div className="flex-1 text-left">
                <div className="font-medium">{language === "tr" ? "Lute Cüzdanı" : "Lute Wallet"}</div>
                <div className="text-sm text-muted-foreground">
                  {language === "tr" ? "Algorand için güvenli cüzdan" : "Secure wallet for Algorand"}
                </div>
              </div>
              {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </Button>
        </div>
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            {language === "tr"
              ? "Cüzdanınız güvenli bir şekilde bağlanacak. Özel anahtarlarınız hiçbir zaman paylaşılmaz."
              : "Your wallet will be connected securely. Your private keys are never shared."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
