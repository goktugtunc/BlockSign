"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { WalletGuard } from "@/components/wallet-guard"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import { useWallet } from "@/lib/wallet-context"
import { useToast } from "@/hooks/use-toast"
import { User, Mail, Building, Phone, MapPin, Calendar, FileText, PenTool, Plus } from "lucide-react"

export default function ProfilePage() {
  const { language } = useLanguage()
  const { t } = useTranslation(language)
  const { wallet } = useWallet()
  const { toast } = useToast()

  // Mock user data - in real app this would come from API/database
  const [profileData, setProfileData] = useState({
    fullName: "Ahmet Yılmaz",
    email: "ahmet@example.com",
    company: "Tech Solutions Ltd.",
    phone: "+90 555 123 4567",
    location: "İstanbul, Türkiye",
    bio: "Blockchain teknolojileri ve akıllı sözleşmeler konusunda uzman yazılım geliştirici.",
    memberSince: "2024-01-15",
    totalContracts: 24,
    contractsSigned: 18,
    contractsCreated: 6,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(profileData)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = () => {
    setProfileData(formData)
    setIsEditing(false)
    toast({
      title: t("profileUpdated"),
      description: t("profileUpdatedDesc"),
    })
  }

  const handleCancel = () => {
    setFormData(profileData)
    setIsEditing(false)
  }

  return (
    <WalletGuard>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-balance">{t("profileTitle")}</h1>
          <p className="text-muted-foreground mt-2 text-pretty">{t("profileSubtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Personal Information Card */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t("personalInfo")}
                  </CardTitle>
                  <CardDescription>{t("personalInfoDesc")}</CardDescription>
                </div>
                <Button variant={isEditing ? "outline" : "default"} size="sm" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? t("cancel") : t("edit")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("fullName")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange("fullName", e.target.value)}
                        disabled={!isEditing}
                        placeholder={t("fullNamePlaceholder")}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        disabled={!isEditing}
                        placeholder={t("emailPlaceholder")}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">{t("company")}</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        disabled={!isEditing}
                        placeholder={t("companyPlaceholder")}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("phone")}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        disabled={!isEditing}
                        placeholder={t("phonePlaceholder")}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="location">{t("location")}</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        disabled={!isEditing}
                        placeholder={t("locationPlaceholder")}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="bio">{t("bio")}</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      disabled={!isEditing}
                      placeholder={t("bioPlaceholder")}
                      rows={3}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      {t("saveChanges")}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
                      {t("cancel")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Information Sidebar */}
          <div className="space-y-6">
            {/* Account Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("accountInfo")}</CardTitle>
                <CardDescription>{t("accountInfoDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t("memberSince")}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(profileData.memberSince).toLocaleDateString(language === "tr" ? "tr-TR" : "en-US")}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t("totalContracts")}</span>
                    </div>
                    <Badge variant="secondary">{profileData.totalContracts}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PenTool className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t("contractsSigned")}</span>
                    </div>
                    <Badge variant="secondary">{profileData.contractsSigned}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t("contractsCreated")}</span>
                    </div>
                    <Badge variant="secondary">{profileData.contractsCreated}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("walletSettings")}</CardTitle>
                <CardDescription>{t("walletSettingsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{t("connectedWallet")}</p>
                  <p className="text-sm text-muted-foreground">{wallet.walletType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("walletAddress")}</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">{wallet.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("balance")}</p>
                  <p className="text-sm text-muted-foreground">{wallet.balance} ALGO</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WalletGuard>
  )
}
