"use client"

import { useCallback } from "react"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BarChart3, Settings, Share2, Crown, SnowflakeIcon as Crystal, AlertCircle } from "lucide-react"
import { EnhancedSpreadsheetTable } from "../components/enhanced-spreadsheet-table"
import { EnhancedDashboard } from "../components/enhanced-dashboard"
import { ExecutiveDashboard } from "../components/executive-dashboard"
import { FutureDashboard } from "../components/future-dashboard"
import { useOptimizedData } from "../hooks/useOptimizedData"
import { LoadingSpinner } from "../components/loading-spinner"
import { Footer } from "../components/footer"
import { HeroSection } from "../components/hero-section"
import { TabManager } from "../components/tab-manager"
import type { DashboardData } from "../types"
import Link from "next/link"
import { toast } from "sonner"
import { Suspense } from "react"

export default function HomePage() {
  const { tabs, loading, error, refreshData } = useOptimizedData()
  const [activeTab, setActiveTab] = useState("")
  const [showDashboard, setShowDashboard] = useState<string | null>(null)
  const [dashboardType, setDashboardType] = useState<"enhanced" | "executive" | "future">("enhanced")

  // Verificações de segurança para tabs
  const safeTabs = useMemo(() => {
    if (!Array.isArray(tabs)) {
      console.warn("⚠️ tabs is not an array:", tabs)
      return []
    }
    return tabs.filter((tab) => tab && typeof tab === "object" && tab.id)
  }, [tabs])

  // Set active tab when tabs are loaded
  useEffect(() => {
    if (!activeTab && safeTabs.length > 0) {
      setActiveTab(safeTabs[0].id)
    }
  }, [activeTab, safeTabs])

  const generateDashboardData = useCallback((tabData: any): DashboardData => {
    // Verificações de segurança
    if (!tabData || typeof tabData !== "object") {
      console.warn("⚠️ Invalid tabData:", tabData)
      return {
        tabId: "unknown",
        tabName: "Unknown Tab",
        statusCounts: {},
        totalRecords: 0,
        recentActivity: [],
        dashboardType: "rollout",
      }
    }

    const statusCounts: { [key: string]: number } = {}
    const rows = Array.isArray(tabData.rows) ? tabData.rows : []

    // CORREÇÃO: Contar corretamente os registros únicos
    const isRollout = (tabData.dashboardType || "rollout") === "rollout"
    const uniqueRows = new Map()

    rows.forEach((row: any) => {
      if (!row || typeof row !== "object") return

      let uniqueKey = ""

      if (isRollout) {
        // Para rollout: usar nome da loja como chave única
        uniqueKey = (row.loja || row.unidade || row.cliente || row.nome || row.id || "").toString().trim()
      } else {
        // Para testes: usar restaurante + merchant_id como chave única
        uniqueKey = `${(row.nome_do_restaurante || row.restaurante || "").toString().trim()}-${(row.merchant_id_totem || row.merchantId || "").toString().trim()}`
      }

      if (uniqueKey && !uniqueRows.has(uniqueKey)) {
        uniqueRows.set(uniqueKey, row)
      }
    })

    const deduplicatedRows = Array.from(uniqueRows.values())

    deduplicatedRows.forEach((row: any) => {
      if (row && typeof row === "object") {
        const status = row.status || "Sem Status"
        statusCounts[status] = (statusCounts[status] || 0) + 1
      }
    })

    return {
      tabId: tabData.id || "unknown",
      tabName: tabData.name || "Unknown Tab",
      statusCounts,
      totalRecords: deduplicatedRows.length,
      recentActivity: deduplicatedRows,
      dashboardType: tabData.dashboardType || "rollout",
    }
  }, [])

  const openDashboard = useCallback((tabId: string, type: "enhanced" | "executive" | "future" = "enhanced") => {
    if (!tabId) {
      toast.error("Nenhuma aba selecionada")
      return
    }
    setDashboardType(type)
    setShowDashboard(tabId)
  }, [])

  const closeDashboard = useCallback(() => {
    setShowDashboard(null)
  }, [])

  const shareTab = useCallback((tabId: string) => {
    if (!tabId) {
      toast.error("Nenhuma aba selecionada")
      return
    }
    const shareUrl = `${window.location.origin}/share/${tabId}`
    navigator.clipboard.writeText(shareUrl)
    toast.success("Link de compartilhamento copiado!")
  }, [])

  // Loading state
  if (loading && safeTabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Carregando dados do sistema...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && safeTabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-red-800">Erro ao Carregar Dados</h2>
          <p className="text-red-600">{error}</p>
          <Button onClick={refreshData} className="bg-red-600 hover:bg-red-700">
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  // Dashboard view
  if (showDashboard) {
    const tabData = safeTabs.find((tab) => tab.id === showDashboard)
    if (tabData) {
      const dashboardData = generateDashboardData(tabData)
      return (
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            {dashboardType === "future" ? (
              <FutureDashboard data={dashboardData} onBack={closeDashboard} />
            ) : dashboardType === "executive" ? (
              <ExecutiveDashboard data={dashboardData} onBack={closeDashboard} />
            ) : (
              <EnhancedDashboard data={dashboardData} onBack={closeDashboard} />
            )}
          </div>
          <Footer />
        </div>
      )
    } else {
      // Se a aba não foi encontrada, voltar para a view principal
      setShowDashboard(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HeroSection />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
              <span className="ml-2 text-gray-600">Carregando sistema...</span>
            </div>
          }
        >
          {safeTabs.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma aba encontrada</h3>
                <p className="text-gray-600 mb-6">
                  Crie sua primeira aba ou importe dados para começar a usar o sistema.
                </p>
                <div className="space-y-4">
                  <TabManager
                    tabs={safeTabs}
                    onUpdateTabs={refreshData}
                    activeTab={activeTab}
                    onSetActiveTab={setActiveTab}
                  />
                  <Link href="/admin">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Settings className="w-4 h-4 mr-2" />
                      Ir para Admin
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              {/* Header Simplificado */}
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Abas com scroll horizontal */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-gray-100 p-1 w-full max-w-full">
                      <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide pb-1 min-w-max">
                        {safeTabs.map((tab) => {
                          const tabType = tab.dashboardType || "rollout"
                          const isRollout = tabType === "rollout"
                          const rowCount = Array.isArray(tab.rows) ? tab.rows.length : 0

                          return (
                            <TabsTrigger
                              key={tab.id}
                              value={tab.id}
                              className="group relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all flex-shrink-0 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    tab.id === activeTab
                                      ? isRollout
                                        ? "bg-green-500"
                                        : "bg-purple-500"
                                      : "bg-gray-300"
                                  }`}
                                />
                                <span className="truncate max-w-[100px]">{tab.name || "Sem Nome"}</span>
                                {rowCount > 0 && (
                                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full bg-gray-200 text-gray-600 flex-shrink-0">
                                    {rowCount}
                                  </span>
                                )}
                              </div>
                            </TabsTrigger>
                          )
                        })}
                      </div>
                    </TabsList>
                  </div>

                  {/* Botões de Dashboard */}
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => shareTab(activeTab)}
                      disabled={!activeTab}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Compartilhar</span>
                    </Button>
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="flex-shrink-0 bg-transparent">
                        <Settings className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Admin</span>
                      </Button>
                    </Link>
                    <Button
                      onClick={() => openDashboard(activeTab, "future")}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
                      disabled={!activeTab}
                    >
                      <Crystal className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Previsões</span>
                    </Button>
                    <Button
                      onClick={() => openDashboard(activeTab, "executive")}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 flex-shrink-0"
                      disabled={!activeTab}
                    >
                      <Crown className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Executivo</span>
                    </Button>
                    <Button
                      onClick={() => openDashboard(activeTab, "enhanced")}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      disabled={!activeTab}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                  </div>
                </div>

                {/* Tab Management */}
                <div className="mt-4 pt-4 border-t">
                  <TabManager
                    tabs={safeTabs}
                    onUpdateTabs={refreshData}
                    activeTab={activeTab}
                    onSetActiveTab={setActiveTab}
                  />
                </div>
              </div>

              {/* Conteúdo das Abas - Apenas Planilha */}
              {safeTabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                  <EnhancedSpreadsheetTable tabData={tab} onRefresh={refreshData} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </Suspense>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
