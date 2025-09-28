"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText,
  Users,
  Clock,
  PenTool,
  X,
  Download,
  Share,
  Copy,
  Bot,
  AlertTriangle,
  Shield,
  Calendar,
  Hash,
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useParams } from "next/navigation"

// Mock contract data
const mockContract = {
  id: "1",
  title: "Freelance Yazılım Geliştirme Sözleşmesi",
  owner: "ALGO...7X9K",
  parties: [
    { address: "ALGO...7X9K", name: "Ahmet Yılmaz", role: "İşveren" },
    { address: "ALGO...2M4P", name: "Mehmet Kaya", role: "Geliştirici" },
  ],
  status: "Waiting",
  created: "2025-01-15T10:30:00Z",
  ipfsHash: "QmX4K8H2N9L3P6R8T5V7W1Y3Z5A7C9E1F3H5J7L9N1P3R5T7V",
  txId: "TX9L3K5M7P1R3T5V7W9Y1A3C5E7G9I1K3M5O7Q9S1U3W5Y7A9C",
  aiSummary: {
    summary: [
      "Freelance yazılım geliştirme projesi için 3 aylık sözleşme",
      "Toplam ödeme: 50,000 TL (%40 peşin, %60 teslimde)",
      "Proje teslim tarihi: 15 Nisan 2025",
      "Fikri mülkiyet hakları müşteriye ait",
    ],
    riskFlags: [
      { level: "Medium", description: "Geç teslim durumunda ceza maddesi belirsiz" },
      { level: "Low", description: "Ödeme koşulları standart" },
    ],
    keyClauses: [
      {
        title: "Ödeme Koşulları",
        content:
          "Toplam bedelin %40'ı sözleşme imzalandıktan sonra 7 gün içinde, kalan %60'ı proje tesliminden sonra 15 gün içinde ödenecektir.",
      },
      {
        title: "Fikri Mülkiyet",
        content: "Proje kapsamında geliştirilen tüm yazılım, kod ve dokümantasyon müşterinin mülkiyetinde olacaktır.",
      },
      {
        title: "Fesih Koşulları",
        content: "Her iki taraf da 30 gün önceden yazılı bildirimde bulunarak sözleşmeyi feshedebilir.",
      },
    ],
  },
  timeline: [
    {
      date: "2025-01-15T10:30:00Z",
      action: "Sözleşme oluşturuldu",
      user: "ALGO...7X9K",
      type: "created",
    },
    {
      date: "2025-01-15T11:00:00Z",
      action: "IPFS'e yüklendi",
      user: "System",
      type: "uploaded",
    },
    {
      date: "2025-01-15T11:15:00Z",
      action: "İmza talebi gönderildi",
      user: "ALGO...7X9K",
      type: "requested",
    },
  ],
}

export default function ContractDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState("")

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Kopyalandı",
      description: `${type} panoya kopyalandı`,
    })
  }

  const handleSign = () => {
    toast({
      title: "İmzalama Başlatıldı",
      description: "Cüzdan ile imzalama işlemi başlatılıyor...",
    })
  }

  const handleDecline = () => {
    if (declineReason.trim()) {
      toast({
        title: "Sözleşme Reddedildi",
        description: "Sözleşme başarıyla reddedildi",
      })
      setDeclineDialogOpen(false)
      setDeclineReason("")
    }
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/contracts/${params.id}`
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link Kopyalandı",
      description: "Sözleşme linki panoya kopyalandı",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Tamamlandı</Badge>
      case "Waiting":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">İmza Bekleniyor</Badge>
      case "Draft":
        return <Badge variant="secondary">Taslak</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "High":
        return <Badge variant="destructive">Yüksek</Badge>
      case "Medium":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Orta</Badge>
      case "Low":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Düşük</Badge>
      default:
        return <Badge variant="outline">{level}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("tr-TR")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Contract Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contract Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sözleşme Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{mockContract.title}</h3>
                {getStatusBadge(mockContract.status)}
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Taraflar</span>
                </div>
                <div className="space-y-2">
                  {mockContract.parties.map((party, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">{party.address.slice(-4)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{party.name}</div>
                        <div className="text-xs text-muted-foreground">{party.role}</div>
                        <Badge variant="outline" className="text-xs">
                          {party.address}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Oluşturulma: {formatDate(mockContract.created)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">IPFS:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs"
                    onClick={() => handleCopy(mockContract.ipfsHash, "IPFS Hash")}
                  >
                    {mockContract.ipfsHash.slice(0, 12)}...
                    <Copy className="ml-1 h-3 w-3" />
                  </Button>
                </div>

                {mockContract.txId && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">TxID:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs"
                      onClick={() => handleCopy(mockContract.txId, "Transaction ID")}
                    >
                      {mockContract.txId.slice(0, 12)}...
                      <Copy className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-500" />
                AI Analizi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div>
                <h4 className="font-medium mb-2">Özet</h4>
                <ul className="space-y-1">
                  {mockContract.aiSummary.summary.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Risk Flags */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Analizi
                </h4>
                <div className="space-y-2">
                  {mockContract.aiSummary.riskFlags.map((risk, index) => (
                    <div key={index} className="flex items-start gap-2">
                      {getRiskBadge(risk.level)}
                      <span className="text-sm text-muted-foreground">{risk.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Key Clauses */}
              <div>
                <h4 className="font-medium mb-2">Önemli Maddeler</h4>
                <Accordion type="single" collapsible>
                  {mockContract.aiSummary.keyClauses.map((clause, index) => (
                    <AccordionItem key={index} value={`clause-${index}`}>
                      <AccordionTrigger className="text-sm">{clause.title}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{clause.content}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - PDF Viewer & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSign}>
                  <PenTool className="mr-2 h-4 w-4" />
                  İmzala
                </Button>
                <Button variant="destructive" onClick={() => setDeclineDialogOpen(true)}>
                  <X className="mr-2 h-4 w-4" />
                  Reddet
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  PDF İndir
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share className="mr-2 h-4 w-4" />
                  Paylaş
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PDF Viewer */}
          <Card>
            <CardHeader>
              <CardTitle>Sözleşme Önizleme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-8 text-center min-h-[600px] flex items-center justify-center">
                <div>
                  <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">PDF Önizleme</h3>
                  <p className="text-muted-foreground mb-4">Sözleşme PDF'i burada görüntülenecek</p>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    PDF'i İndir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Aktivite Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockContract.timeline.map((event, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{event.action}</span>
                        {event.type === "created" && <Shield className="h-3 w-3 text-emerald-500" />}
                        {event.type === "uploaded" && <FileText className="h-3 w-3 text-blue-500" />}
                        {event.type === "requested" && <Users className="h-3 w-3 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.user} • {formatDate(event.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sözleşmeyi Reddet</DialogTitle>
            <DialogDescription>Bu sözleşmeyi neden reddediyorsunuz? Sebep belirtmeniz önerilir.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reddetme sebebinizi yazın..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDecline}>
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
