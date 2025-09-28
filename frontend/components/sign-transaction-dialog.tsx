"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, PenTool, Shield, AlertTriangle } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"
import { useToast } from "@/hooks/use-toast"

interface SignTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractTitle: string
  contractSummary: string[]
  onSuccess?: (txId: string) => void
}

export function SignTransactionDialog({
  open,
  onOpenChange,
  contractTitle,
  contractSummary,
  onSuccess,
}: SignTransactionDialogProps) {
  const { wallet, signTransaction } = useWallet()
  const { toast } = useToast()
  const [signing, setSigning] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleSign = async () => {
    if (!agreed) {
      toast({
        title: "Onay Gerekli",
        description: "Devam etmek için sözleşme şartlarını kabul etmelisiniz",
        variant: "destructive",
      })
      return
    }

    setSigning(true)
    try {
      const txId = await signTransaction({
        type: "contract_signature",
        contract: contractTitle,
        timestamp: new Date().toISOString(),
      })

      toast({
        title: "Sözleşme İmzalandı",
        description: `Transaction ID: ${txId}`,
      })

      onSuccess?.(txId)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "İmzalama Hatası",
        description: "Sözleşme imzalanırken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setSigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Sözleşmeyi İmzala
          </DialogTitle>
          <DialogDescription>Sözleşme şartlarını gözden geçirin ve imzalayın</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contract Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="font-semibold mb-2">{contractTitle}</h3>
            <div className="space-y-1">
              {contractSummary.map((item, index) => (
                <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Wallet Info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">İmzalayan Cüzdan</div>
              <div className="text-sm text-muted-foreground">
                {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-8)}
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{wallet.walletType}</Badge>
          </div>

          <Separator />

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-yellow-500">Önemli Uyarı</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Bu işlem blockchain'de kalıcı bir kayıt oluşturacaktır. İmzaladıktan sonra geri alınamaz.
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox id="agreement" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
            <label htmlFor="agreement" className="text-sm leading-relaxed cursor-pointer">
              Sözleşme şartlarını okudum, anladım ve kabul ediyorum. Bu imzanın yasal olarak bağlayıcı olduğunu
              biliyorum.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={signing}>
            İptal
          </Button>
          <Button onClick={handleSign} disabled={!agreed || signing} className="bg-emerald-500 hover:bg-emerald-600">
            {signing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                İmzalanıyor...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Cüzdan ile İmzala
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
