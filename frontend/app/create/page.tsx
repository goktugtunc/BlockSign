"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, FileText, Loader2, CheckCircle, AlertTriangle, Upload, Zap, Plus, X, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { WalletGuard } from "@/components/wallet-guard"
import { useWallet } from "@/lib/wallet-context"
import { generateContract } from "@/lib/gemini"
import { exportToPDF, downloadPDF } from "@/lib/pdf-utils"
import { uploadToIPFS } from "@/lib/ipfs-utils"
import { writeToAlgorand } from "@/lib/algorand-utils"

export default function CreateContractPage() {
  const { toast } = useToast()
  const { wallet } = useWallet()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContract, setGeneratedContract] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [signers, setSigners] = useState<string[]>([])
  const [newSigner, setNewSigner] = useState("")
  const [inviteMessage, setInviteMessage] = useState("")

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [ipfsCid, setIpfsCid] = useState<string>("")
  const [algorandTxId, setAlgorandTxId] = useState<string>("")
  const [stepStatuses, setStepStatuses] = useState<Record<number, "pending" | "in-progress" | "completed" | "error">>({
    0: "pending",
    1: "pending",
    2: "pending",
    3: "pending",
  })

  // Structured fields
  const [parties, setParties] = useState([{ name: "", address: "" }])
  const [country, setCountry] = useState("")
  const [currency, setCurrency] = useState("TL")
  const [deadline, setDeadline] = useState("")
  const [termination, setTermination] = useState("")

  const steps = [
    { title: "Taslak", description: "AI ile oluştur", icon: Bot },
    { title: "PDF", description: "Dışa aktar", icon: FileText },
    { title: "IPFS", description: "Yükle", icon: Upload },
    { title: "Algorand", description: "Zincire yaz", icon: Zap },
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen sözleşme açıklaması girin",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setStepStatuses((prev) => ({ ...prev, 0: "in-progress" }))

    try {
      const contract = await generateContract({
        prompt,
        parties,
        country,
        currency,
        deadline,
        termination,
      })

      setGeneratedContract(contract)
      setStepStatuses((prev) => ({ ...prev, 0: "completed" }))
      setCurrentStep(0)

      toast({
        title: "Sözleşme Oluşturuldu",
        description: "AI tarafından sözleşme başarıyla oluşturuldu",
      })
    } catch (error) {
      setStepStatuses((prev) => ({ ...prev, 0: "error" }))
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Sözleşme oluşturulurken hata oluştu",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStepAction = async (step: number) => {
    try {
      setStepStatuses((prev) => ({ ...prev, [step]: "in-progress" }))

      switch (step) {
        case 1: // Export to PDF
          if (!generatedContract) {
            throw new Error("Önce sözleşme oluşturmalısınız")
          }

          toast({
            title: "PDF Oluşturuluyor",
            description: "Sözleşme PDF formatına dönüştürülüyor...",
          })

          const pdfData = await exportToPDF(generatedContract.contract, "Sözleşme")
          setPdfBytes(pdfData)
          downloadPDF(pdfData, `sozlesme-${Date.now()}.pdf`)

          setStepStatuses((prev) => ({ ...prev, [step]: "completed" }))
          setCurrentStep(1)

          toast({
            title: "PDF Hazır",
            description: "Sözleşme PDF olarak hazırlandı ve indirildi",
          })
          break

        case 2: // Upload to IPFS
          if (!pdfBytes) {
            throw new Error("Önce PDF oluşturmalısınız")
          }

          toast({
            title: "IPFS'e Yükleniyor",
            description: "Sözleşme IPFS ağına yükleniyor...",
          })

          const cid = await uploadToIPFS(pdfBytes, `contract-${Date.now()}.pdf`)
          setIpfsCid(cid)

          setStepStatuses((prev) => ({ ...prev, [step]: "completed" }))
          setCurrentStep(2)

          toast({
            title: "IPFS'e Yüklendi",
            description: `CID: ${cid}`,
          })
          break

        case 3: // Create On-chain Record
          if (!ipfsCid) {
            throw new Error("Önce IPFS'e yükleme yapmalısınız")
          }

          if (!wallet?.address) {
            throw new Error("Cüzdan bağlantısı gerekli")
          }

          toast({
            title: "Blockchain'e Yazılıyor",
            description: "Algorand ağında kayıt oluşturuluyor...",
          })

          const txId = await writeToAlgorand(ipfsCid, wallet.address, wallet.signTransaction)
          setAlgorandTxId(txId)

          setStepStatuses((prev) => ({ ...prev, [step]: "completed" }))
          setCurrentStep(3)

          toast({
            title: "Blockchain Kaydı Oluşturuldu",
            description: `TxID: ${txId}`,
          })
          setInviteDialogOpen(true)
          break
      }
    } catch (error) {
      setStepStatuses((prev) => ({ ...prev, [step]: "error" }))
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "İşlem sırasında hata oluştu",
        variant: "destructive",
      })
    }
  }

  const addParty = () => {
    setParties([...parties, { name: "", address: "" }])
  }

  const removeParty = (index: number) => {
    setParties(parties.filter((_, i) => i !== index))
  }

  const addSigner = () => {
    if (newSigner.trim()) {
      setSigners([...signers, newSigner.trim()])
      setNewSigner("")
    }
  }

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index))
  }

  const sendInvites = () => {
    toast({
      title: "Davetler Gönderildi",
      description: `${signers.length} kişiye imza daveti gönderildi`,
    })
    setInviteDialogOpen(false)
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "High":
        return <Badge variant="destructive">Yüksek</Badge>
      case "Medium":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Orta</Badge>
      case "Low":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Mini</Badge>
      default:
        return <Badge variant="outline">{level}</Badge>
    }
  }

  const getStepIcon = (stepIndex: number) => {
    const status = stepStatuses[stepIndex]
    const StepIcon = steps[stepIndex].icon

    if (status === "completed") {
      return <CheckCircle className="h-5 w-5" />
    } else if (status === "in-progress") {
      return <Loader2 className="h-5 w-5 animate-spin" />
    } else if (status === "error") {
      return <AlertTriangle className="h-5 w-5" />
    } else {
      return <StepIcon className="h-5 w-5" />
    }
  }

  const getStepColor = (stepIndex: number) => {
    const status = stepStatuses[stepIndex]

    if (status === "completed") {
      return "bg-emerald-500 text-white"
    } else if (status === "in-progress") {
      return "bg-blue-500 text-white"
    } else if (status === "error") {
      return "bg-red-500 text-white"
    } else {
      return "bg-muted text-muted-foreground"
    }
  }

  return (
    <WalletGuard
      title="Sözleşme Oluşturma"
      description="AI ile sözleşme oluşturma özelliklerine erişmek için Algorand cüzdanınızı bağlamanız gerekiyor."
    >
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI ile Sözleşme Oluştur</h1>
          <p className="text-muted-foreground">Yapay zeka destekli sözleşme oluşturma aracı</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Prompt Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-emerald-500" />
                  Sözleşme Açıklaması
                </CardTitle>
                <CardDescription>Oluşturmak istediğiniz sözleşmeyi detaylı şekilde açıklayın</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Örnek: Freelance yazılım sözleşmesi, teslim: 30 gün, ödeme: 40% peşin, fikri haklar: müşteri..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px]"
                />
                <Button
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI Oluşturuyor...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Sözleşme Oluştur
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Structured Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Yapılandırılmış Alanlar (Opsiyonel)</CardTitle>
                <CardDescription>Daha detaylı bilgi için bu alanları doldurun</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Parties */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Taraflar</Label>
                  {parties.map((party, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        placeholder="İsim"
                        value={party.name}
                        onChange={(e) => {
                          const newParties = [...parties]
                          newParties[index].name = e.target.value
                          setParties(newParties)
                        }}
                      />
                      <Input
                        placeholder="Cüzdan Adresi"
                        value={party.address}
                        onChange={(e) => {
                          const newParties = [...parties]
                          newParties[index].address = e.target.value
                          setParties(newParties)
                        }}
                      />
                      {parties.length > 1 && (
                        <Button variant="outline" size="sm" onClick={() => removeParty(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addParty}>
                    <Plus className="mr-2 h-4 w-4" />
                    Taraf Ekle
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Ülke/Yer</Label>
                    <Input
                      id="country"
                      placeholder="Türkiye"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Para Birimi</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TL">TL</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="ALGO">ALGO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deadline">Son Tarih</Label>
                    <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="termination">Fesih Süresi (gün)</Label>
                    <Input
                      id="termination"
                      type="number"
                      placeholder="30"
                      value={termination}
                      onChange={(e) => setTermination(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {generatedContract ? (
              <>
                {/* Results Tabs */}
                <Card>
                  <CardHeader>
                    <CardTitle>Oluşturulan Sözleşme</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="contract" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="contract">Sözleşme</TabsTrigger>
                        <TabsTrigger value="summary">Özet</TabsTrigger>
                        <TabsTrigger value="risk">Risk Analizi</TabsTrigger>
                      </TabsList>
                      <TabsContent value="contract" className="mt-4">
                        <div className="bg-muted/30 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap">{generatedContract.contract}</pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="summary" className="mt-4">
                        <ul className="space-y-2">
                          {generatedContract.summary.map((item: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </TabsContent>
                      <TabsContent value="risk" className="mt-4">
                        <div className="space-y-3">
                          {generatedContract.riskAnalysis.map((risk: any, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">{getRiskBadge(risk.level)}</div>
                                <p className="text-sm text-muted-foreground">{risk.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Process Steps */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sözleşme İşleme Adımları</CardTitle>
                    <CardDescription>Sözleşmenizi blockchain'e kaydetmek için adımları takip edin</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {steps.map((step, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepColor(index)}`}
                          >
                            {getStepIcon(index)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{step.title}</h4>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                            {index === 2 && ipfsCid && <p className="text-xs text-emerald-600 mt-1">CID: {ipfsCid}</p>}
                            {index === 3 && algorandTxId && (
                              <p className="text-xs text-emerald-600 mt-1">TxID: {algorandTxId}</p>
                            )}
                          </div>
                          {stepStatuses[index] === "pending" && index > 0 && (
                            <Button size="sm" onClick={() => handleStepAction(index)}>
                              Başlat
                            </Button>
                          )}
                          {stepStatuses[index] === "error" && (
                            <Button size="sm" variant="destructive" onClick={() => handleStepAction(index)}>
                              Tekrar Dene
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Bot className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI Sözleşme Oluşturucu</h3>
                  <p className="text-muted-foreground mb-4">
                    Sözleşme açıklamanızı girin ve AI'ın sizin için profesyonel bir sözleşme oluşturmasını sağlayın
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Invite Signers Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>İmzacıları Davet Et</DialogTitle>
              <DialogDescription>Sözleşmeyi imzalaması için kişileri davet edin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Cüzdan Adresleri</Label>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="ALGO..." value={newSigner} onChange={(e) => setNewSigner(e.target.value)} />
                  <Button size="sm" onClick={addSigner}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {signers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {signers.map((signer, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {signer}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeSigner(index)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Davet Mesajı</Label>
                <Textarea
                  placeholder="Sözleşmeyi inceleyip imzalamanızı rica ederim..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={sendInvites} disabled={signers.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Davet Gönder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WalletGuard>
  )
}
