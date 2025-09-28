"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { WalletGuard } from "@/components/wallet-guard"
import {
  FileText,
  Users,
  Clock,
  CheckCircle,
  Upload,
  Eye,
  Share,
  Copy,
  MoreHorizontal,
  PenTool,
  X,
  Bot,
  Plus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

// Mock data
const mockStats = {
  uploaded: 12,
  signed: 8,
  pendingRequests: 3,
  avgTurnaround: "2.4 gün",
}

const mockUploadedContracts = [
  {
    id: "1",
    title: "Freelance Yazılım Geliştirme Sözleşmesi",
    parties: ["ALGO...7X9K", "ALGO...2M4P"],
    status: "Completed",
    created: "2025-01-15",
    ipfsHash: "QmX...8K2",
    txId: "TX...9L3",
  },
  {
    id: "2",
    title: "NDA - Gizlilik Anlaşması",
    parties: ["ALGO...7X9K", "ALGO...5N7Q"],
    status: "Waiting",
    created: "2025-01-14",
    ipfsHash: "QmY...4M1",
    txId: "",
  },
  {
    id: "3",
    title: "Danışmanlık Hizmet Sözleşmesi",
    parties: ["ALGO...7X9K"],
    status: "Draft",
    created: "2025-01-13",
    ipfsHash: "",
    txId: "",
  },
]

const mockSignedContracts = [
  {
    id: "4",
    title: "Ortaklık Anlaşması",
    owner: "ALGO...8K3L",
    decision: "Signed",
    timestamp: "2025-01-12 14:30",
    txId: "TX...6P9",
  },
  {
    id: "5",
    title: "Tedarik Sözleşmesi",
    owner: "ALGO...2M4P",
    decision: "Declined",
    timestamp: "2025-01-10 09:15",
    txId: "",
  },
]

const mockRequests = [
  {
    id: "6",
    title: "Lisans Anlaşması",
    owner: "ALGO...9N2K",
    requestedAt: "2025-01-16 10:00",
    summary: "Yazılım lisans kullanım hakları ve kısıtlamaları",
    riskLevel: "Low",
  },
  {
    id: "7",
    title: "İş Birliği Protokolü",
    owner: "ALGO...4L8M",
    requestedAt: "2025-01-15 16:45",
    summary: "Stratejik iş birliği şartları ve sorumluluklar",
    riskLevel: "Medium",
  },
]

export default function DashboardPage() {
  const { toast } = useToast()
  const { language } = useLanguage()
  const { t } = useTranslation(language)
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [declineReason, setDeclineReason] = useState("")

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: t("copied"),
      description: `${type} ${t("copiedDesc")}`,
    })
  }

  const handleSign = (contractId: string) => {
    toast({
      title: t("signingStarted"),
      description: t("signingStartedDesc"),
    })
  }

  const handleDecline = () => {
    if (selectedRequest && declineReason.trim()) {
      toast({
        title: t("contractDeclined"),
        description: `${selectedRequest.title} ${t("contractDeclinedDesc")}`,
      })
      setDeclineDialogOpen(false)
      setDeclineReason("")
      setSelectedRequest(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{t("completed")}</Badge>
      case "Waiting":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{t("waiting")}</Badge>
      case "Draft":
        return <Badge variant="secondary">{t("draft")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "High":
        return <Badge variant="destructive">{t("highRisk")}</Badge>
      case "Medium":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{t("mediumRisk")}</Badge>
      case "Low":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{t("lowRisk")}</Badge>
      default:
        return <Badge variant="outline">{level}</Badge>
    }
  }

  return (
    <WalletGuard title={t("walletRequired")} description={t("walletRequiredDashboard")}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t("dashboardTitle")}</h1>
          <p className="text-muted-foreground">{t("dashboardSubtitle")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("uploaded")}</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.uploaded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("signed")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.signed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("pendingRequests")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.pendingRequests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("avgTurnaround")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.avgTurnaround}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="uploaded" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="uploaded">{t("uploaded")}</TabsTrigger>
            <TabsTrigger value="signed">{t("signed")}</TabsTrigger>
            <TabsTrigger value="requests">{t("signatureRequestsTitle")}</TabsTrigger>
          </TabsList>

          {/* Uploaded Contracts */}
          <TabsContent value="uploaded" className="space-y-4">
            {mockUploadedContracts.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("uploadedContracts")}</CardTitle>
                  <CardDescription>{t("uploadedContractsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("title")}</TableHead>
                        <TableHead>{t("parties")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("created")}</TableHead>
                        <TableHead>IPFS</TableHead>
                        <TableHead>TxID</TableHead>
                        <TableHead className="text-right">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockUploadedContracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.title}</TableCell>
                          <TableCell>
                            <div className="flex -space-x-2">
                              {contract.parties.map((party, index) => (
                                <Avatar key={index} className="w-6 h-6 border-2 border-background">
                                  <AvatarFallback className="text-xs">{party.slice(-4)}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(contract.status)}</TableCell>
                          <TableCell>{contract.created}</TableCell>
                          <TableCell>
                            {contract.ipfsHash ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(contract.ipfsHash, "IPFS Hash")}
                              >
                                {contract.ipfsHash}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contract.txId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(contract.txId, "Transaction ID")}
                              >
                                {contract.txId}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/contracts/${contract.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    {t("view")}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Share className="mr-2 h-4 w-4" />
                                  {t("share")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopy(contract.ipfsHash, "Hash")}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  {t("copyHash")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("noContractsUploaded")}</h3>
                  <p className="text-muted-foreground mb-4">{t("noContractsUploadedDesc")}</p>
                  <Link href="/create">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("createFirstContract")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Signed Contracts */}
          <TabsContent value="signed" className="space-y-4">
            {mockSignedContracts.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("signedContracts")}</CardTitle>
                  <CardDescription>{t("signedContractsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("title")}</TableHead>
                        <TableHead>{t("owner")}</TableHead>
                        <TableHead>{t("decision")}</TableHead>
                        <TableHead>{t("timestamp")}</TableHead>
                        <TableHead>{t("proof")}</TableHead>
                        <TableHead className="text-right">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockSignedContracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{contract.owner}</Badge>
                          </TableCell>
                          <TableCell>
                            {contract.decision === "Signed" ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                {t("signedStatus")}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">{t("declined")}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{contract.timestamp}</TableCell>
                          <TableCell>
                            {contract.txId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(contract.txId, "Transaction ID")}
                              >
                                {contract.txId}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/contracts/${contract.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <PenTool className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("noSignedContracts")}</h3>
                  <p className="text-muted-foreground">{t("noSignedContractsDesc")}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Signature Requests */}
          <TabsContent value="requests" className="space-y-4">
            {mockRequests.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("signatureRequestsTitle")}</CardTitle>
                  <CardDescription>{t("signatureRequestsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRequests.map((request) => (
                      <Card key={request.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{request.title}</h3>
                                {getRiskBadge(request.riskLevel)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {t("owner")}: <Badge variant="outline">{request.owner}</Badge>
                              </p>
                              <p className="text-sm text-muted-foreground mb-3">{request.requestedAt}</p>
                              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Bot className="h-4 w-4 text-emerald-500" />
                                  <span className="text-sm font-medium">{t("aiSummary")}</span>
                                </div>
                                <p className="text-sm">{request.summary}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/contracts/${request.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t("preview")}
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600"
                              onClick={() => handleSign(request.id)}
                            >
                              <PenTool className="mr-2 h-4 w-4" />
                              {t("sign")}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request)
                                setDeclineDialogOpen(true)
                              }}
                            >
                              <X className="mr-2 h-4 w-4" />
                              {t("decline")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("noPendingRequests")}</h3>
                  <p className="text-muted-foreground">{t("noPendingRequestsDesc")}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Decline Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("declineContract")}</DialogTitle>
              <DialogDescription>{t("declineContractDesc")}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder={t("declineReason")}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDecline}>
                {t("decline")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WalletGuard>
  )
}
