"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { User, Wallet, Globe, Bell, Shield, Trash2, Plus, Check, X, Settings, Moon, Sun } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState({
    displayName: "Ahmet Yılmaz",
    email: "ahmet@example.com",
  })
  const [language, setLanguage] = useState("tr")
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    contractSigned: true,
    contractReceived: true,
    reminders: false,
  })
  const [connectedWallets] = useState([
    { type: "Pera", address: "ALGO7X9K2M4P6R8T5V7W1Y3Z5A7C9E1F3H5J7L9N1P3R5T7V9X1", connected: true },
    { type: "Defly", address: "", connected: false },
    { type: "Exodus", address: "", connected: false },
  ])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleSaveProfile = () => {
    toast({
      title: "Profil Güncellendi",
      description: "Profil bilgileriniz başarıyla kaydedildi",
    })
  }

  const handleConnectWallet = (walletType: string) => {
    toast({
      title: "Cüzdan Bağlanıyor",
      description: `${walletType} cüzdanı bağlanıyor...`,
    })
  }

  const handleDisconnectWallet = (walletType: string) => {
    toast({
      title: "Cüzdan Bağlantısı Kesildi",
      description: `${walletType} cüzdanı bağlantısı kesildi`,
    })
  }

  const handleDeleteAccount = () => {
    toast({
      title: "Hesap Silindi",
      description: "Hesabınız kalıcı olarak silindi",
      variant: "destructive",
    })
    setDeleteDialogOpen(false)
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications({ ...notifications, [key]: value })
    toast({
      title: "Bildirim Ayarları Güncellendi",
      description: "Bildirim tercihleriniz kaydedildi",
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ayarlar</h1>
        <p className="text-muted-foreground">Hesap ve uygulama ayarlarınızı yönetin</p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil Bilgileri
            </CardTitle>
            <CardDescription>Genel profil bilgilerinizi düzenleyin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src="/placeholder.svg?height=64&width=64" />
                <AvatarFallback className="text-lg">AY</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Button variant="outline" size="sm">
                  Fotoğraf Değiştir
                </Button>
                <p className="text-sm text-muted-foreground mt-1">JPG, PNG veya GIF. Maksimum 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">Görünen Ad</Label>
                <Input
                  id="displayName"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile}>
              <Check className="mr-2 h-4 w-4" />
              Değişiklikleri Kaydet
            </Button>
          </CardContent>
        </Card>

        {/* Connected Wallets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Bağlı Cüzdanlar
            </CardTitle>
            <CardDescription>Algorand cüzdanlarınızı yönetin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectedWallets.map((wallet, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="font-medium">{wallet.type} Wallet</div>
                    {wallet.connected ? (
                      <div className="text-sm text-muted-foreground">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Bağlı değil</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {wallet.connected ? (
                    <>
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Bağlı</Badge>
                      <Button variant="outline" size="sm" onClick={() => handleDisconnectWallet(wallet.type)}>
                        Bağlantıyı Kes
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => handleConnectWallet(wallet.type)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Bağla
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Language & Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Dil ve Tema
            </CardTitle>
            <CardDescription>Uygulama görünümünü özelleştirin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="language">Dil</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="theme">Tema</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Açık
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Koyu
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Sistem
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Bildirim Ayarları
            </CardTitle>
            <CardDescription>Hangi bildirimleri almak istediğinizi seçin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">E-posta Bildirimleri</div>
                  <div className="text-sm text-muted-foreground">Önemli güncellemeler için e-posta alın</div>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Push Bildirimleri</div>
                  <div className="text-sm text-muted-foreground">Tarayıcı bildirimleri</div>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Sözleşme İmzalandı</div>
                  <div className="text-sm text-muted-foreground">Sözleşme imzalandığında bildirim al</div>
                </div>
                <Switch
                  checked={notifications.contractSigned}
                  onCheckedChange={(checked) => handleNotificationChange("contractSigned", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Yeni Sözleşme Talebi</div>
                  <div className="text-sm text-muted-foreground">Size sözleşme gönderildiğinde bildirim al</div>
                </div>
                <Switch
                  checked={notifications.contractReceived}
                  onCheckedChange={(checked) => handleNotificationChange("contractReceived", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Hatırlatmalar</div>
                  <div className="text-sm text-muted-foreground">Bekleyen işlemler için hatırlatma</div>
                </div>
                <Switch
                  checked={notifications.reminders}
                  onCheckedChange={(checked) => handleNotificationChange("reminders", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Güvenlik ve Gizlilik
            </CardTitle>
            <CardDescription>Hesap güvenliği ayarları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Shield className="mr-2 h-4 w-4" />
                Şifreyi Değiştir
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Shield className="mr-2 h-4 w-4" />
                İki Faktörlü Kimlik Doğrulama
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Shield className="mr-2 h-4 w-4" />
                Aktif Oturumları Görüntüle
              </Button>
            </div>

            <Separator />

            <div className="pt-4">
              <h4 className="font-medium text-destructive mb-2">Tehlikeli Bölge</h4>
              <p className="text-sm text-muted-foreground mb-4">Bu işlemler geri alınamaz. Lütfen dikkatli olun.</p>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="w-full justify-start">
                <Trash2 className="mr-2 h-4 w-4" />
                Hesabı Kalıcı Olarak Sil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Hesabı Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <X className="h-4 w-4 text-destructive" />
                <span className="font-medium text-destructive">Uyarı</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tüm sözleşmeleriniz silinecek</li>
                <li>• Blockchain kayıtları değişmeyecek</li>
                <li>• Bu işlem geri alınamaz</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hesabı Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
