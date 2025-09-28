"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Shield, Users, Zap, DollarSign, CheckCircle, ArrowRight, Github, Twitter, Mail } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

export default function HomePage() {
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  const features = [
    {
      icon: Bot,
      title: t("aiContractBuilder"),
      description: t("aiContractBuilderDesc"),
    },
    {
      icon: Shield,
      title: t("onChainAnchoring"),
      description: t("onChainAnchoringDesc"),
    },
    {
      icon: Users,
      title: t("signatureRequests"),
      description: t("signatureRequestsDesc"),
    },
  ]

  const algorandFeatures = [
    {
      icon: Zap,
      title: t("fastFinality"),
      description: t("fastFinalityDesc"),
    },
    {
      icon: DollarSign,
      title: t("lowFees"),
      description: t("lowFeesDesc"),
    },
    {
      icon: CheckCircle,
      title: t("pureProofOfStake"),
      description: t("pureProofOfStakeDesc"),
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              {t("algorandBadge")}
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-balance">
              {t("heroTitle").split("Algorand")[0]}
              <span className="text-emerald-500">Algorand</span>
              {t("heroTitle").split("Algorand")[1] || ""}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">{t("heroSubtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                <Shield className="mr-2 h-5 w-5" />
                {t("connectWallet")}
              </Button>
              <Button size="lg" variant="outline">
                <Bot className="mr-2 h-5 w-5" />
                {t("createContractWithAI")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t("powerfulFeatures")}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("featuresSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-2 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-emerald-500" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Algorand Features Strip */}
      <section className="py-16 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-2">{t("whyAlgorand")}</h3>
            <p className="text-muted-foreground">{t("algorandSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {algorandFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto text-center border-2 border-emerald-500/20">
            <CardHeader className="pb-8">
              <CardTitle className="text-3xl lg:text-4xl mb-4">{t("getStarted")}</CardTitle>
              <CardDescription className="text-lg">{t("getStartedDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                  <Shield className="mr-2 h-5 w-5" />
                  {t("connectWallet")}
                </Button>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline">
                    {t("exploreDashboard")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg">SignChain</div>
                  <div className="text-xs text-muted-foreground">Algorand-powered e-sign</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">{t("footerDescription")}</p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm">
                  <Github className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("quickLinks")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/dashboard" className="hover:text-foreground">
                    {t("dashboard")}
                  </Link>
                </li>
                <li>
                  <Link href="/create" className="hover:text-foreground">
                    {t("create")}
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="hover:text-foreground">
                    {t("settings")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("legal")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    {t("privacyPolicy")}
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    {t("termsOfService")}
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    {t("support")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 SignChain. {t("allRightsReserved")}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
